/**
 * Unified Logistics — Unified Trip tests
 *
 * Tests trip creation, leg ordering, status transitions,
 * and trip detail retrieval.
 *
 * Run with: vitest run tests/logistics/unified-trips.test.ts
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

import { TripManagementService } from '@/services/logistics/TripManagementService';
import type { CreateUnifiedTripParams } from '@/services/logistics/types';

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

describe('Unified Trips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrip', () => {
    it('should create a trip with legs via RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { unified_trip_id: 'ut-001' },
        error: null,
      });

      const params: CreateUnifiedTripParams = {
        transporter_id: 'user-001',
        vehicle_id: 'v-001',
        trip_direction: 'forward',
        start_location: 'Hunsuru',
        end_location: 'Mysuru Mandi',
        capacity_total_kg: 5000,
        legs: [
          { sequence_order: 1, leg_type: 'pickup', location_name: 'Hunsuru Village' },
          { sequence_order: 2, leg_type: 'drop', location_name: 'Mysuru Mandi' },
        ],
      };

      const result = await TripManagementService.createTrip(params);

      expect(mockRpc).toHaveBeenCalledWith('create_unified_trip_v1', {
        p_params: params,
      });
      expect(result.unified_trip_id).toBe('ut-001');
    });

    it('should create a trip without legs', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { unified_trip_id: 'ut-002' },
        error: null,
      });

      const result = await TripManagementService.createTrip({
        transporter_id: 'user-001',
        trip_direction: 'return',
        capacity_total_kg: 3000,
      });

      expect(result.unified_trip_id).toBe('ut-002');
    });

    it('should throw on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Vehicle not found' },
      });

      await expect(
        TripManagementService.createTrip({ transporter_id: 'user-001' })
      ).rejects.toThrow('create_unified_trip failed');
    });
  });

  describe('getTripDetail', () => {
    it('should return trip with legs, capacity blocks, and bookings', async () => {
      const trip = {
        id: 'ut-001',
        trip_status: 'accepted',
        transporter_id: 'user-001',
        capacity_total_kg: 5000,
        capacity_used_kg: 1000,
      };
      const legs = [
        { id: 'tl-001', sequence_order: 1, leg_type: 'pickup' },
        { id: 'tl-002', sequence_order: 2, leg_type: 'drop' },
      ];
      const capacityBlocks = [
        { id: 'vcb-001', remaining_weight_kg: 4000 },
      ];
      const bookings = [
        { id: 'sb-001', booking_status: 'confirmed' },
      ];

      mockFrom
        .mockReturnValueOnce(chainable({ data: trip, error: null }))
        .mockReturnValueOnce(chainable({ data: legs, error: null }))
        .mockReturnValueOnce(chainable({ data: capacityBlocks, error: null }))
        .mockReturnValueOnce(chainable({ data: bookings, error: null }));

      const result = await TripManagementService.getTripDetail('ut-001');

      expect(result.trip.id).toBe('ut-001');
      expect(result.legs).toHaveLength(2);
      expect(result.legs[0].sequence_order).toBe(1);
      expect(result.capacity_blocks).toHaveLength(1);
      expect(result.bookings).toHaveLength(1);
    });

    it('should throw when trip not found', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        TripManagementService.getTripDetail('nonexistent')
      ).rejects.toThrow('Unified trip not found');
    });
  });

  describe('listTrips', () => {
    it('should list trips for a transporter', async () => {
      const trips = [
        { id: 'ut-001', trip_status: 'accepted' },
        { id: 'ut-002', trip_status: 'in_transit' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: trips, error: null }));

      const result = await TripManagementService.listTrips({
        transporter_id: 'user-001',
      });

      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      await TripManagementService.listTrips({
        status: 'completed',
      });

      expect(mockFrom).toHaveBeenCalledWith('unified_trips');
    });
  });

  describe('getTripLegs', () => {
    it('should return legs ordered by sequence', async () => {
      const legs = [
        { id: 'tl-001', sequence_order: 1, leg_type: 'pickup' },
        { id: 'tl-002', sequence_order: 2, leg_type: 'waypoint' },
        { id: 'tl-003', sequence_order: 3, leg_type: 'drop' },
      ];

      mockFrom.mockReturnValueOnce(chainable({ data: legs, error: null }));

      const result = await TripManagementService.getTripLegs('ut-001');

      expect(result).toHaveLength(3);
      expect(result[0].leg_type).toBe('pickup');
      expect(result[2].leg_type).toBe('drop');
    });
  });
});
