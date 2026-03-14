/**
 * VehicleRecommendationService
 *
 * Ranks vehicles for load pools and ranks loads for vehicles.
 * Recommendations are decision-support only — trip creation requires
 * explicit human acceptance via acceptRecommendation().
 *
 * Scoring factors (normalized 0-100, weighted):
 *   - Capacity Fit (0.30): how well vehicle capacity matches pool weight
 *   - Route Match (0.25): distance from vehicle to pool pickup point
 *   - Price (0.20): estimated trip cost (lower is better)
 *   - Reliability (0.15): transporter completion rate from trip history
 *   - Reverse Load (0.10): return-trip opportunity at destination
 *
 * Internal service — used by LogisticsMatchingEngine and admin APIs.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  VehicleRecommendation,
  VehicleRecommendationRow,
  LoadRecommendation,
  LoadPool,
  VehicleCandidate,
} from './types';
import { RECOMMENDATION_WEIGHTS } from './types';
import { VehicleCapacityService } from './VehicleCapacityService';
import { LoadPoolingService } from './LoadPoolingService';
import { TripGenerationService } from './TripGenerationService';
import { LogisticsEventService } from './LogisticsEventService';

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export class VehicleRecommendationService {

  /**
   * Rank all eligible vehicles for a dispatch-ready load pool.
   * Persists recommendations to the database and returns them sorted by score.
   */
  static async rankVehiclesForPool(poolId: string): Promise<VehicleRecommendation[]> {
    const pool = await this.loadPool(poolId);
    if (!pool || pool.total_weight_kg <= 0) return [];

    const vehicles = await VehicleCapacityService.getAvailableVehicles({
      min_capacity_kg: pool.total_weight_kg,
      limit: 20,
    });

    if (vehicles.length === 0) return [];

    const pickupGeo = await this.getPoolPickupGeo(poolId);
    const transporterReliability = await this.getTransporterReliability(
      vehicles.map(v => v.transporter_id)
    );
    const reverseCount = await this.getReverseLoadCount(pool.dest_district_id);

    const recommendations: VehicleRecommendation[] = [];

    for (const vehicle of vehicles) {
      const capacityFit = this.scoreCapacityFit(pool.total_weight_kg, vehicle.capacity_kg);
      const routeMatch = this.scoreRouteMatch(vehicle, pickupGeo);
      const priceScore = this.scorePriceEstimate(vehicle, pool.total_weight_kg);
      const reliability = transporterReliability.get(vehicle.transporter_id) ?? 50;
      const reverseLoad = clamp(reverseCount * 20, 0, 100);

      const composite =
        RECOMMENDATION_WEIGHTS.CAPACITY_FIT * capacityFit +
        RECOMMENDATION_WEIGHTS.ROUTE_MATCH * routeMatch +
        RECOMMENDATION_WEIGHTS.PRICE * priceScore +
        RECOMMENDATION_WEIGHTS.RELIABILITY * reliability +
        RECOMMENDATION_WEIGHTS.REVERSE_LOAD * reverseLoad;

      recommendations.push({
        recommendation_id: '',
        load_pool_id: poolId,
        vehicle_id: vehicle.vehicle_id,
        transporter_id: vehicle.transporter_id,
        vehicle_type: vehicle.vehicle_type,
        capacity_kg: vehicle.capacity_kg,
        capacity_volume_cbm: vehicle.capacity_volume_cbm,
        registration_number: vehicle.registration_number,
        fit_score: vehicle.fit_score,
        capacity_fit_score: Math.round(capacityFit * 100) / 100,
        route_match_score: Math.round(routeMatch * 100) / 100,
        price_score: Math.round(priceScore * 100) / 100,
        reliability_score: Math.round(reliability * 100) / 100,
        reverse_load_score: Math.round(reverseLoad * 100) / 100,
        recommendation_score: Math.round(composite * 100) / 100,
        estimated_price_inr: null,
        distance_to_pickup_km: pickupGeo
          ? Math.round(this.getVehicleDistance(vehicle, pickupGeo) * 100) / 100
          : null,
        pool_weight_kg: pool.total_weight_kg,
        vehicle_capacity_kg: vehicle.capacity_kg,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);

    const persisted = await this.persistRecommendations(poolId, recommendations);
    return persisted;
  }

  /**
   * Recommend dispatch-ready load pools for a specific vehicle.
   */
  static async recommendLoadsForVehicle(vehicleId: string): Promise<LoadRecommendation[]> {
    const { data: vehicle, error: vehErr } = await supabase
      .from('vehicles')
      .select('id, transporter_id, capacity_kg, vehicle_type')
      .eq('id', vehicleId)
      .maybeSingle();

    if (vehErr || !vehicle) return [];
    const veh = vehicle as { id: string; transporter_id: string; capacity_kg: number };

    const readyPools = await LoadPoolingService.getDispatchReadyPools();
    if (readyPools.length === 0) return [];

    const recommendations: LoadRecommendation[] = [];

    for (const pool of readyPools) {
      if (pool.total_weight_kg > veh.capacity_kg) continue;

      const capacityFit = this.scoreCapacityFit(pool.total_weight_kg, veh.capacity_kg);
      const reverseCount = await this.getReverseLoadCount(pool.dest_district_id);
      const reverseScore = clamp(reverseCount * 20, 0, 100);
      const earningsEstimate = pool.total_weight_kg * 3;
      const earningsScore = clamp(earningsEstimate / 50, 0, 100);

      const composite =
        0.35 * capacityFit +
        0.30 * earningsScore +
        0.20 * 50 + // route match placeholder
        0.15 * reverseScore;

      const firstMember = await this.getPoolFirstShipment(pool.id);

      recommendations.push({
        load_pool_id: pool.id,
        route_cluster_id: pool.route_cluster_id,
        origin_district_id: pool.origin_district_id,
        dest_district_id: pool.dest_district_id,
        total_weight_kg: pool.total_weight_kg,
        capacity_target_kg: pool.capacity_target_kg,
        member_count: pool.member_count ?? 0,
        pickup_location: firstMember?.pickup_location ?? null,
        drop_location: firstMember?.drop_location ?? null,
        capacity_fit_score: Math.round(capacityFit * 100) / 100,
        route_match_score: 50,
        earnings_score: Math.round(earningsScore * 100) / 100,
        reverse_load_score: Math.round(reverseScore * 100) / 100,
        recommendation_score: Math.round(composite * 100) / 100,
        estimated_earnings_inr: Math.round(earningsEstimate * 100) / 100,
      });
    }

    recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score);
    return recommendations;
  }

  /**
   * Accept a recommendation — triggers trip creation.
   * This is the ONLY path from recommendation to trip dispatch.
   */
  static async acceptRecommendation(recommendationId: string): Promise<{
    unified_trip_id: string;
    vehicle_id: string;
    bookings_count: number;
  }> {
    const { data: rec, error: recErr } = await supabase
      .from('vehicle_recommendations')
      .select('*')
      .eq('id', recommendationId)
      .eq('status', 'pending')
      .maybeSingle();

    if (recErr) throw new Error(`acceptRecommendation query failed: ${recErr.message}`);
    if (!rec) throw new Error('Recommendation not found or already processed');

    const row = rec as unknown as VehicleRecommendationRow;

    if (new Date(row.expires_at) < new Date()) {
      await supabase
        .from('vehicle_recommendations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', recommendationId);
      throw new Error('Recommendation has expired');
    }

    const trip = await TripGenerationService.generateTripFromPool(
      row.load_pool_id,
      row.vehicle_id
    );

    await supabase
      .from('vehicle_recommendations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        generated_trip_id: trip.unified_trip_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId);

    await supabase
      .from('vehicle_recommendations')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('load_pool_id', row.load_pool_id)
      .eq('status', 'pending')
      .neq('id', recommendationId);

    await LogisticsEventService.emit({
      event_type: 'recommendation_accepted',
      entity_type: 'vehicle_recommendation',
      entity_id: recommendationId,
      payload: {
        pool_id: row.load_pool_id,
        vehicle_id: row.vehicle_id,
        trip_id: trip.unified_trip_id,
        score: row.recommendation_score,
      },
    });

    return {
      unified_trip_id: trip.unified_trip_id,
      vehicle_id: row.vehicle_id,
      bookings_count: trip.bookings_count,
    };
  }

  /**
   * Reject a recommendation.
   */
  static async rejectRecommendation(recommendationId: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_recommendations')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', recommendationId)
      .eq('status', 'pending');

    if (error) throw new Error(`rejectRecommendation failed: ${error.message}`);

    await LogisticsEventService.emit({
      event_type: 'recommendation_rejected',
      entity_type: 'vehicle_recommendation',
      entity_id: recommendationId,
      payload: {},
    });
  }

  /**
   * List pending recommendations, optionally filtered.
   */
  static async listPendingRecommendations(params?: {
    transporter_id?: string;
    load_pool_id?: string;
    limit?: number;
  }): Promise<VehicleRecommendationRow[]> {
    let query = supabase
      .from('vehicle_recommendations')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('recommendation_score', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.transporter_id) {
      query = query.eq('transporter_id', params.transporter_id);
    }
    if (params?.load_pool_id) {
      query = query.eq('load_pool_id', params.load_pool_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listPendingRecommendations failed: ${error.message}`);
    return (data ?? []) as unknown as VehicleRecommendationRow[];
  }

  /**
   * Expire stale recommendations past their expiry window.
   */
  static async expireStaleRecommendations(): Promise<number> {
    const { data, error } = await supabase
      .from('vehicle_recommendations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) throw new Error(`expireStaleRecommendations failed: ${error.message}`);
    return (data ?? []).length;
  }

  // ── Scoring Functions ──────────────────────────────────────

  private static scoreCapacityFit(poolWeightKg: number, vehicleCapacityKg: number): number {
    if (vehicleCapacityKg <= 0 || poolWeightKg <= 0) return 0;
    const ratio = poolWeightKg / vehicleCapacityKg;
    return clamp(100 - Math.abs(1 - ratio) * 100);
  }

  private static scoreRouteMatch(
    vehicle: VehicleCandidate,
    pickupGeo: { lat: number; long: number } | null
  ): number {
    if (!pickupGeo) return 50;
    const dist = this.getVehicleDistance(vehicle, pickupGeo);
    return clamp(100 - (dist / 50) * 100);
  }

  private static scorePriceEstimate(vehicle: VehicleCandidate, _poolWeightKg: number): number {
    // Larger vehicles generally cost more per trip; normalize inversely
    const costProxy = vehicle.capacity_kg;
    return clamp(100 - (costProxy / 10000) * 50);
  }

  private static getVehicleDistance(
    _vehicle: VehicleCandidate,
    _pickupGeo: { lat: number; long: number }
  ): number {
    // Vehicle location data is not stored on the vehicles table.
    // Default to moderate distance; future phases will add real-time GPS.
    return 15;
  }

  // ── Data Fetching Helpers ──────────────────────────────────

  private static async loadPool(poolId: string): Promise<
    (LoadPool & { dest_district_id: string | null }) | null
  > {
    const { data, error } = await supabase
      .from('load_pools')
      .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at')
      .eq('id', poolId)
      .maybeSingle();

    if (error || !data) return null;
    return data as unknown as LoadPool & { dest_district_id: string | null };
  }

  private static async getPoolPickupGeo(
    poolId: string
  ): Promise<{ lat: number; long: number } | null> {
    const { data } = await supabase
      .from('load_pool_members')
      .select('shipment_request_id')
      .eq('load_pool_id', poolId)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const memberId = (data as { shipment_request_id: string }).shipment_request_id;

    const { data: shipment } = await supabase
      .from('shipment_requests')
      .select('pickup_geo_lat, pickup_geo_long')
      .eq('id', memberId)
      .maybeSingle();

    if (!shipment) return null;
    const s = shipment as { pickup_geo_lat: number | null; pickup_geo_long: number | null };
    if (s.pickup_geo_lat == null || s.pickup_geo_long == null) return null;
    return { lat: s.pickup_geo_lat, long: s.pickup_geo_long };
  }

  private static async getTransporterReliability(
    transporterIds: string[]
  ): Promise<Map<string, number>> {
    const reliability = new Map<string, number>();
    if (transporterIds.length === 0) return reliability;

    const unique = [...new Set(transporterIds)];

    const { data } = await supabase
      .from('unified_trips')
      .select('transporter_id, trip_status')
      .in('transporter_id', unique);

    if (!data || data.length === 0) {
      unique.forEach(id => reliability.set(id, 50));
      return reliability;
    }

    const grouped = new Map<string, { total: number; completed: number }>();
    for (const trip of data) {
      const t = trip as { transporter_id: string; trip_status: string };
      const entry = grouped.get(t.transporter_id) ?? { total: 0, completed: 0 };
      entry.total++;
      if (t.trip_status === 'completed' || t.trip_status === 'delivered') {
        entry.completed++;
      }
      grouped.set(t.transporter_id, entry);
    }

    for (const id of unique) {
      const entry = grouped.get(id);
      if (!entry || entry.total === 0) {
        reliability.set(id, 50);
      } else {
        reliability.set(id, clamp((entry.completed / entry.total) * 100));
      }
    }

    return reliability;
  }

  private static async getReverseLoadCount(destDistrictId: string | null): Promise<number> {
    if (!destDistrictId) return 0;

    const { count, error } = await supabase
      .from('reverse_load_candidates')
      .select('id', { count: 'exact', head: true })
      .eq('dest_district_id', destDistrictId)
      .in('status', ['identified', 'offered']);

    if (error) return 0;
    return count ?? 0;
  }

  private static async getPoolFirstShipment(
    poolId: string
  ): Promise<{ pickup_location: string | null; drop_location: string | null } | null> {
    const { data } = await supabase
      .from('load_pool_members')
      .select('shipment_request_id')
      .eq('load_pool_id', poolId)
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const memberId = (data as { shipment_request_id: string }).shipment_request_id;

    const { data: shipment } = await supabase
      .from('shipment_requests')
      .select('pickup_location, drop_location')
      .eq('id', memberId)
      .maybeSingle();

    return shipment as { pickup_location: string | null; drop_location: string | null } | null;
  }

  private static async persistRecommendations(
    poolId: string,
    recs: VehicleRecommendation[]
  ): Promise<VehicleRecommendation[]> {
    if (recs.length === 0) return [];

    const rows = recs.map(r => ({
      load_pool_id: poolId,
      vehicle_id: r.vehicle_id,
      transporter_id: r.transporter_id,
      capacity_fit_score: r.capacity_fit_score,
      route_match_score: r.route_match_score,
      price_score: r.price_score,
      reliability_score: r.reliability_score,
      reverse_load_score: r.reverse_load_score,
      recommendation_score: r.recommendation_score,
      estimated_price_inr: r.estimated_price_inr,
      distance_to_pickup_km: r.distance_to_pickup_km,
      pool_weight_kg: r.pool_weight_kg,
      vehicle_capacity_kg: r.vehicle_capacity_kg,
      status: 'pending' as const,
      expires_at: r.expires_at,
    }));

    const { data, error } = await supabase
      .from('vehicle_recommendations')
      .upsert(rows, { onConflict: 'load_pool_id,vehicle_id' })
      .select();

    if (error) throw new Error(`persistRecommendations failed: ${error.message}`);

    const persisted = (data ?? []) as unknown as VehicleRecommendationRow[];

    return recs.map((r, i) => ({
      ...r,
      recommendation_id: persisted[i]?.id ?? '',
    }));
  }
}
