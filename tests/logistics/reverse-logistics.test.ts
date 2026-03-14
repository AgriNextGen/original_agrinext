/**
 * Unified Logistics — Reverse Logistics tests
 *
 * Tests reverse load candidate generation, listing,
 * and eligible return trip detection.
 *
 * Run with: vitest run tests/logistics/reverse-logistics.test.ts
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

import { ReverseLogisticsService } from '@/services/logistics/ReverseLogisticsService';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.gte = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Reverse Logistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findCandidates', () => {
    it('should find reverse load candidates for a trip', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          candidates: [
            { candidate_id: 'rlc-001', shipment_request_id: 'sr-010', score: 85, weight_estimate_kg: 200 },
            { candidate_id: 'rlc-002', shipment_request_id: 'sr-011', score: 60, weight_estimate_kg: 150 },
          ],
          count: 2,
          remaining_capacity_kg: 3000,
        },
        error: null,
      });

      const result = await ReverseLogisticsService.findCandidates('ut-001');

      expect(mockRpc).toHaveBeenCalledWith('find_reverse_load_candidates_v1', {
        p_unified_trip_id: 'ut-001',
      });
      expect(result.candidates).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(result.remaining_capacity_kg).toBe(3000);
      expect(result.candidates[0].score).toBe(85);
    });

    it('should return empty when no capacity remaining', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          candidates: [],
          message: 'No remaining capacity',
        },
        error: null,
      });

      const result = await ReverseLogisticsService.findCandidates('ut-full');
      expect(result.candidates).toHaveLength(0);
    });

    it('should throw when trip not found', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'TRIP_NOT_FOUND' },
      });

      await expect(
        ReverseLogisticsService.findCandidates('nonexistent')
      ).rejects.toThrow('find_reverse_load_candidates failed');
    });
  });

  describe('listCandidates', () => {
    it('should list candidates for a trip', async () => {
      const candidates = [
        { id: 'rlc-001', candidate_score: 85, status: 'identified' },
        { id: 'rlc-002', candidate_score: 60, status: 'identified' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: candidates, error: null }));

      const result = await ReverseLogisticsService.listCandidates('ut-001');

      expect(result).toHaveLength(2);
      expect(mockFrom).toHaveBeenCalledWith('reverse_load_candidates');
    });

    it('should filter by status', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await ReverseLogisticsService.listCandidates('ut-001', 'offered');

      expect(mockFrom).toHaveBeenCalledWith('reverse_load_candidates');
    });

    it('should return empty when no candidates', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.listCandidates('ut-no-candidates');
      expect(result).toHaveLength(0);
    });
  });

  describe('getEligibleReturnTrips', () => {
    it('should find trips with remaining capacity', async () => {
      const trips = [
        { id: 'ut-001', capacity_total_kg: 5000, capacity_used_kg: 2000, end_location: 'Mysuru' },
        { id: 'ut-002', capacity_total_kg: 3000, capacity_used_kg: 3000, end_location: 'Mandya' },
        { id: 'ut-003', capacity_total_kg: 4000, capacity_used_kg: 1000, end_location: 'Hassan' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const result = await ReverseLogisticsService.getEligibleReturnTrips();

      expect(result).toHaveLength(2);
      expect(result[0].trip_id).toBe('ut-001');
      expect(result[0].remaining_kg).toBe(3000);
      expect(result[1].trip_id).toBe('ut-003');
      expect(result[1].remaining_kg).toBe(3000);
    });

    it('should filter by minimum remaining capacity', async () => {
      const trips = [
        { id: 'ut-001', capacity_total_kg: 5000, capacity_used_kg: 4500, end_location: 'Mysuru' },
        { id: 'ut-002', capacity_total_kg: 5000, capacity_used_kg: 2000, end_location: 'Mandya' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const result = await ReverseLogisticsService.getEligibleReturnTrips({
        min_remaining_kg: 1000,
      });

      expect(result).toHaveLength(1);
      expect(result[0].trip_id).toBe('ut-002');
      expect(result[0].remaining_kg).toBe(3000);
    });

    it('should return empty when no eligible trips', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.getEligibleReturnTrips();
      expect(result).toHaveLength(0);
    });

    it('should handle null capacity gracefully', async () => {
      const trips = [
        { id: 'ut-001', capacity_total_kg: null, capacity_used_kg: 0, end_location: 'Mysuru' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const result = await ReverseLogisticsService.getEligibleReturnTrips();
      expect(result).toHaveLength(0);
    });
  });
});
