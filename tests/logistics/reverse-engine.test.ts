/**
 * Phase 3 — ReverseLogisticsService enhanced tests
 *
 * Tests offer/accept/decline/expire lifecycle, scanAndMatch,
 * matchVendorShipments, and getOpportunities.
 *
 * Run with: vitest run tests/logistics/reverse-engine.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

vi.mock('@/services/logistics/LogisticsEventService', () => ({
  LogisticsEventService: {
    emit: vi.fn().mockResolvedValue(null),
  },
}));

import { ReverseLogisticsService } from '@/services/logistics/ReverseLogisticsService';
import { LogisticsEventService } from '@/services/logistics/LogisticsEventService';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.update = vi.fn().mockReturnValue(self());
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

describe('ReverseLogisticsService — Phase 3', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('offerCandidate', () => {
    it('should transition candidate to offered and emit event', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { candidate_id: 'rlc-001', status: 'offered', unified_trip_id: 'ut-001', shipment_request_id: 'sr-010' },
        error: null,
      });

      const result = await ReverseLogisticsService.offerCandidate('rlc-001');

      expect(result.status).toBe('offered');
      expect(result.candidate_id).toBe('rlc-001');
      expect(mockRpc).toHaveBeenCalledWith('offer_reverse_candidate_v1', { p_candidate_id: 'rlc-001' });
      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'reverse_candidate_offered' })
      );
    });

    it('should throw on invalid status', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INVALID_STATUS: candidate must be identified to offer, got accepted' },
      });

      await expect(
        ReverseLogisticsService.offerCandidate('rlc-accepted')
      ).rejects.toThrow('offerCandidate failed');
    });

    it('should throw on expired candidate', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'CANDIDATE_EXPIRED' },
      });

      await expect(
        ReverseLogisticsService.offerCandidate('rlc-expired')
      ).rejects.toThrow('offerCandidate failed');
    });
  });

  describe('acceptCandidate', () => {
    it('should accept candidate, create booking, and emit event', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          candidate_id: 'rlc-001', status: 'accepted', booking_id: 'bk-001',
          weight_allocated_kg: 500, unified_trip_id: 'ut-001', shipment_request_id: 'sr-010',
        },
        error: null,
      });

      const result = await ReverseLogisticsService.acceptCandidate('rlc-001');

      expect(result.status).toBe('accepted');
      expect(result.booking_id).toBe('bk-001');
      expect(result.weight_allocated_kg).toBe(500);
      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'reverse_candidate_accepted' })
      );
    });

    it('should throw on non-offered candidate', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INVALID_STATUS: candidate must be offered to accept, got identified' },
      });

      await expect(
        ReverseLogisticsService.acceptCandidate('rlc-not-offered')
      ).rejects.toThrow('acceptCandidate failed');
    });
  });

  describe('declineCandidate', () => {
    it('should cancel the candidate', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { candidate_id: 'rlc-001', status: 'cancelled' },
        error: null,
      });

      const result = await ReverseLogisticsService.declineCandidate('rlc-001');
      expect(result.status).toBe('cancelled');
    });

    it('should throw for non-existent candidate', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'CANDIDATE_NOT_FOUND' },
      });

      await expect(
        ReverseLogisticsService.declineCandidate('rlc-missing')
      ).rejects.toThrow('declineCandidate failed');
    });
  });

  describe('expireCandidates', () => {
    it('should expire stale candidates and emit event', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { expired_count: 5 },
        error: null,
      });

      const result = await ReverseLogisticsService.expireCandidates();

      expect(result.expired_count).toBe(5);
      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'reverse_candidate_expired' })
      );
    });

    it('should not emit event when nothing expired', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { expired_count: 0 },
        error: null,
      });

      await ReverseLogisticsService.expireCandidates();
      expect(LogisticsEventService.emit).not.toHaveBeenCalled();
    });
  });

  describe('scanAndMatch', () => {
    it('should scan eligible trips and generate candidates', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });

      mockFrom.mockReturnValueOnce(chainable({
        data: [
          { id: 'ut-001', capacity_total_kg: 5000, capacity_used_kg: 2000, end_location: 'Mysuru' },
        ],
        error: null,
      }));

      mockRpc.mockResolvedValueOnce({
        data: {
          candidates: [
            { candidate_id: 'rlc-new-001', shipment_request_id: 'sr-v01', score: 75, weight_estimate_kg: 300 },
          ],
          count: 1,
          remaining_capacity_kg: 3000,
        },
        error: null,
      });

      const result = await ReverseLogisticsService.scanAndMatch();

      expect(result.trips_scanned).toBe(1);
      expect(result.candidates_created).toBe(1);
      expect(result.matches_made).toBe(1);
    });

    it('should handle empty eligible trips', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.scanAndMatch();

      expect(result.trips_scanned).toBe(0);
      expect(result.candidates_created).toBe(0);
    });

    it('should collect errors without failing entire scan', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });

      mockFrom.mockReturnValueOnce(chainable({
        data: [{ id: 'ut-err', capacity_total_kg: 5000, capacity_used_kg: 1000, end_location: 'Mandya' }],
        error: null,
      }));

      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'TRIP_NOT_FOUND' } });

      const result = await ReverseLogisticsService.scanAndMatch();

      expect(result.trips_scanned).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('matchVendorShipments', () => {
    it('should find vendor shipments matching trip end location', async () => {
      const trip = { id: 'ut-001', capacity_total_kg: 5000, capacity_used_kg: 2000, end_location: 'Mysuru' };
      const legs = [{ district_id: 'd-mysuru' }, { district_id: 'd-mysuru' }];
      const shipments = [
        { id: 'sr-v01', weight_estimate_kg: 500, shipment_type: 'agri_input', origin_district_id: 'd-mysuru' },
        { id: 'sr-v02', weight_estimate_kg: 200, shipment_type: 'general_goods', origin_district_id: 'd-mysuru' },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trip, error: null }))
        .mockReturnValueOnce(chainable({ data: legs, error: null }))
        .mockReturnValueOnce(chainable({ data: shipments, error: null }));

      const result = await ReverseLogisticsService.matchVendorShipments('ut-001');

      expect(result).toHaveLength(2);
      expect(result[0].shipment_id).toBe('sr-v01');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should return empty when no remaining capacity', async () => {
      const trip = { id: 'ut-full', capacity_total_kg: 5000, capacity_used_kg: 5000, end_location: 'Mysuru' };
      mockFrom.mockReturnValueOnce(chainable({ data: trip, error: null }));

      const result = await ReverseLogisticsService.matchVendorShipments('ut-full');
      expect(result).toHaveLength(0);
    });

    it('should return empty when no drop legs have districts', async () => {
      const trip = { id: 'ut-001', capacity_total_kg: 5000, capacity_used_kg: 1000, end_location: 'Mysuru' };
      const legs: unknown[] = [];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trip, error: null }))
        .mockReturnValueOnce(chainable({ data: legs, error: null }));

      const result = await ReverseLogisticsService.matchVendorShipments('ut-001');
      expect(result).toHaveLength(0);
    });

    it('should throw for non-existent trip', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        ReverseLogisticsService.matchVendorShipments('ut-missing')
      ).rejects.toThrow('Trip not found');
    });
  });

  describe('getOpportunities', () => {
    it('should list active reverse load opportunities', async () => {
      const candidates = [
        { id: 'rlc-001', status: 'identified', candidate_score: 85 },
        { id: 'rlc-002', status: 'offered', candidate_score: 60 },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: candidates, error: null }));

      const result = await ReverseLogisticsService.getOpportunities();
      expect(result).toHaveLength(2);
    });

    it('should filter by route cluster', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await ReverseLogisticsService.getOpportunities({ route_cluster_id: 'rc-001' });
      expect(mockFrom).toHaveBeenCalledWith('reverse_load_candidates');
    });

    it('should return empty when no opportunities', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.getOpportunities();
      expect(result).toHaveLength(0);
    });
  });
});
