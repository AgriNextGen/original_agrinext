/**
 * Phase 4: Transport Dashboard Upgrade Tests
 *
 * Tests the unified logistics hooks and component data flow
 * for forward trips, reverse loads, capacity, and earnings.
 *
 * Run with: vitest run tests/logistics/transport-dashboard-phase4.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const mockRpc = vi.fn();
  const mockFrom = vi.fn();
  return {
    supabase: { rpc: mockRpc, from: mockFrom },
    __mockRpc: mockRpc,
    __mockFrom: mockFrom,
  };
});

import { supabase } from '@/integrations/supabase/client';
import { TripManagementService } from '@/services/logistics/TripManagementService';
import { ReverseLogisticsService } from '@/services/logistics/ReverseLogisticsService';
import { VehicleCapacityService } from '@/services/logistics/VehicleCapacityService';

const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

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

describe('Transport Dashboard Phase 4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Forward Trips ───────────────────────────────────────────

  describe('Forward Trips View', () => {
    it('should list forward trips filtered by direction', async () => {
      const trips = [
        { id: 'ut-001', trip_status: 'accepted', trip_direction: 'forward', capacity_total_kg: 5000, capacity_used_kg: 1000 },
        { id: 'ut-002', trip_status: 'in_transit', trip_direction: 'return', capacity_total_kg: 3000, capacity_used_kg: 500 },
        { id: 'ut-003', trip_status: 'planned', trip_direction: 'forward', capacity_total_kg: 4000, capacity_used_kg: 0 },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const all = await TripManagementService.listTrips({ transporter_id: 'test-user-001' });
      const forwardOnly = all.filter((t) => t.trip_direction === 'forward');

      expect(forwardOnly).toHaveLength(2);
      expect(forwardOnly.every((t) => t.trip_direction === 'forward')).toBe(true);
    });

    it('should handle empty forward trips gracefully', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const all = await TripManagementService.listTrips({ transporter_id: 'test-user-001' });
      expect(all).toHaveLength(0);
    });
  });

  // ── Reverse Load Opportunities ─────────────────────────────

  describe('Reverse Load Opportunities', () => {
    it('should list reverse load candidates with identified/offered status', async () => {
      const candidates = [
        { id: 'rlc-001', status: 'identified', candidate_score: 85, available_capacity_kg: 2000 },
        { id: 'rlc-002', status: 'offered', candidate_score: 72, available_capacity_kg: 1500 },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: candidates, error: null }));

      const result = await ReverseLogisticsService.getOpportunities();

      expect(result).toHaveLength(2);
      expect(result[0].candidate_score).toBeGreaterThan(result[1].candidate_score);
    });

    it('should accept a reverse load candidate via RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          candidate_id: 'rlc-001',
          status: 'accepted',
          booking_id: 'sb-001',
          weight_allocated_kg: 1500,
          unified_trip_id: 'ut-001',
          shipment_request_id: 'sr-001',
        },
        error: null,
      });

      const eventChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'evt-001' }, error: null }),
          }),
        }),
      };
      mockFrom.mockReturnValue(eventChain);

      const result = await ReverseLogisticsService.acceptCandidate('rlc-001');

      expect(result.status).toBe('accepted');
      expect(result.booking_id).toBe('sb-001');
      expect(result.weight_allocated_kg).toBe(1500);
    });

    it('should handle expired candidate gracefully', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          candidate_id: 'rlc-expired',
          status: 'expired',
          booking_id: null,
          weight_allocated_kg: 0,
          unified_trip_id: 'ut-001',
          shipment_request_id: null,
          error: 'CANDIDATE_EXPIRED',
        },
        error: null,
      });

      const eventChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'evt-002' }, error: null }),
          }),
        }),
      };
      mockFrom.mockReturnValue(eventChain);

      await expect(
        ReverseLogisticsService.acceptCandidate('rlc-expired')
      ).rejects.toThrow('CANDIDATE_EXPIRED');
    });

    it('should decline a reverse load candidate', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { candidate_id: 'rlc-003', status: 'cancelled' },
        error: null,
      });

      const result = await ReverseLogisticsService.declineCandidate('rlc-003');

      expect(result.status).toBe('cancelled');
    });
  });

  // ── Vehicle Capacity ────────────────────────────────────────

  describe('Vehicle Capacity View', () => {
    it('should return capacity block for a trip', async () => {
      const block = {
        id: 'vcb-001',
        unified_trip_id: 'ut-001',
        remaining_weight_kg: 3000,
        remaining_volume_cbm: null,
      };

      mockFrom.mockReturnValueOnce(chainable({ data: block, error: null }));

      const result = await VehicleCapacityService.getCapacityBlock('ut-001');

      expect(result).not.toBeNull();
      expect(result!.remaining_weight_kg).toBe(3000);
    });

    it('should return null when no capacity block exists', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await VehicleCapacityService.getCapacityBlock('nonexistent');

      expect(result).toBeNull();
    });

    it('should calculate remaining capacity from trip data', async () => {
      const trip = {
        capacity_total_kg: 5000,
        capacity_used_kg: 1200,
        capacity_total_cbm: null,
        capacity_used_cbm: 0,
      };

      mockFrom.mockReturnValueOnce(chainable({ data: trip, error: null }));

      const result = await TripManagementService.getRemainingCapacity('ut-001');

      expect(result.remaining_weight_kg).toBe(3800);
    });
  });

  // ── Trip Detail with Legs ───────────────────────────────────

  describe('Unified Trip Detail', () => {
    it('should return trip with legs, capacity blocks, and bookings', async () => {
      const trip = {
        id: 'ut-001',
        trip_status: 'in_transit',
        trip_direction: 'forward',
        transporter_id: 'test-user-001',
        capacity_total_kg: 5000,
        capacity_used_kg: 2000,
        start_location: 'Hunsuru',
        end_location: 'Mysuru Mandi',
        estimated_earnings_inr: 1500,
        actual_earnings_inr: 0,
      };

      const legs = [
        { id: 'tl-001', sequence_order: 1, leg_type: 'pickup', status: 'completed', location_name: 'Hunsuru Village' },
        { id: 'tl-002', sequence_order: 2, leg_type: 'waypoint', status: 'in_progress', location_name: 'Nanjangud' },
        { id: 'tl-003', sequence_order: 3, leg_type: 'drop', status: 'pending', location_name: 'Mysuru Mandi' },
      ];

      const capacityBlocks = [{ id: 'vcb-001', remaining_weight_kg: 3000 }];
      const bookings = [
        { id: 'sb-001', booking_status: 'confirmed', weight_allocated_kg: 1000 },
        { id: 'sb-002', booking_status: 'in_transit', weight_allocated_kg: 1000 },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trip, error: null }))
        .mockReturnValueOnce(chainable({ data: legs, error: null }))
        .mockReturnValueOnce(chainable({ data: capacityBlocks, error: null }))
        .mockReturnValueOnce(chainable({ data: bookings, error: null }));

      const result = await TripManagementService.getTripDetail('ut-001');

      expect(result.trip.trip_direction).toBe('forward');
      expect(result.legs).toHaveLength(3);
      expect(result.legs[0].leg_type).toBe('pickup');
      expect(result.legs[0].status).toBe('completed');
      expect(result.legs[1].leg_type).toBe('waypoint');
      expect(result.bookings).toHaveLength(2);
    });
  });

  // ── Earnings ────────────────────────────────────────────────

  describe('Earnings Summary', () => {
    it('should compute forward and reverse earnings from trip data', async () => {
      const trips = [
        { id: 'ut-001', trip_direction: 'forward', trip_status: 'completed', estimated_earnings_inr: 1500, actual_earnings_inr: 1400 },
        { id: 'ut-002', trip_direction: 'forward', trip_status: 'completed', estimated_earnings_inr: 2000, actual_earnings_inr: 0 },
        { id: 'ut-003', trip_direction: 'return', trip_status: 'completed', estimated_earnings_inr: 800, actual_earnings_inr: 750 },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const all = await TripManagementService.listTrips({ transporter_id: 'test-user-001' });

      let forwardEarnings = 0;
      let reverseEarnings = 0;

      for (const t of all) {
        const ext = t as typeof t & { estimated_earnings_inr?: number; actual_earnings_inr?: number };
        const earning = (ext.actual_earnings_inr ?? 0) > 0 ? ext.actual_earnings_inr! : (ext.estimated_earnings_inr ?? 0);
        if (t.trip_direction === 'return') {
          reverseEarnings += earning;
        } else {
          forwardEarnings += earning;
        }
      }

      expect(forwardEarnings).toBe(1400 + 2000);
      expect(reverseEarnings).toBe(750);
      expect(forwardEarnings + reverseEarnings).toBe(4150);
    });

    it('should handle trips with no earnings data', async () => {
      const trips = [
        { id: 'ut-001', trip_direction: 'forward', trip_status: 'accepted' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const all = await TripManagementService.listTrips({ transporter_id: 'test-user-001' });

      const totalEarnings = all.reduce((acc, t) => {
        const ext = t as typeof t & { estimated_earnings_inr?: number; actual_earnings_inr?: number };
        return acc + ((ext.actual_earnings_inr ?? 0) > 0 ? ext.actual_earnings_inr! : (ext.estimated_earnings_inr ?? 0));
      }, 0);

      expect(totalEarnings).toBe(0);
    });
  });

  // ── Dashboard Counts ────────────────────────────────────────

  describe('Dashboard Counts', () => {
    it('should compute unified dashboard metrics', async () => {
      const trips = [
        { id: 'ut-001', trip_status: 'accepted', trip_direction: 'forward' },
        { id: 'ut-002', trip_status: 'in_transit', trip_direction: 'forward' },
        { id: 'ut-003', trip_status: 'completed', trip_direction: 'forward' },
        { id: 'ut-004', trip_status: 'accepted', trip_direction: 'return' },
      ];
      const reverseLoads = [
        { id: 'rlc-001', status: 'identified' },
        { id: 'rlc-002', status: 'offered' },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trips, error: null }))
        .mockReturnValueOnce(chainable({ data: reverseLoads, error: null }));

      const allTrips = await TripManagementService.listTrips({ transporter_id: 'test-user-001' });
      const opportunities = await ReverseLogisticsService.getOpportunities();

      const activeStatuses = ['assigned', 'accepted', 'en_route', 'pickup_done', 'in_transit'];
      const completedStatuses = ['delivered', 'completed'];

      const activeCount = allTrips.filter((t) => activeStatuses.includes(t.trip_status)).length;
      const forwardCount = allTrips.filter((t) => t.trip_direction === 'forward' && activeStatuses.includes(t.trip_status)).length;
      const completedCount = allTrips.filter((t) => completedStatuses.includes(t.trip_status)).length;

      expect(activeCount).toBe(3);
      expect(forwardCount).toBe(2);
      expect(completedCount).toBe(1);
      expect(opportunities).toHaveLength(2);
    });
  });

  // ── Error Handling ──────────────────────────────────────────

  describe('Error Handling', () => {
    it('should propagate service errors to calling hook', async () => {
      mockFrom.mockReturnValueOnce(chainable({
        data: null,
        error: { message: 'Network timeout' },
      }));

      await expect(
        TripManagementService.listTrips({ transporter_id: 'test-user-001' })
      ).rejects.toThrow('listTrips failed');
    });

    it('should handle RPC errors for reverse load accept', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error: function not found' },
      });

      await expect(
        ReverseLogisticsService.acceptCandidate('rlc-001')
      ).rejects.toThrow('acceptCandidate failed');
    });
  });
});
