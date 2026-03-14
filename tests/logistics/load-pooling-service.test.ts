/**
 * Unified Logistics — LoadPoolingService tests
 *
 * Tests pool creation, member addition, pool retrieval,
 * poolable shipment discovery, and weight calculation.
 *
 * Run with: vitest run tests/logistics/load-pooling-service.test.ts
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

import { LoadPoolingService } from '@/services/logistics/LoadPoolingService';

function chainable(result: { data: unknown; error: unknown; count?: number }) {
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

describe('LoadPoolingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPool', () => {
    it('should create a pool via RPC', async () => {
      mockRpc.mockResolvedValueOnce({ data: { load_pool_id: 'lp-001' }, error: null });

      const result = await LoadPoolingService.createPool({
        route_cluster_id: 'rc-001',
        capacity_target_kg: 5000,
      });

      expect(mockRpc).toHaveBeenCalledWith('create_load_pool_v1', {
        p_route_cluster_id: 'rc-001',
        p_capacity_target_kg: 5000,
        p_dispatch_window: null,
      });
      expect(result.load_pool_id).toBe('lp-001');
    });

    it('should pass dispatch window when provided', async () => {
      mockRpc.mockResolvedValueOnce({ data: { load_pool_id: 'lp-002' }, error: null });

      const window = { start: '2026-03-15T06:00:00Z', end: '2026-03-15T18:00:00Z' };
      await LoadPoolingService.createPool({
        route_cluster_id: 'rc-001',
        capacity_target_kg: 3000,
        dispatch_window: window,
      });

      expect(mockRpc).toHaveBeenCalledWith('create_load_pool_v1', {
        p_route_cluster_id: 'rc-001',
        p_capacity_target_kg: 3000,
        p_dispatch_window: window,
      });
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'cluster not found' } });

      await expect(
        LoadPoolingService.createPool({ route_cluster_id: 'bad', capacity_target_kg: 1000 })
      ).rejects.toThrow('create_load_pool failed');
    });
  });

  describe('addShipment', () => {
    it('should add shipment to pool', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, load_pool_id: 'lp-001' },
        error: null,
      });

      const result = await LoadPoolingService.addShipment('sr-001', 'lp-001');
      expect(result.success).toBe(true);
    });

    it('should reject non-pending shipment', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INVALID_SHIPMENT_STATUS' },
      });

      await expect(
        LoadPoolingService.addShipment('sr-booked', 'lp-001')
      ).rejects.toThrow('add_shipment_to_pool failed');
    });
  });

  describe('getPool', () => {
    it('should return pool with members', async () => {
      const pool = { id: 'lp-001', status: 'filling', total_weight_kg: 1200 };
      const members = [
        { id: 'lpm-001', load_pool_id: 'lp-001', shipment_request_id: 'sr-001' },
        { id: 'lpm-002', load_pool_id: 'lp-001', shipment_request_id: 'sr-002' },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: pool, error: null }))
        .mockReturnValueOnce(chainable({ data: members, error: null }));

      const result = await LoadPoolingService.getPool('lp-001');
      expect(result.id).toBe('lp-001');
      expect(result.members).toHaveLength(2);
    });

    it('should throw when pool not found', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(LoadPoolingService.getPool('nonexistent')).rejects.toThrow('Load pool not found');
    });
  });

  describe('listPools', () => {
    it('should list pools with default params', async () => {
      const pools = [{ id: 'lp-001' }, { id: 'lp-002' }];
      mockFrom.mockReturnValueOnce(chainable({ data: pools, error: null }));

      const result = await LoadPoolingService.listPools();
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));
      await LoadPoolingService.listPools({ status: 'open' });
      expect(mockFrom).toHaveBeenCalledWith('load_pools');
    });
  });

  describe('findPoolableShipments', () => {
    it('should find pending shipments for a route cluster', async () => {
      const shipments = [
        { id: 'sr-001', weight_estimate_kg: 500 },
        { id: 'sr-002', weight_estimate_kg: 300 },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: shipments, error: null }));

      const result = await LoadPoolingService.findPoolableShipments('rc-001');
      expect(result).toHaveLength(2);
    });
  });

  describe('calculatePoolWeight', () => {
    it('should sum member shipment weights', async () => {
      // Service now reads total_weight_kg directly from load_pools table
      // and gets member count via a separate count query.
      mockFrom
        .mockReturnValueOnce(chainable({ data: { total_weight_kg: 800 }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 2 }));

      const result = await LoadPoolingService.calculatePoolWeight('lp-001');
      expect(result.total_weight_kg).toBe(800);
      expect(result.member_count).toBe(2);
    });

    it('should return zero for empty pool', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: { total_weight_kg: 0 }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 0 }));

      const result = await LoadPoolingService.calculatePoolWeight('lp-empty');
      expect(result.total_weight_kg).toBe(0);
      expect(result.member_count).toBe(0);
    });

    it('should handle null weights', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: { total_weight_kg: null }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 1 }));

      const result = await LoadPoolingService.calculatePoolWeight('lp-null');
      expect(result.total_weight_kg).toBe(0);
      expect(result.member_count).toBe(1);
    });
  });
});
