/**
 * Unified Logistics — Legacy Bridge tests
 *
 * Tests the bridge between legacy transport_requests/trips
 * and the new unified logistics domain.
 *
 * Run with: vitest run tests/logistics/legacy-bridge.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { LegacyBridgeService } from '@/services/logistics/LegacyBridgeService';

function chainable(result: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.is = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Legacy Bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bridgeTransportRequest', () => {
    it('should bridge a transport request to a shipment', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { shipment_request_id: 'sr-001', already_exists: false },
        error: null,
      });

      const result = await LegacyBridgeService.bridgeTransportRequest('tr-001');

      expect(mockRpc).toHaveBeenCalledWith('bridge_transport_request_to_shipment_v1', {
        p_transport_request_id: 'tr-001',
      });
      expect(result.shipment_request_id).toBe('sr-001');
      expect(result.already_exists).toBe(false);
    });

    it('should return existing shipment if already bridged', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { shipment_request_id: 'sr-existing', already_exists: true },
        error: null,
      });

      const result = await LegacyBridgeService.bridgeTransportRequest('tr-already-bridged');

      expect(result.already_exists).toBe(true);
    });

    it('should throw when transport request not found', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'TRANSPORT_REQUEST_NOT_FOUND' },
      });

      await expect(
        LegacyBridgeService.bridgeTransportRequest('nonexistent')
      ).rejects.toThrow('bridge_transport_request failed');
    });
  });

  describe('bridgeTrip', () => {
    it('should bridge a legacy trip to a unified trip', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { unified_trip_id: 'ut-001', already_exists: false },
        error: null,
      });

      const result = await LegacyBridgeService.bridgeTrip('trip-001');

      expect(mockRpc).toHaveBeenCalledWith('bridge_trip_to_unified_trip_v1', {
        p_trip_id: 'trip-001',
      });
      expect(result.unified_trip_id).toBe('ut-001');
      expect(result.already_exists).toBe(false);
    });

    it('should return existing unified trip if already bridged', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { unified_trip_id: 'ut-existing', already_exists: true },
        error: null,
      });

      const result = await LegacyBridgeService.bridgeTrip('trip-already-bridged');
      expect(result.already_exists).toBe(true);
    });
  });

  describe('getShipmentForTransportRequest', () => {
    it('should find the linked shipment', async () => {
      const shipment = {
        id: 'sr-001',
        legacy_transport_request_id: 'tr-001',
        request_source_type: 'farmer',
        status: 'pending',
      };

      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      const result = await LegacyBridgeService.getShipmentForTransportRequest('tr-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sr-001');
    });

    it('should return null when no linked shipment exists', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LegacyBridgeService.getShipmentForTransportRequest('tr-no-bridge');
      expect(result).toBeNull();
    });
  });

  describe('getUnifiedTripForLegacyTrip', () => {
    it('should find the linked unified trip', async () => {
      const unifiedTrip = {
        id: 'ut-001',
        legacy_trip_id: 'trip-001',
        trip_status: 'accepted',
      };

      mockFrom.mockReturnValueOnce(chainable({ data: unifiedTrip, error: null }));

      const result = await LegacyBridgeService.getUnifiedTripForLegacyTrip('trip-001');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('ut-001');
    });

    it('should return null when no linked unified trip', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LegacyBridgeService.getUnifiedTripForLegacyTrip('trip-no-bridge');
      expect(result).toBeNull();
    });
  });

  describe('checkSyncHealth', () => {
    it('should report sync health metrics', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 100 }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 95 }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 50 }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 48 }));

      const result = await LegacyBridgeService.checkSyncHealth();

      expect(result.transport_requests_total).toBe(100);
      expect(result.transport_requests_bridged).toBe(95);
      expect(result.transport_requests_unlinked).toBe(5);
      expect(result.trips_total).toBe(50);
      expect(result.trips_bridged).toBe(48);
      expect(result.trips_unlinked).toBe(2);
    });
  });
});
