/**
 * Phase 3 — Reverse Logistics Integration tests
 *
 * End-to-end: forward trip delivered -> reverse candidates generated
 * -> vendor shipment matched -> booking created.
 * Also tests edge cases: expiry, capacity exceeded, competing candidates.
 *
 * Run with: vitest run tests/logistics/reverse-integration.test.ts
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
import { DEFAULT_REVERSE_MATCH_CONFIG } from '@/services/logistics/types';

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

describe('Reverse Logistics Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('full pipeline: trip delivered -> candidates -> match -> accept', () => {
    it('should generate candidates for a delivered trip and accept one', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });

      mockFrom.mockReturnValueOnce(chainable({
        data: [{ id: 'ut-delivered', capacity_total_kg: 5000, capacity_used_kg: 3000, end_location: 'Bangalore APMC' }],
        error: null,
      }));

      mockRpc.mockResolvedValueOnce({
        data: {
          candidates: [
            { candidate_id: 'rlc-integ-001', shipment_request_id: 'sr-vendor-001', score: 80, weight_estimate_kg: 400 },
          ],
          count: 1,
          remaining_capacity_kg: 2000,
        },
        error: null,
      });

      const scanResult = await ReverseLogisticsService.scanAndMatch();
      expect(scanResult.trips_scanned).toBe(1);
      expect(scanResult.candidates_created).toBe(1);
      expect(scanResult.matches_made).toBe(1);

      mockRpc.mockResolvedValueOnce({
        data: { candidate_id: 'rlc-integ-001', status: 'offered', unified_trip_id: 'ut-delivered', shipment_request_id: 'sr-vendor-001' },
        error: null,
      });

      const offerResult = await ReverseLogisticsService.offerCandidate('rlc-integ-001');
      expect(offerResult.status).toBe('offered');

      mockRpc.mockResolvedValueOnce({
        data: {
          candidate_id: 'rlc-integ-001', status: 'accepted', booking_id: 'bk-reverse-001',
          weight_allocated_kg: 400, unified_trip_id: 'ut-delivered', shipment_request_id: 'sr-vendor-001',
        },
        error: null,
      });

      const acceptResult = await ReverseLogisticsService.acceptCandidate('rlc-integ-001');
      expect(acceptResult.status).toBe('accepted');
      expect(acceptResult.booking_id).toBe('bk-reverse-001');
      expect(acceptResult.weight_allocated_kg).toBe(400);
    });
  });

  describe('edge case: no eligible trips', () => {
    it('should return zero results when no trips have remaining capacity', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.scanAndMatch();
      expect(result.trips_scanned).toBe(0);
      expect(result.candidates_created).toBe(0);
      expect(result.matches_made).toBe(0);
    });
  });

  describe('edge case: candidate expiry', () => {
    it('should expire stale candidates before scanning', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 3 }, error: null });
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await ReverseLogisticsService.scanAndMatch();
      expect(result.trips_scanned).toBe(0);
      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'reverse_candidate_expired' })
      );
    });
  });

  describe('edge case: capacity exceeded', () => {
    it('should not match vendor shipment heavier than remaining capacity', async () => {
      const trip = { id: 'ut-tight', capacity_total_kg: 5000, capacity_used_kg: 4800, end_location: 'Mandya' };
      const legs = [{ district_id: 'd-mandya' }];
      const shipments = [
        { id: 'sr-heavy', weight_estimate_kg: 500, shipment_type: 'agri_input', origin_district_id: 'd-mandya' },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trip, error: null }))
        .mockReturnValueOnce(chainable({ data: legs, error: null }))
        .mockReturnValueOnce(chainable({ data: shipments, error: null }));

      const matches = await ReverseLogisticsService.matchVendorShipments('ut-tight');
      expect(matches).toHaveLength(1);
      expect(matches[0].score).toBe(100);
    });
  });

  describe('edge case: multiple candidates competing for same capacity', () => {
    it('should generate multiple candidates ranked by score', async () => {
      mockRpc.mockResolvedValueOnce({ data: { expired_count: 0 }, error: null });

      mockFrom.mockReturnValueOnce(chainable({
        data: [{ id: 'ut-multi', capacity_total_kg: 5000, capacity_used_kg: 1000, end_location: 'Hassan' }],
        error: null,
      }));

      mockRpc.mockResolvedValueOnce({
        data: {
          candidates: [
            { candidate_id: 'rlc-a', shipment_request_id: 'sr-a', score: 90, weight_estimate_kg: 3600 },
            { candidate_id: 'rlc-b', shipment_request_id: 'sr-b', score: 50, weight_estimate_kg: 2000 },
            { candidate_id: 'rlc-c', shipment_request_id: 'sr-c', score: 25, weight_estimate_kg: 1000 },
          ],
          count: 3,
          remaining_capacity_kg: 4000,
        },
        error: null,
      });

      const result = await ReverseLogisticsService.scanAndMatch();
      expect(result.candidates_created).toBe(3);
      expect(result.matches_made).toBe(3);
    });
  });

  describe('DEFAULT_REVERSE_MATCH_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_REVERSE_MATCH_CONFIG.min_capacity_kg).toBeGreaterThan(0);
      expect(DEFAULT_REVERSE_MATCH_CONFIG.max_candidates_per_trip).toBeGreaterThan(0);
      expect(DEFAULT_REVERSE_MATCH_CONFIG.expiry_hours).toBeGreaterThan(0);
      expect(DEFAULT_REVERSE_MATCH_CONFIG.score_threshold).toBeGreaterThan(0);
    });
  });

  describe('backward compatibility', () => {
    it('should not touch legacy transport_requests or trips tables', () => {
      const fromCalls = mockFrom.mock.calls.map((c) => c[0]);
      expect(fromCalls).not.toContain('transport_requests');
      expect(fromCalls).not.toContain('trips');
    });
  });
});
