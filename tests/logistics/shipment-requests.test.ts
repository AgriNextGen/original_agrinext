/**
 * Unified Logistics — Shipment Request tests
 *
 * Tests shipment creation, validation, status transitions,
 * and the relationship between shipments and items.
 *
 * Run with: vitest run tests/logistics/shipment-requests.test.ts
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
import type { CreateShipmentRequestParams } from '@/services/logistics/types';

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

describe('Shipment Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createShipmentRequest', () => {
    it('should create a shipment request with items via RPC', async () => {
      const expectedResult = {
        shipment_request_id: 'sr-001',
        route_cluster_id: 'rc-001',
      };
      mockRpc.mockResolvedValueOnce({ data: expectedResult, error: null });

      const params: CreateShipmentRequestParams = {
        request_source_type: 'farmer',
        source_actor_id: 'user-001',
        shipment_type: 'farm_produce',
        pickup_location: 'Hunsuru Village',
        drop_location: 'Mysuru Mandi',
        origin_district_id: 'dist-001',
        dest_district_id: 'dist-002',
        weight_estimate_kg: 500,
        items: [
          { product_name: 'Tomato', quantity: 500, unit: 'kg', weight_kg: 500 },
        ],
      };

      const result = await LogisticsOrchestratorService.createShipmentRequest(params);

      expect(mockRpc).toHaveBeenCalledWith('create_shipment_request_v1', {
        p_params: params,
      });
      expect(result.shipment_request_id).toBe('sr-001');
      expect(result.route_cluster_id).toBe('rc-001');
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

      await expect(
        LogisticsOrchestratorService.createShipmentRequest({
          request_source_type: 'farmer',
          source_actor_id: 'user-001',
        })
      ).rejects.toThrow('create_shipment_request failed');
    });

    it('should support all source types', async () => {
      const sourceTypes = ['farmer', 'buyer', 'vendor', 'admin'] as const;

      for (const sourceType of sourceTypes) {
        mockRpc.mockResolvedValueOnce({
          data: { shipment_request_id: `sr-${sourceType}`, route_cluster_id: null },
          error: null,
        });

        const result = await LogisticsOrchestratorService.createShipmentRequest({
          request_source_type: sourceType,
          source_actor_id: 'user-001',
        });

        expect(result.shipment_request_id).toBe(`sr-${sourceType}`);
      }
    });

    it('should support all shipment types', async () => {
      const shipmentTypes = ['farm_produce', 'agri_input', 'general_goods', 'return_goods'] as const;

      for (const shipmentType of shipmentTypes) {
        mockRpc.mockResolvedValueOnce({
          data: { shipment_request_id: `sr-${shipmentType}`, route_cluster_id: null },
          error: null,
        });

        const result = await LogisticsOrchestratorService.createShipmentRequest({
          request_source_type: 'farmer',
          source_actor_id: 'user-001',
          shipment_type: shipmentType,
        });

        expect(result.shipment_request_id).toBe(`sr-${shipmentType}`);
      }
    });
  });

  describe('getShipmentRequest', () => {
    it('should return shipment with items and bookings', async () => {
      const shipment = {
        id: 'sr-001',
        request_source_type: 'farmer',
        source_actor_id: 'user-001',
        status: 'pending',
      };
      const items = [{ id: 'si-001', product_name: 'Tomato', quantity: 500 }];
      const bookings = [{ id: 'sb-001', booking_status: 'confirmed' }];

      mockFrom
        .mockReturnValueOnce(chainable({ data: shipment, error: null }))
        .mockReturnValueOnce(chainable({ data: items, error: null }))
        .mockReturnValueOnce(chainable({ data: bookings, error: null }));

      const result = await LogisticsOrchestratorService.getShipmentRequest('sr-001');

      expect(result.id).toBe('sr-001');
      expect(result.items).toHaveLength(1);
      expect(result.bookings).toHaveLength(1);
    });

    it('should throw when shipment not found', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        LogisticsOrchestratorService.getShipmentRequest('nonexistent')
      ).rejects.toThrow('Shipment not found');
    });
  });

  describe('listPendingShipments', () => {
    it('should list pending shipments with default limit', async () => {
      const shipments = [
        { id: 'sr-001', status: 'pending' },
        { id: 'sr-002', status: 'pending' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: shipments, error: null }));

      const result = await LogisticsOrchestratorService.listPendingShipments();
      expect(result).toHaveLength(2);
    });

    it('should filter by route cluster', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await LogisticsOrchestratorService.listPendingShipments({
        route_cluster_id: 'rc-001',
      });

      expect(mockFrom).toHaveBeenCalledWith('shipment_requests');
    });
  });
});
