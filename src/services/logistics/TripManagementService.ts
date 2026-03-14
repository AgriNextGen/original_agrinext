/**
 * TripManagementService
 *
 * Responsible for creating unified trips, managing trip legs,
 * and tracking capacity usage.
 *
 * Internal service — not exposed to frontend in Phase 1.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  CreateUnifiedTripParams,
  UnifiedTrip,
  TripLeg,
  VehicleCapacityBlock,
  ShipmentBooking,
} from './types';

export class TripManagementService {
  /**
   * Create a unified trip with optional legs and capacity block.
   */
  static async createTrip(
    params: CreateUnifiedTripParams
  ): Promise<{ unified_trip_id: string }> {
    const { data, error } = await supabase.rpc('create_unified_trip_v1', {
      p_params: params as unknown as Record<string, unknown>,
    });

    if (error) throw new Error(`create_unified_trip failed: ${error.message}`);
    return data as { unified_trip_id: string };
  }

  /**
   * Get a unified trip by ID with legs, capacity blocks, and bookings.
   */
  static async getTripDetail(tripId: string): Promise<{
    trip: UnifiedTrip;
    legs: TripLeg[];
    capacity_blocks: VehicleCapacityBlock[];
    bookings: ShipmentBooking[];
  }> {
    const { data: trip, error: tripErr } = await supabase
      .from('unified_trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (tripErr) throw new Error(`getTripDetail query failed: ${tripErr.message}`);
    if (!trip) throw new Error('Unified trip not found');

    const [legsResult, capacityResult, bookingsResult] = await Promise.all([
      supabase
        .from('trip_legs')
        .select('*')
        .eq('unified_trip_id', tripId)
        .order('sequence_order', { ascending: true }),
      supabase
        .from('vehicle_capacity_blocks')
        .select('*')
        .eq('unified_trip_id', tripId),
      supabase
        .from('shipment_bookings')
        .select('*')
        .eq('unified_trip_id', tripId),
    ]);

    return {
      trip: trip as unknown as UnifiedTrip,
      legs: (legsResult.data ?? []) as unknown as TripLeg[],
      capacity_blocks: (capacityResult.data ?? []) as unknown as VehicleCapacityBlock[],
      bookings: (bookingsResult.data ?? []) as unknown as ShipmentBooking[],
    };
  }

  /**
   * List unified trips for a transporter, optionally filtered by status.
   */
  static async listTrips(params?: {
    transporter_id?: string;
    status?: string;
    direction?: string;
    limit?: number;
  }): Promise<UnifiedTrip[]> {
    let query = supabase
      .from('unified_trips')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.transporter_id) {
      query = query.eq('transporter_id', params.transporter_id);
    }
    if (params?.status) {
      query = query.eq('trip_status', params.status);
    }
    if (params?.direction) {
      query = query.eq('trip_direction', params.direction);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listTrips failed: ${error.message}`);
    return (data ?? []) as unknown as UnifiedTrip[];
  }

  /**
   * Get trip legs ordered by sequence.
   */
  static async getTripLegs(tripId: string): Promise<TripLeg[]> {
    const { data, error } = await supabase
      .from('trip_legs')
      .select('*')
      .eq('unified_trip_id', tripId)
      .order('sequence_order', { ascending: true });

    if (error) throw new Error(`getTripLegs failed: ${error.message}`);
    return (data ?? []) as unknown as TripLeg[];
  }

  /**
   * Get remaining capacity for a trip.
   */
  static async getRemainingCapacity(tripId: string): Promise<{
    remaining_weight_kg: number;
    remaining_volume_cbm: number | null;
  }> {
    const { data: trip, error } = await supabase
      .from('unified_trips')
      .select('capacity_total_kg, capacity_used_kg, capacity_total_cbm, capacity_used_cbm')
      .eq('id', tripId)
      .maybeSingle();

    if (error) throw new Error(`getRemainingCapacity failed: ${error.message}`);
    if (!trip) throw new Error('Trip not found');

    const t = trip as { capacity_total_kg: number | null; capacity_used_kg: number; capacity_total_cbm: number | null; capacity_used_cbm: number };
    return {
      remaining_weight_kg: (t.capacity_total_kg ?? 0) - (t.capacity_used_kg ?? 0),
      remaining_volume_cbm: t.capacity_total_cbm != null
        ? t.capacity_total_cbm - (t.capacity_used_cbm ?? 0)
        : null,
    };
  }
}
