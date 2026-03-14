/**
 * LogisticsMatchingEngine
 *
 * Top-level orchestrator for the logistics matching pipeline.
 * Coordinates LoadPoolingService, VehicleCapacityService, and
 * TripGenerationService to automatically:
 *
 *   1. Cluster pending shipments
 *   2. Create/fill load pools
 *   3. Evaluate pool readiness
 *   4. Find vehicles for ready pools
 *   5. Generate trips for matched pools
 *   6. Create bookings
 *   7. Emit events for observability
 *   8. Record matching run metrics
 *
 * The algorithm is heuristic-based and modular — designed to be
 * replaced with AI optimization in future phases.
 *
 * Internal service — triggered by admin API or cron.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  MatchingConfig,
  MatchingResult,
  MatchingRun,
  ShipmentCluster,
} from './types';
import { DEFAULT_MATCHING_CONFIG } from './types';
import { LoadPoolingService } from './LoadPoolingService';
import { VehicleCapacityService } from './VehicleCapacityService';
import { TripGenerationService } from './TripGenerationService';
import { LogisticsEventService } from './LogisticsEventService';
import { ReverseLogisticsService } from './ReverseLogisticsService';
import { VehicleRecommendationService } from './VehicleRecommendationService';

export class LogisticsMatchingEngine {
  /**
   * Run a full matching cycle.
   * This is the primary entry point for automated orchestration.
   */
  static async runMatchingCycle(
    config?: Partial<MatchingConfig>
  ): Promise<MatchingResult> {
    const startTime = Date.now();
    const mergedConfig = { ...DEFAULT_MATCHING_CONFIG, ...config };
    const errors: string[] = [];

    const runId = await this.startMatchingRun();

    await LogisticsEventService.emit({
      event_type: 'matching_run_started',
      entity_type: 'matching_run',
      entity_id: runId,
      payload: { config: mergedConfig },
    });

    let shipmentsProcessed = 0;
    let poolsCreated = 0;
    let poolsFilled = 0;
    let tripsGenerated = 0;
    let bookingsCreated = 0;
    let recommendationsGenerated = 0;

    try {
      // Step 1: Cluster pending shipments by route
      const clusters = await LoadPoolingService.clusterPendingShipments();
      shipmentsProcessed = clusters.reduce((sum, c) => sum + c.shipments.length, 0);

      // Step 2: Create or fill load pools for each cluster
      for (const cluster of clusters) {
        try {
          const poolResult = await this.processCluster(cluster, mergedConfig);
          poolsCreated += poolResult.pools_created;
          poolsFilled += poolResult.pools_filled;
        } catch (err) {
          errors.push(`Cluster ${cluster.route_cluster_id}: ${String(err)}`);
        }
      }

      // Step 3: Generate vehicle recommendations for dispatch-ready pools.
      // Recommendations are surfaced to dispatchers — trips are NOT auto-created.
      const readyPools = await LoadPoolingService.getDispatchReadyPools();

      for (const pool of readyPools) {
        try {
          const recs = await VehicleRecommendationService.rankVehiclesForPool(pool.id);
          recommendationsGenerated += recs.length;

          if (recs.length === 0) {
            errors.push(`Pool ${pool.id}: no vehicle available for ${pool.total_weight_kg}kg`);
          } else {
            await LogisticsEventService.emit({
              event_type: 'recommendation_generated',
              entity_type: 'load_pool',
              entity_id: pool.id,
              payload: {
                pool_id: pool.id,
                recommendations_count: recs.length,
                top_score: recs[0]?.recommendation_score ?? 0,
                top_vehicle_id: recs[0]?.vehicle_id ?? null,
                total_weight_kg: pool.total_weight_kg,
              },
            });
          }
        } catch (err) {
          errors.push(`Pool ${pool.id} recommendation: ${String(err)}`);
        }
      }

      // Step 4: Expire stale recommendations from previous runs
      try {
        await VehicleRecommendationService.expireStaleRecommendations();
      } catch (err) {
        errors.push(`Expire recommendations: ${String(err)}`);
      }

      // Step 5: Scan for reverse logistics opportunities on eligible trips
      try {
        const reverseResult = await ReverseLogisticsService.scanAndMatch();
        if (reverseResult.errors.length > 0) {
          errors.push(...reverseResult.errors.map((e) => `Reverse: ${e}`));
        }
      } catch (err) {
        errors.push(`Reverse scan: ${String(err)}`);
      }

      // Step 6: Complete the matching run
      await this.completeMatchingRun(runId, {
        shipments_processed: shipmentsProcessed,
        pools_created: poolsCreated,
        trips_generated: tripsGenerated,
        bookings_created: bookingsCreated,
        recommendations_generated: recommendationsGenerated,
      });
    } catch (err) {
      errors.push(`Fatal: ${String(err)}`);
      await this.failMatchingRun(runId, String(err));
    }

    const result: MatchingResult = {
      run_id: runId,
      shipments_processed: shipmentsProcessed,
      pools_created: poolsCreated,
      pools_filled: poolsFilled,
      trips_generated: tripsGenerated,
      bookings_created: bookingsCreated,
      errors,
      duration_ms: Date.now() - startTime,
    };

    await LogisticsEventService.emit({
      event_type: 'matching_run_completed',
      entity_type: 'matching_run',
      entity_id: runId,
      payload: result as unknown as Record<string, unknown>,
    });

    return result;
  }

  /**
   * Attempt to match a single new shipment immediately.
   * Tries to add it to an existing open pool on the same route,
   * or creates a new pool if none exists.
   */
  static async matchSingleShipment(
    shipmentId: string
  ): Promise<{ pooled: boolean; pool_id: string | null }> {
    const { data: shipment, error } = await supabase
      .from('shipment_requests')
      .select('id, route_cluster_id, weight_estimate_kg, volume_estimate_cbm, status')
      .eq('id', shipmentId)
      .maybeSingle();

    if (error) throw new Error(`matchSingleShipment query failed: ${error.message}`);
    if (!shipment) throw new Error('Shipment not found');

    const s = shipment as { id: string; route_cluster_id: string | null; weight_estimate_kg: number | null; status: string };

    if (s.status !== 'pending') {
      return { pooled: false, pool_id: null };
    }

    if (!s.route_cluster_id) {
      return { pooled: false, pool_id: null };
    }

    const openPools = await LoadPoolingService.listPools({
      route_cluster_id: s.route_cluster_id,
      status: 'open',
      limit: 5,
    });

    const fillingPools = await LoadPoolingService.listPools({
      route_cluster_id: s.route_cluster_id,
      status: 'filling',
      limit: 5,
    });

    const candidatePools = [...openPools, ...fillingPools];

    for (const pool of candidatePools) {
      const remainingCapacity = (pool.capacity_target_kg ?? Infinity) - pool.total_weight_kg;
      const shipWeight = s.weight_estimate_kg ?? 0;

      if (shipWeight <= remainingCapacity) {
        try {
          await LoadPoolingService.addShipment(shipmentId, pool.id);

          await LogisticsEventService.emit({
            event_type: 'shipment_assigned',
            entity_type: 'shipment_request',
            entity_id: shipmentId,
            payload: { pool_id: pool.id, weight_kg: shipWeight },
          });

          return { pooled: true, pool_id: pool.id };
        } catch {
          continue;
        }
      }
    }

    // No existing pool fits — create a new one
    try {
      const { load_pool_id } = await LoadPoolingService.createPool({
        route_cluster_id: s.route_cluster_id,
        capacity_target_kg: DEFAULT_MATCHING_CONFIG.max_pool_weight_kg,
      });

      await LoadPoolingService.addShipment(shipmentId, load_pool_id);

      await LogisticsEventService.emit({
        event_type: 'load_pool_created',
        entity_type: 'load_pool',
        entity_id: load_pool_id,
        payload: { initial_shipment_id: shipmentId, route_cluster_id: s.route_cluster_id },
      });

      return { pooled: true, pool_id: load_pool_id };
    } catch {
      return { pooled: false, pool_id: null };
    }
  }

  /**
   * Get current matching status — summary of pending work.
   */
  static async getMatchingStatus(): Promise<{
    pending_shipments: number;
    open_pools: number;
    ready_pools: number;
    last_run: MatchingRun | null;
  }> {
    const [pendingResult, openPoolsResult, lastRunResult] = await Promise.all([
      supabase
        .from('shipment_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('load_pools')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'filling']),
      supabase
        .from('matching_runs')
        .select('id, status, shipments_processed, pools_created, trips_generated, bookings_created, started_at, completed_at, error_message, created_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const readyPools = await LoadPoolingService.getDispatchReadyPools();

    return {
      pending_shipments: pendingResult.count ?? 0,
      open_pools: openPoolsResult.count ?? 0,
      ready_pools: readyPools.length,
      last_run: lastRunResult.data as unknown as MatchingRun | null,
    };
  }

  // ── Private helpers ──────────────────────────────────────────

  private static async processCluster(
    cluster: ShipmentCluster,
    config: MatchingConfig
  ): Promise<{ pools_created: number; pools_filled: number }> {
    let poolsCreated = 0;
    let poolsFilled = 0;

    const existingPools = await LoadPoolingService.listPools({
      route_cluster_id: cluster.route_cluster_id,
      status: 'open',
      limit: 10,
    });

    // Try to fill existing pools first
    for (const pool of existingPools) {
      const { added } = await LoadPoolingService.autoFillPool(pool.id);
      if (added > 0) poolsFilled++;
    }

    // Check if there are still unassigned shipments that need a new pool
    const remainingShipments = await LoadPoolingService.findPoolableShipments(
      cluster.route_cluster_id,
      50
    );

    if (remainingShipments.length === 0) {
      return { pools_created: poolsCreated, pools_filled: poolsFilled };
    }

    // Create new pools for remaining shipments
    const totalRemainingWeight = remainingShipments.reduce(
      (sum, s) => sum + (s.weight_estimate_kg ?? 0), 0
    );

    if (totalRemainingWeight < config.min_pool_weight_kg && remainingShipments.length < config.min_pool_members) {
      return { pools_created: poolsCreated, pools_filled: poolsFilled };
    }

    const { load_pool_id } = await LoadPoolingService.createPool({
      route_cluster_id: cluster.route_cluster_id,
      capacity_target_kg: config.max_pool_weight_kg,
      dispatch_window: cluster.pickup_window_start && cluster.pickup_window_end
        ? { start: cluster.pickup_window_start, end: cluster.pickup_window_end }
        : undefined,
    });

    poolsCreated++;

    await LogisticsEventService.emit({
      event_type: 'load_pool_created',
      entity_type: 'load_pool',
      entity_id: load_pool_id,
      payload: {
        route_cluster_id: cluster.route_cluster_id,
        shipment_count: remainingShipments.length,
        total_weight_kg: totalRemainingWeight,
      },
    });

    const { added } = await LoadPoolingService.autoFillPool(load_pool_id);
    if (added > 0) poolsFilled++;

    return { pools_created: poolsCreated, pools_filled: poolsFilled };
  }

  private static async startMatchingRun(): Promise<string> {
    const { data, error } = await supabase
      .from('matching_runs')
      .insert({ status: 'running' })
      .select('id')
      .maybeSingle();

    if (error) throw new Error(`startMatchingRun failed: ${error.message}`);
    return (data as { id: string }).id;
  }

  private static async completeMatchingRun(
    runId: string,
    stats: {
      shipments_processed: number;
      pools_created: number;
      trips_generated: number;
      bookings_created: number;
      recommendations_generated?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('matching_runs')
      .update({
        status: 'completed',
        shipments_processed: stats.shipments_processed,
        pools_created: stats.pools_created,
        trips_generated: stats.trips_generated,
        bookings_created: stats.bookings_created,
        recommendations_generated: stats.recommendations_generated ?? 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (error) {
      console.error(`[LogisticsMatchingEngine] completeMatchingRun failed for ${runId}: ${error.message}`);
    }
  }

  private static async failMatchingRun(
    runId: string,
    errorMessage: string
  ): Promise<void> {
    const { error } = await supabase
      .from('matching_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (error) {
      console.error(`[LogisticsMatchingEngine] failMatchingRun failed for ${runId}: ${error.message}`);
    }
  }
}
