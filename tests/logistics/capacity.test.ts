/**
 * Unified Logistics — Capacity Calculation tests
 *
 * Tests capacity allocation, deallocation, and remaining
 * capacity tracking for unified trips.
 *
 * Run with: vitest run tests/logistics/capacity.test.ts
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

import { TripManagementService } from '@/services/logistics/TripManagementService';
import { LogisticsOrchestratorService } from '@/services/logistics/LogisticsOrchestratorService';

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

describe('Capacity Calculations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRemainingCapacity', () => {
    it('should calculate remaining weight capacity', async () => {
      mockFrom.mockReturnValueOnce(
        chainable({
          data: {
            capacity_total_kg: 5000,
            capacity_used_kg: 2000,
            capacity_total_cbm: null,
            capacity_used_cbm: 0,
          },
          error: null,
        })
      );

      const result = await TripManagementService.getRemainingCapacity('ut-001');

      expect(result.remaining_weight_kg).toBe(3000);
      expect(result.remaining_volume_cbm).toBeNull();
    });

    it('should calculate remaining volume capacity', async () => {
      mockFrom.mockReturnValueOnce(
        chainable({
          data: {
            capacity_total_kg: 5000,
            capacity_used_kg: 1000,
            capacity_total_cbm: 20,
            capacity_used_cbm: 5,
          },
          error: null,
        })
      );

      const result = await TripManagementService.getRemainingCapacity('ut-001');

      expect(result.remaining_weight_kg).toBe(4000);
      expect(result.remaining_volume_cbm).toBe(15);
    });

    it('should return zero when fully loaded', async () => {
      mockFrom.mockReturnValueOnce(
        chainable({
          data: {
            capacity_total_kg: 5000,
            capacity_used_kg: 5000,
            capacity_total_cbm: 20,
            capacity_used_cbm: 20,
          },
          error: null,
        })
      );

      const result = await TripManagementService.getRemainingCapacity('ut-001');

      expect(result.remaining_weight_kg).toBe(0);
      expect(result.remaining_volume_cbm).toBe(0);
    });

    it('should handle null total capacity', async () => {
      mockFrom.mockReturnValueOnce(
        chainable({
          data: {
            capacity_total_kg: null,
            capacity_used_kg: 0,
            capacity_total_cbm: null,
            capacity_used_cbm: 0,
          },
          error: null,
        })
      );

      const result = await TripManagementService.getRemainingCapacity('ut-001');

      expect(result.remaining_weight_kg).toBe(0);
      expect(result.remaining_volume_cbm).toBeNull();
    });

    it('should throw when trip not found', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        TripManagementService.getRemainingCapacity('nonexistent')
      ).rejects.toThrow('Trip not found');
    });
  });

  describe('bookShipmentToTrip capacity checks', () => {
    it('should book and return updated capacity', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          booking_id: 'sb-001',
          capacity_used_kg: 2500,
          capacity_remaining_kg: 2500,
        },
        error: null,
      });

      const result = await LogisticsOrchestratorService.bookShipmentToTrip('sr-001', 'ut-001');

      expect(result.booking_id).toBe('sb-001');
      expect(result.capacity_used_kg).toBe(2500);
      expect(result.capacity_remaining_kg).toBe(2500);
    });

    it('should reject when insufficient capacity', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INSUFFICIENT_CAPACITY: need 3000 kg, available 500 kg' },
      });

      await expect(
        LogisticsOrchestratorService.bookShipmentToTrip('sr-heavy', 'ut-almost-full')
      ).rejects.toThrow('INSUFFICIENT_CAPACITY');
    });

    it('should reject booking to non-bookable trip', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'TRIP_NOT_BOOKABLE: in_transit' },
      });

      await expect(
        LogisticsOrchestratorService.bookShipmentToTrip('sr-001', 'ut-in-transit')
      ).rejects.toThrow('TRIP_NOT_BOOKABLE');
    });
  });
});
