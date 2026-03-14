/**
 * RouteClusterService
 *
 * Cluster detection and management utility for grouping
 * logistics routes by district, taluk, village cluster,
 * or market corridor.
 *
 * Internal service — not exposed to frontend in Phase 1.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RouteCluster } from './types';

export class RouteClusterService {
  /**
   * Detect or create a route cluster for an origin/dest district pair.
   * Returns the cluster ID and whether it was newly created.
   */
  static async detectCluster(
    originDistrictId: string,
    destDistrictId: string
  ): Promise<{ route_cluster_id: string; label?: string; created: boolean }> {
    const { data, error } = await supabase.rpc('detect_route_cluster_v1', {
      p_origin_district_id: originDistrictId,
      p_dest_district_id: destDistrictId,
    });

    if (error) throw new Error(`detect_route_cluster failed: ${error.message}`);
    return data as { route_cluster_id: string; label?: string; created: boolean };
  }

  /**
   * Get a route cluster by ID.
   */
  static async getCluster(clusterId: string): Promise<RouteCluster | null> {
    const { data, error } = await supabase
      .from('route_clusters')
      .select('*')
      .eq('id', clusterId)
      .maybeSingle();

    if (error) throw new Error(`getCluster failed: ${error.message}`);
    return data as unknown as RouteCluster | null;
  }

  /**
   * List active route clusters, optionally filtered by origin or dest district.
   */
  static async listClusters(params?: {
    origin_district_id?: string;
    dest_district_id?: string;
    limit?: number;
  }): Promise<RouteCluster[]> {
    let query = supabase
      .from('route_clusters')
      .select('*')
      .eq('is_active', true)
      .order('label', { ascending: true })
      .limit(params?.limit ?? 100);

    if (params?.origin_district_id) {
      query = query.eq('origin_district_id', params.origin_district_id);
    }
    if (params?.dest_district_id) {
      query = query.eq('dest_district_id', params.dest_district_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`listClusters failed: ${error.message}`);
    return (data ?? []) as unknown as RouteCluster[];
  }

  /**
   * Find clusters that match a given origin district (for pooling suggestions).
   */
  static async findMatchingClusters(
    originDistrictId: string
  ): Promise<RouteCluster[]> {
    const { data, error } = await supabase
      .from('route_clusters')
      .select('*')
      .eq('origin_district_id', originDistrictId)
      .eq('is_active', true)
      .order('label', { ascending: true });

    if (error) throw new Error(`findMatchingClusters failed: ${error.message}`);
    return (data ?? []) as unknown as RouteCluster[];
  }
}
