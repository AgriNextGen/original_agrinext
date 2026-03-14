/**
 * Unified Logistics — Load Pool tests
 *
 * Tests pool creation, member addition, capacity tracking,
 * and pool status transitions.
 *
 * Run with: vitest run tests/logistics/load-pools.test.ts
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

import { LogisticsOrchestratorService } from '@/services/logistics/LogisticsOrchestratorService';

describe('Load Pools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLoadPool', () => {
    it('should create a load pool with route cluster', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { load_pool_id: 'lp-001' },
        error: null,
      });

      const result = await LogisticsOrchestratorService.createLoadPool({
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

    it('should create a pool with dispatch window', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { load_pool_id: 'lp-002' },
        error: null,
      });

      const result = await LogisticsOrchestratorService.createLoadPool({
        route_cluster_id: 'rc-001',
        capacity_target_kg: 3000,
        dispatch_window: {
          start: '2026-03-15T06:00:00Z',
          end: '2026-03-15T18:00:00Z',
        },
      });

      expect(mockRpc).toHaveBeenCalledWith('create_load_pool_v1', {
        p_route_cluster_id: 'rc-001',
        p_capacity_target_kg: 3000,
        p_dispatch_window: {
          start: '2026-03-15T06:00:00Z',
          end: '2026-03-15T18:00:00Z',
        },
      });
      expect(result.load_pool_id).toBe('lp-002');
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Route cluster not found' },
      });

      await expect(
        LogisticsOrchestratorService.createLoadPool({
          route_cluster_id: 'invalid',
          capacity_target_kg: 5000,
        })
      ).rejects.toThrow('create_load_pool failed');
    });
  });

  describe('addShipmentToPool', () => {
    it('should add a shipment to a pool', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, load_pool_id: 'lp-001' },
        error: null,
      });

      const result = await LogisticsOrchestratorService.addShipmentToPool('sr-001', 'lp-001');

      expect(mockRpc).toHaveBeenCalledWith('add_shipment_to_pool_v1', {
        p_shipment_request_id: 'sr-001',
        p_load_pool_id: 'lp-001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject adding to a full pool', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'POOL_NOT_ACCEPTING: full' },
      });

      await expect(
        LogisticsOrchestratorService.addShipmentToPool('sr-002', 'lp-full')
      ).rejects.toThrow('add_shipment_to_pool failed');
    });

    it('should reject adding a non-pending shipment', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INVALID_SHIPMENT_STATUS: booked' },
      });

      await expect(
        LogisticsOrchestratorService.addShipmentToPool('sr-booked', 'lp-001')
      ).rejects.toThrow('INVALID_SHIPMENT_STATUS');
    });
  });
});
