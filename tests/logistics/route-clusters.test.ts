/**
 * Unified Logistics — Route Cluster tests
 *
 * Tests cluster detection, creation, listing, and matching.
 *
 * Run with: vitest run tests/logistics/route-clusters.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { RouteClusterService } from '@/services/logistics/RouteClusterService';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Route Clusters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectCluster', () => {
    it('should find an existing cluster', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { route_cluster_id: 'rc-001', created: false },
        error: null,
      });

      const result = await RouteClusterService.detectCluster('dist-001', 'dist-002');

      expect(mockRpc).toHaveBeenCalledWith('detect_route_cluster_v1', {
        p_origin_district_id: 'dist-001',
        p_dest_district_id: 'dist-002',
      });
      expect(result.route_cluster_id).toBe('rc-001');
      expect(result.created).toBe(false);
    });

    it('should create a new cluster when none exists', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          route_cluster_id: 'rc-new',
          label: 'Mysuru → Bengaluru',
          created: true,
        },
        error: null,
      });

      const result = await RouteClusterService.detectCluster('dist-mysuru', 'dist-blr');

      expect(result.route_cluster_id).toBe('rc-new');
      expect(result.label).toBe('Mysuru → Bengaluru');
      expect(result.created).toBe(true);
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'District not found' },
      });

      await expect(
        RouteClusterService.detectCluster('invalid', 'invalid')
      ).rejects.toThrow('detect_route_cluster failed');
    });
  });

  describe('getCluster', () => {
    it('should return a cluster by ID', async () => {
      const cluster = {
        id: 'rc-001',
        cluster_type: 'district',
        origin_district_id: 'dist-001',
        dest_district_id: 'dist-002',
        label: 'Mysuru → Mandya',
        is_active: true,
      };

      mockFrom.mockReturnValueOnce(chainable({ data: cluster, error: null }));

      const result = await RouteClusterService.getCluster('rc-001');

      expect(result).not.toBeNull();
      expect(result!.label).toBe('Mysuru → Mandya');
    });

    it('should return null when not found', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await RouteClusterService.getCluster('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listClusters', () => {
    it('should list active clusters', async () => {
      const clusters = [
        { id: 'rc-001', label: 'Mysuru → Mandya' },
        { id: 'rc-002', label: 'Mysuru → Bengaluru' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: clusters, error: null }));

      const result = await RouteClusterService.listClusters();
      expect(result).toHaveLength(2);
    });

    it('should filter by origin district', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await RouteClusterService.listClusters({
        origin_district_id: 'dist-001',
      });

      expect(mockFrom).toHaveBeenCalledWith('route_clusters');
    });
  });

  describe('findMatchingClusters', () => {
    it('should find clusters for an origin district', async () => {
      const clusters = [
        { id: 'rc-001', label: 'Mysuru → Mandya' },
        { id: 'rc-002', label: 'Mysuru → Bengaluru' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: clusters, error: null }));

      const result = await RouteClusterService.findMatchingClusters('dist-mysuru');

      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith('route_clusters');
    });

    it('should return empty array when no matches', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await RouteClusterService.findMatchingClusters('dist-remote');
      expect(result).toHaveLength(0);
    });
  });
});
