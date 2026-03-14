/**
 * TripGenerationService
 *
 * Generates trips from dispatch-ready load pools.
 * Creates multi-stop trip legs, assigns vehicles, and
 * coordinates with VehicleCapacityService for allocation.
 *
 * Internal service — used by LogisticsMatchingEngine.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ShipmentRequest,
  LoadPool,
  LoadPoolMember,
  CreateUnifiedTripParams,
  CreateTripLegParams,
  VehicleCandidate,
} from './types';
import { TripManagementService } from './TripManagementService';
import { VehicleCapacityService } from './VehicleCapacityService';

interface GeneratedTrip {
  unified_trip_id: string;
  vehicle_id: string;
  legs_count: number;
  bookings_count: number;
  total_weight_kg: number;
}

interface TripGenerationCandidate {
  pool: LoadPool & { member_count: number };
  vehicles: VehicleCandidate[];
}

export class TripGenerationService {
  /**
   * Generate a unified trip from a dispatch-ready load pool.
   * Creates trip with multi-stop legs from pool member shipments.
   */
  static async generateTripFromPool(
    loadPoolId: string,
    vehicleId: string,
    driverId?: string
  ): Promise<GeneratedTrip> {
    const { data: pool, error: poolErr } = await supabase
      .from('load_pools')
      .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at')
      .eq('id', loadPoolId)
      .maybeSingle();

    if (poolErr) throw new Error(`generateTripFromPool pool query failed: ${poolErr.message}`);
    if (!pool) throw new Error('Load pool not found');

    const typedPool = pool as unknown as LoadPool;
    if (typedPool.status !== 'open' && typedPool.status !== 'filling' && typedPool.status !== 'full') {
      throw new Error(`Pool ${loadPoolId} is not eligible for trip generation (status: ${typedPool.status})`);
    }

    const { data: members, error: memErr } = await supabase
      .from('load_pool_members')
      .select('id, load_pool_id, shipment_request_id, added_at')
      .eq('load_pool_id', loadPoolId)
      .order('added_at', { ascending: true });

    if (memErr) throw new Error(`generateTripFromPool members query failed: ${memErr.message}`);
    const typedMembers = (members ?? []) as unknown as LoadPoolMember[];

    if (typedMembers.length === 0) {
      throw new Error('Load pool has no members');
    }

    const shipmentIds = typedMembers.map((m) => m.shipment_request_id);
    const { data: shipments, error: shipErr } = await supabase
      .from('shipment_requests')
      .select('id, request_source_type, source_actor_id, shipment_type, pickup_location, drop_location, pickup_geo_lat, pickup_geo_long, drop_geo_lat, drop_geo_long, origin_district_id, dest_district_id, weight_estimate_kg, volume_estimate_cbm, status, created_at, updated_at')
      .in('id', shipmentIds);

    if (shipErr) throw new Error(`generateTripFromPool shipments query failed: ${shipErr.message}`);
    const typedShipments = (shipments ?? []) as unknown as ShipmentRequest[];

    const { data: vehicle, error: vehErr } = await supabase
      .from('vehicles')
      .select('id, transporter_id, capacity_kg, vehicle_type')
      .eq('id', vehicleId)
      .maybeSingle();

    if (vehErr) throw new Error(`generateTripFromPool vehicle query failed: ${vehErr.message}`);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    const veh = vehicle as { id: string; transporter_id: string; capacity_kg: number; vehicle_type: string };

    if (typedPool.total_weight_kg > veh.capacity_kg) {
      throw new Error(
        `POOL_EXCEEDS_VEHICLE_CAPACITY: pool weight ${typedPool.total_weight_kg}kg exceeds vehicle capacity ${veh.capacity_kg}kg`
      );
    }

    const legs = this.buildTripLegs(typedShipments);

    const firstPickup = legs.find((l) => l.leg_type === 'pickup');
    const lastDrop = [...legs].reverse().find((l) => l.leg_type === 'drop');

    const tripParams: CreateUnifiedTripParams = {
      vehicle_id: vehicleId,
      driver_id: driverId,
      transporter_id: veh.transporter_id,
      trip_direction: 'forward',
      start_location: firstPickup?.location_name ?? typedShipments[0]?.pickup_location ?? null,
      end_location: lastDrop?.location_name ?? typedShipments[0]?.drop_location ?? null,
      start_geo_lat: firstPickup?.geo_lat,
      start_geo_long: firstPickup?.geo_long,
      end_geo_lat: lastDrop?.geo_lat,
      end_geo_long: lastDrop?.geo_long,
      capacity_total_kg: veh.capacity_kg,
      capacity_total_cbm: undefined,
      planned_start_at: typedPool.dispatch_window_start ?? undefined,
      planned_end_at: typedPool.dispatch_window_end ?? undefined,
      legs,
    };

    const { unified_trip_id } = await TripManagementService.createTrip(tripParams);

    let bookingsCreated = 0;
    for (const shipment of typedShipments) {
      try {
        const { data: bookResult, error: bookErr } = await supabase.rpc('book_shipment_to_trip_v1', {
          p_shipment_request_id: shipment.id,
          p_unified_trip_id: unified_trip_id,
        });
        if (!bookErr && bookResult) {
          bookingsCreated++;
        }
      } catch {
        // Non-fatal: log and continue with remaining shipments
      }
    }

    return {
      unified_trip_id,
      vehicle_id: vehicleId,
      legs_count: legs.length,
      bookings_count: bookingsCreated,
      total_weight_kg: typedPool.total_weight_kg,
    };
  }

  /**
   * Order shipments into pickup and drop legs by geographic proximity.
   * Strategy: all pickups first (sorted by lat), then all drops (sorted by lat).
   * This produces a sweep-line route that minimizes backtracking.
   */
  static buildTripLegs(shipments: ShipmentRequest[]): CreateTripLegParams[] {
    if (shipments.length === 0) return [];

    const pickups = shipments
      .filter((s) => s.pickup_location || s.pickup_geo_lat)
      .sort((a, b) => (a.pickup_geo_lat ?? 0) - (b.pickup_geo_lat ?? 0));

    const drops = shipments
      .filter((s) => s.drop_location || s.drop_geo_lat)
      .sort((a, b) => (a.drop_geo_lat ?? 0) - (b.drop_geo_lat ?? 0));

    const legs: CreateTripLegParams[] = [];
    let seq = 1;

    for (const s of pickups) {
      legs.push({
        sequence_order: seq++,
        leg_type: 'pickup',
        location_name: s.pickup_location ?? undefined,
        geo_lat: s.pickup_geo_lat ?? undefined,
        geo_long: s.pickup_geo_long ?? undefined,
        district_id: s.origin_district_id ?? undefined,
        shipment_request_id: s.id,
      });
    }

    for (const s of drops) {
      legs.push({
        sequence_order: seq++,
        leg_type: 'drop',
        location_name: s.drop_location ?? undefined,
        geo_lat: s.drop_geo_lat ?? undefined,
        geo_long: s.drop_geo_long ?? undefined,
        district_id: s.dest_district_id ?? undefined,
        shipment_request_id: s.id,
      });
    }

    return legs;
  }

  /**
   * Assign a vehicle to an existing trip and allocate capacity.
   */
  static async assignVehicleToTrip(
    tripId: string,
    vehicleId: string
  ): Promise<{ success: boolean; capacity_allocated_kg: number }> {
    const { data: vehicle, error: vehErr } = await supabase
      .from('vehicles')
      .select('id, transporter_id, capacity_kg')
      .eq('id', vehicleId)
      .maybeSingle();

    if (vehErr) throw new Error(`assignVehicleToTrip vehicle query failed: ${vehErr.message}`);
    if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

    const veh = vehicle as { id: string; transporter_id: string; capacity_kg: number };

    const { error: updateErr } = await supabase
      .from('unified_trips')
      .update({
        vehicle_id: vehicleId,
        transporter_id: veh.transporter_id,
        capacity_total_kg: veh.capacity_kg,
      })
      .eq('id', tripId);

    if (updateErr) throw new Error(`assignVehicleToTrip update failed: ${updateErr.message}`);

    return {
      success: true,
      capacity_allocated_kg: veh.capacity_kg,
    };
  }

  /**
   * List pools ready for trip generation with matched vehicles.
   */
  static async getGenerationCandidates(): Promise<TripGenerationCandidate[]> {
    const { LoadPoolingService } = await import('./LoadPoolingService');
    const readyPools = await LoadPoolingService.getDispatchReadyPools();

    const candidates: TripGenerationCandidate[] = [];

    for (const pool of readyPools) {
      const vehicles = await VehicleCapacityService.findBestVehicleForPool({
        total_weight_kg: pool.total_weight_kg,
        total_volume_cbm: pool.total_volume_cbm,
      });

      if (vehicles.length > 0) {
        candidates.push({ pool, vehicles });
      }
    }

    return candidates;
  }
}
