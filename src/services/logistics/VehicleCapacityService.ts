/**
 * VehicleCapacityService
 *
 * Tracks vehicle capacity, allocates capacity to shipments,
 * prevents over-booking, and ranks vehicles for load pool matching.
 *
 * Integrates with vehicle_capacity_blocks and vehicles tables.
 * Internal service — used by TripGenerationService and LogisticsMatchingEngine.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  VehicleCapacityBlock,
  VehicleCandidate,
  CapacityAllocation,
  LoadPool,
} from './types';
import { LogisticsEventService } from './LogisticsEventService';

export class VehicleCapacityService {
  /**
   * Query vehicles with sufficient capacity for a given weight/volume.
   * Filters by vehicle type if specified.
   */
  static async getAvailableVehicles(params: {
    min_capacity_kg: number;
    vehicle_type?: string;
    limit?: number;
  }): Promise<VehicleCandidate[]> {
    let query = supabase
      .from('vehicles')
      .select('id, transporter_id, vehicle_type, capacity_kg, registration_number, created_at')
      .gte('capacity_kg', params.min_capacity_kg)
      .order('capacity_kg', { ascending: true })
      .limit(params.limit ?? 20);

    if (params.vehicle_type) {
      query = query.eq('vehicle_type', params.vehicle_type);
    }

    const { data, error } = await query;
    if (error) throw new Error(`getAvailableVehicles failed: ${error.message}`);

    return (data ?? []).map((v: Record<string, unknown>) => ({
      vehicle_id: v.id as string,
      transporter_id: v.transporter_id as string,
      vehicle_type: (v.vehicle_type as string) ?? 'unknown',
      capacity_kg: (v.capacity_kg as number) ?? 0,
      capacity_volume_cbm: null,
      registration_number: (v.registration_number as string) ?? '',
      fit_score: 0,
    }));
  }

  /**
   * Allocate capacity on a trip's capacity block.
   * Uses an atomic conditional UPDATE via RPC to prevent concurrent overbooking.
   */
  static async allocateCapacity(
    tripId: string,
    weightKg: number,
    volumeCbm?: number
  ): Promise<CapacityAllocation> {
    const { data, error } = await supabase.rpc('allocate_vehicle_capacity_v1', {
      p_trip_id: tripId,
      p_weight_kg: weightKg,
      p_volume_cbm: volumeCbm ?? 0,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('NO_CAPACITY_BLOCK')) {
        throw new Error(`No capacity block found for trip ${tripId}`);
      }
      if (msg.includes('INSUFFICIENT_CAPACITY')) {
        throw new Error(`Insufficient capacity: requested ${weightKg}kg — ${msg}`);
      }
      throw new Error(`allocateCapacity failed: ${msg}`);
    }

    const result = data as {
      block_id: string;
      trip_id: string;
      weight_allocated_kg: number;
      volume_allocated_cbm: number;
      remaining_weight_kg: number;
      remaining_volume_cbm: number | null;
    };

    await LogisticsEventService.emit({
      event_type: 'capacity_allocated',
      entity_type: 'vehicle_capacity_block',
      entity_id: result.block_id,
      payload: { trip_id: tripId, weight_kg: weightKg, remaining_weight_kg: result.remaining_weight_kg },
    });

    return {
      trip_id: tripId,
      weight_allocated_kg: weightKg,
      volume_allocated_cbm: volumeCbm ?? null,
      remaining_weight_kg: result.remaining_weight_kg,
      remaining_volume_cbm: result.remaining_volume_cbm,
    };
  }

  /**
   * Release previously allocated capacity (for cancellations).
   * Uses an atomic UPDATE via RPC for consistency.
   */
  static async releaseCapacity(
    tripId: string,
    weightKg: number,
    volumeCbm?: number
  ): Promise<CapacityAllocation> {
    const { data, error } = await supabase.rpc('release_vehicle_capacity_v1', {
      p_trip_id: tripId,
      p_weight_kg: weightKg,
      p_volume_cbm: volumeCbm ?? 0,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('NO_CAPACITY_BLOCK')) {
        throw new Error(`No capacity block found for trip ${tripId}`);
      }
      throw new Error(`releaseCapacity failed: ${msg}`);
    }

    const result = data as {
      block_id: string;
      trip_id: string;
      weight_released_kg: number;
      volume_released_cbm: number;
      remaining_weight_kg: number;
      remaining_volume_cbm: number | null;
    };

    await LogisticsEventService.emit({
      event_type: 'capacity_released',
      entity_type: 'vehicle_capacity_block',
      entity_id: result.block_id,
      payload: { trip_id: tripId, weight_kg: weightKg, remaining_weight_kg: result.remaining_weight_kg },
    });

    return {
      trip_id: tripId,
      weight_allocated_kg: -weightKg,
      volume_allocated_cbm: volumeCbm ? -volumeCbm : null,
      remaining_weight_kg: result.remaining_weight_kg,
      remaining_volume_cbm: result.remaining_volume_cbm,
    };
  }

  /**
   * Get the current capacity block for a trip.
   */
  static async getCapacityBlock(tripId: string): Promise<VehicleCapacityBlock | null> {
    const { data, error } = await supabase
      .from('vehicle_capacity_blocks')
      .select('id, unified_trip_id, remaining_weight_kg, remaining_volume_cbm, available_from, available_until, created_at, updated_at')
      .eq('unified_trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getCapacityBlock failed: ${error.message}`);
    return data as unknown as VehicleCapacityBlock | null;
  }

  /**
   * Rank vehicles by fit for a load pool.
   * Best fit = smallest vehicle that can carry the pool's total weight.
   * Score: 1.0 = perfect fit, lower = more wasted capacity.
   */
  static async findBestVehicleForPool(
    loadPool: Pick<LoadPool, 'total_weight_kg' | 'total_volume_cbm'>
  ): Promise<VehicleCandidate[]> {
    const targetWeight = loadPool.total_weight_kg;
    if (targetWeight <= 0) return [];

    const candidates = await this.getAvailableVehicles({
      min_capacity_kg: targetWeight,
      limit: 10,
    });

    return candidates
      .map((v) => ({
        ...v,
        fit_score: targetWeight / v.capacity_kg,
      }))
      .sort((a, b) => b.fit_score - a.fit_score);
  }
}
