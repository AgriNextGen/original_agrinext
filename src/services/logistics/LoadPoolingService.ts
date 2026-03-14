/**
 * LoadPoolingService
 *
 * Focused service for grouping shipments by location,
 * calculating pooled loads, and managing load pool lifecycle.
 *
 * Pooling criteria: route cluster, pickup time window, cargo compatibility.
 * Mutation methods delegate to LogisticsOrchestratorService to avoid duplication.
 *
 * Internal service — not exposed to frontend in Phase 1.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  LoadPool,
  LoadPoolMember,
  ShipmentRequest,
  LoadPoolStatus,
  ShipmentCluster,
  PoolReadiness,
  MatchingConfig,
} from './types';
import { DEFAULT_MATCHING_CONFIG as DEFAULTS } from './types';
import { LogisticsOrchestratorService } from './LogisticsOrchestratorService';
import { hasTimeWindowOverlap } from '@/lib/logistics/routeClusters';

export class LoadPoolingService {
  /**
   * Create a load pool for a route cluster with a target capacity.
   * Delegates to LogisticsOrchestratorService.createLoadPool.
   */
  static async createPool(params: {
    route_cluster_id: string;
    capacity_target_kg: number;
    dispatch_window?: { start: string; end: string };
  }): Promise<{ load_pool_id: string }> {
    return LogisticsOrchestratorService.createLoadPool(params);
  }

  /**
   * Add a pending shipment to an open/filling pool.
   * Delegates to LogisticsOrchestratorService.addShipmentToPool.
   */
  static async addShipment(
    shipmentRequestId: string,
    loadPoolId: string
  ): Promise<{ success: boolean; load_pool_id: string }> {
    return LogisticsOrchestratorService.addShipmentToPool(shipmentRequestId, loadPoolId);
  }

  /**
   * Get a load pool by ID with its member shipments.
   */
  static async getPool(
    loadPoolId: string
  ): Promise<LoadPool & { members: LoadPoolMember[] }> {
    const { data: pool, error: poolErr } = await supabase
      .from('load_pools')
      .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at')
      .eq('id', loadPoolId)
      .maybeSingle();

    if (poolErr) throw new Error(`getPool query failed: ${poolErr.message}`);
    if (!pool) throw new Error('Load pool not found');

    const { data: members, error: memErr } = await supabase
      .from('load_pool_members')
      .select('id, load_pool_id, shipment_request_id, added_at')
      .eq('load_pool_id', loadPoolId)
      .order('added_at', { ascending: true });

    if (memErr) throw new Error(`getPool members query failed: ${memErr.message}`);

    return {
      ...(pool as unknown as LoadPool),
      members: (members ?? []) as unknown as LoadPoolMember[],
    };
  }

  /**
   * List load pools filtered by status and/or route cluster.
   */
  static async listPools(params?: {
    status?: LoadPoolStatus;
    route_cluster_id?: string;
    limit?: number;
  }): Promise<LoadPool[]> {
    let query = supabase
      .from('load_pools')
      .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50);

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.route_cluster_id) {
      query = query.eq('route_cluster_id', params.route_cluster_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listPools failed: ${error.message}`);
    return (data ?? []) as unknown as LoadPool[];
  }

  /**
   * Find pending shipments that could be pooled into a given route cluster.
   */
  static async findPoolableShipments(
    routeClusterId: string,
    limit = 20
  ): Promise<ShipmentRequest[]> {
    const { data, error } = await supabase
      .from('shipment_requests')
      .select('id, request_source_type, source_actor_id, shipment_type, pickup_location, drop_location, origin_district_id, dest_district_id, route_cluster_id, weight_estimate_kg, volume_estimate_cbm, status, priority, created_at')
      .eq('route_cluster_id', routeClusterId)
      .eq('status', 'pending')
      .order('weight_estimate_kg', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`findPoolableShipments failed: ${error.message}`);
    return (data ?? []) as unknown as ShipmentRequest[];
  }

  /**
   * Get aggregated weight for a pool.
   * Reads directly from load_pools.total_weight_kg (maintained by add_shipment_to_pool_v1 RPC).
   */
  static async calculatePoolWeight(
    loadPoolId: string
  ): Promise<{ total_weight_kg: number; member_count: number }> {
    const { data: pool, error: poolErr } = await supabase
      .from('load_pools')
      .select('total_weight_kg')
      .eq('id', loadPoolId)
      .maybeSingle();

    if (poolErr) throw new Error(`calculatePoolWeight failed: ${poolErr.message}`);
    if (!pool) throw new Error('Load pool not found');

    const { count, error: countErr } = await supabase
      .from('load_pool_members')
      .select('id', { count: 'exact', head: true })
      .eq('load_pool_id', loadPoolId);

    if (countErr) throw new Error(`calculatePoolWeight count failed: ${countErr.message}`);

    return {
      total_weight_kg: (pool as { total_weight_kg: number | null }).total_weight_kg ?? 0,
      member_count: count ?? 0,
    };
  }

  // ── Phase 2: Orchestration Methods ──────────────────────────

  /**
   * Group all pending shipments by route cluster and pickup window.
   * Returns clusters of shipments that can be pooled together.
   */
  static async clusterPendingShipments(
    routeClusterId?: string
  ): Promise<ShipmentCluster[]> {
    let query = supabase
      .from('shipment_requests')
      .select('id, request_source_type, source_actor_id, shipment_type, pickup_location, drop_location, pickup_geo_lat, pickup_geo_long, drop_geo_lat, drop_geo_long, origin_district_id, dest_district_id, origin_market_id, dest_market_id, route_cluster_id, pickup_time_window_start, pickup_time_window_end, delivery_time_window_start, delivery_time_window_end, weight_estimate_kg, volume_estimate_cbm, status, priority, notes, legacy_transport_request_id, legacy_market_order_id, created_at, updated_at')
      .eq('status', 'pending')
      .not('route_cluster_id', 'is', null)
      .order('route_cluster_id')
      .order('pickup_time_window_start', { ascending: true });

    if (routeClusterId) {
      query = query.eq('route_cluster_id', routeClusterId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`clusterPendingShipments failed: ${error.message}`);

    const shipments = (data ?? []) as unknown as ShipmentRequest[];
    const clusterMap = new Map<string, ShipmentRequest[]>();

    for (const s of shipments) {
      const key = s.route_cluster_id ?? 'unassigned';
      const existing = clusterMap.get(key) ?? [];
      existing.push(s);
      clusterMap.set(key, existing);
    }

    const clusters: ShipmentCluster[] = [];
    for (const [clusterId, members] of clusterMap) {
      if (clusterId === 'unassigned') continue;

      const totalWeight = members.reduce(
        (sum, s) => sum + (s.weight_estimate_kg ?? 0), 0
      );

      const windowStarts = members
        .map((s) => s.pickup_time_window_start)
        .filter(Boolean) as string[];
      const windowEnds = members
        .map((s) => s.pickup_time_window_end)
        .filter(Boolean) as string[];

      clusters.push({
        route_cluster_id: clusterId,
        shipments: members,
        total_weight_kg: totalWeight,
        pickup_window_start: windowStarts.length > 0
          ? windowStarts.sort()[0]
          : null,
        pickup_window_end: windowEnds.length > 0
          ? windowEnds.sort().reverse()[0]
          : null,
      });
    }

    return clusters;
  }

  /**
   * Find compatible pending shipments and add them to an existing pool.
   * Uses route cluster and time window overlap for compatibility.
   */
  static async autoFillPool(
    loadPoolId: string
  ): Promise<{ added: number; shipment_ids: string[] }> {
    const pool = await this.getPool(loadPoolId);
    if (!pool.route_cluster_id) {
      return { added: 0, shipment_ids: [] };
    }

    if (pool.status !== 'open' && pool.status !== 'filling') {
      return { added: 0, shipment_ids: [] };
    }

    const existingMemberIds = new Set(
      pool.members.map((m) => m.shipment_request_id)
    );

    const candidates = await this.findPoolableShipments(
      pool.route_cluster_id,
      50
    );

    const referenceWindow = {
      start: pool.dispatch_window_start ?? new Date().toISOString(),
      end: pool.dispatch_window_end ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const compatible = candidates.filter((s) => {
      if (existingMemberIds.has(s.id)) return false;
      return hasTimeWindowOverlap(s, referenceWindow);
    });

    const capacityRemaining = (pool.capacity_target_kg ?? Infinity) - pool.total_weight_kg;
    const addedIds: string[] = [];
    let weightAccum = 0;

    for (const shipment of compatible) {
      const shipWeight = shipment.weight_estimate_kg ?? 0;
      if (weightAccum + shipWeight > capacityRemaining) continue;

      try {
        await this.addShipment(shipment.id, loadPoolId);
        addedIds.push(shipment.id);
        weightAccum += shipWeight;
      } catch {
        continue;
      }
    }

    return { added: addedIds.length, shipment_ids: addedIds };
  }

  /**
   * Check if a pool meets dispatch threshold.
   * Ready when: weight >= 70% of target OR minimum member count met.
   */
  static async evaluatePoolReadiness(
    loadPoolId: string,
    config?: Partial<Pick<MatchingConfig, 'min_pool_weight_kg' | 'min_pool_members'>>
  ): Promise<PoolReadiness> {
    const { total_weight_kg, member_count } = await this.calculatePoolWeight(loadPoolId);

    const { data: pool, error } = await supabase
      .from('load_pools')
      .select('id, capacity_target_kg, status')
      .eq('id', loadPoolId)
      .maybeSingle();

    if (error) throw new Error(`evaluatePoolReadiness failed: ${error.message}`);
    if (!pool) throw new Error('Load pool not found');

    const p = pool as { id: string; capacity_target_kg: number | null; status: string };
    const targetKg = p.capacity_target_kg ?? DEFAULTS.max_pool_weight_kg;
    const minWeight = config?.min_pool_weight_kg ?? DEFAULTS.min_pool_weight_kg;
    const minMembers = config?.min_pool_members ?? DEFAULTS.min_pool_members;

    const weightRatio = targetKg > 0 ? total_weight_kg / targetKg : 0;
    const meetsWeight = total_weight_kg >= minWeight && weightRatio >= 0.7;
    const meetsMembers = member_count >= minMembers;

    return {
      load_pool_id: loadPoolId,
      is_ready: meetsWeight && meetsMembers,
      total_weight_kg,
      capacity_target_kg: p.capacity_target_kg,
      member_count,
      weight_ratio: Math.round(weightRatio * 100) / 100,
    };
  }

  /**
   * List pools that are ready for trip generation.
   * A pool is ready when status is open/filling and weight meets threshold.
   */
  static async getDispatchReadyPools(): Promise<Array<LoadPool & { member_count: number }>> {
    const { data: pools, error } = await supabase
      .from('load_pools')
      .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at')
      .in('status', ['open', 'filling'])
      .order('total_weight_kg', { ascending: false });

    if (error) throw new Error(`getDispatchReadyPools failed: ${error.message}`);

    const candidatePools = ((pools ?? []) as unknown as LoadPool[]).filter((pool) => {
      const targetKg = pool.capacity_target_kg ?? DEFAULTS.max_pool_weight_kg;
      const weightRatio = targetKg > 0 ? pool.total_weight_kg / targetKg : 0;
      return pool.total_weight_kg >= DEFAULTS.min_pool_weight_kg && weightRatio >= 0.7;
    });

    if (candidatePools.length === 0) return [];

    const poolIds = candidatePools.map((p) => p.id);
    const { data: members, error: memErr } = await supabase
      .from('load_pool_members')
      .select('load_pool_id')
      .in('load_pool_id', poolIds);

    if (memErr) throw new Error(`getDispatchReadyPools member count failed: ${memErr.message}`);

    const countMap = new Map<string, number>();
    for (const m of (members ?? []) as Array<{ load_pool_id: string }>) {
      countMap.set(m.load_pool_id, (countMap.get(m.load_pool_id) ?? 0) + 1);
    }

    return candidatePools
      .filter((pool) => (countMap.get(pool.id) ?? 0) >= DEFAULTS.min_pool_members)
      .map((pool) => ({ ...pool, member_count: countMap.get(pool.id) ?? 0 }));
  }
}
