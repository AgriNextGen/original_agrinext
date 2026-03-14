/**
 * Phase 2 — TripGenerationService tests
 *
 * Tests trip generation from load pools, multi-stop leg building,
 * vehicle assignment, and generation candidate discovery.
 *
 * Run with: vitest run tests/logistics/trip-generation-service.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

vi.mock('@/services/logistics/TripManagementService', () => ({
  TripManagementService: {
    createTrip: vi.fn().mockResolvedValue({ unified_trip_id: 'ut-gen-001' }),
  },
}));

vi.mock('@/services/logistics/VehicleCapacityService', () => ({
  VehicleCapacityService: {
    findBestVehicleForPool: vi.fn().mockResolvedValue([]),
  },
}));

import { TripGenerationService } from '@/services/logistics/TripGenerationService';
import { TripManagementService } from '@/services/logistics/TripManagementService';
import type { ShipmentRequest } from '@/services/logistics/types';

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

describe('TripGenerationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('buildTripLegs', () => {
    it('should create pickup legs then drop legs in lat order', () => {
      const shipments = [
        {
          id: 'sr-001', pickup_location: 'Farm A', pickup_geo_lat: 13.0, pickup_geo_long: 77.0,
          drop_location: 'Market X', drop_geo_lat: 12.5, drop_geo_long: 77.5,
          origin_district_id: 'd-001', dest_district_id: 'd-002',
        },
        {
          id: 'sr-002', pickup_location: 'Farm B', pickup_geo_lat: 12.8, pickup_geo_long: 77.1,
          drop_location: 'Market Y', drop_geo_lat: 12.9, drop_geo_long: 77.6,
          origin_district_id: 'd-001', dest_district_id: 'd-002',
        },
      ] as unknown as ShipmentRequest[];

      const legs = TripGenerationService.buildTripLegs(shipments);

      expect(legs).toHaveLength(4);

      const pickupLegs = legs.filter((l) => l.leg_type === 'pickup');
      const dropLegs = legs.filter((l) => l.leg_type === 'drop');
      expect(pickupLegs).toHaveLength(2);
      expect(dropLegs).toHaveLength(2);

      expect(pickupLegs[0].geo_lat).toBeLessThanOrEqual(pickupLegs[1].geo_lat!);
      expect(dropLegs[0].geo_lat).toBeLessThanOrEqual(dropLegs[1].geo_lat!);

      expect(legs[0].sequence_order).toBe(1);
      expect(legs[3].sequence_order).toBe(4);
    });

    it('should return empty array for no shipments', () => {
      const legs = TripGenerationService.buildTripLegs([]);
      expect(legs).toHaveLength(0);
    });

    it('should handle shipments with only pickup location', () => {
      const shipments = [
        { id: 'sr-001', pickup_location: 'Farm A', pickup_geo_lat: 13.0, pickup_geo_long: 77.0, drop_location: null, drop_geo_lat: null, drop_geo_long: null, origin_district_id: 'd-001', dest_district_id: null },
      ] as unknown as ShipmentRequest[];

      const legs = TripGenerationService.buildTripLegs(shipments);
      expect(legs).toHaveLength(1);
      expect(legs[0].leg_type).toBe('pickup');
    });

    it('should handle multi-stop route (3+ shipments)', () => {
      const shipments = [
        { id: 'sr-001', pickup_location: 'Farm A', pickup_geo_lat: 13.2, pickup_geo_long: 77.0, drop_location: 'Market', drop_geo_lat: 12.0, drop_geo_long: 77.5, origin_district_id: 'd-1', dest_district_id: 'd-2' },
        { id: 'sr-002', pickup_location: 'Farm B', pickup_geo_lat: 13.0, pickup_geo_long: 77.1, drop_location: 'Market', drop_geo_lat: 12.0, drop_geo_long: 77.5, origin_district_id: 'd-1', dest_district_id: 'd-2' },
        { id: 'sr-003', pickup_location: 'Farm C', pickup_geo_lat: 12.8, pickup_geo_long: 77.2, drop_location: 'Market', drop_geo_lat: 12.0, drop_geo_long: 77.5, origin_district_id: 'd-1', dest_district_id: 'd-2' },
      ] as unknown as ShipmentRequest[];

      const legs = TripGenerationService.buildTripLegs(shipments);
      expect(legs).toHaveLength(6);
      expect(legs.filter((l) => l.leg_type === 'pickup')).toHaveLength(3);
      expect(legs.filter((l) => l.leg_type === 'drop')).toHaveLength(3);
    });
  });

  describe('generateTripFromPool', () => {
    it('should create a trip from a valid pool', async () => {
      const pool = { id: 'lp-001', status: 'filling', total_weight_kg: 1200, dispatch_window_start: null, dispatch_window_end: null };
      const members = [{ id: 'lpm-001', load_pool_id: 'lp-001', shipment_request_id: 'sr-001', added_at: new Date().toISOString() }];
      const shipments = [{
        id: 'sr-001', pickup_location: 'Farm', pickup_geo_lat: 13.0, pickup_geo_long: 77.0,
        drop_location: 'Market', drop_geo_lat: 12.5, drop_geo_long: 77.5,
        origin_district_id: 'd-1', dest_district_id: 'd-2', weight_estimate_kg: 1200, status: 'pooled',
      }];
      const vehicle = { id: 'v-001', transporter_id: 't-001', capacity_kg: 5000, vehicle_type: 'truck' };

      mockFrom
        .mockReturnValueOnce(chainable({ data: pool, error: null }))
        .mockReturnValueOnce(chainable({ data: members, error: null }))
        .mockReturnValueOnce(chainable({ data: shipments, error: null }))
        .mockReturnValueOnce(chainable({ data: vehicle, error: null }));

      mockRpc.mockResolvedValueOnce({ data: { booking_id: 'b-001' }, error: null });

      const result = await TripGenerationService.generateTripFromPool('lp-001', 'v-001');

      expect(result.unified_trip_id).toBe('ut-gen-001');
      expect(result.vehicle_id).toBe('v-001');
      expect(result.legs_count).toBe(2);
      expect(result.bookings_count).toBe(1);
      expect(TripManagementService.createTrip).toHaveBeenCalledOnce();
    });

    it('should throw for non-existent pool', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        TripGenerationService.generateTripFromPool('lp-missing', 'v-001')
      ).rejects.toThrow('Load pool not found');
    });

    it('should throw for dispatched pool', async () => {
      const pool = { id: 'lp-done', status: 'dispatched', total_weight_kg: 1000 };
      mockFrom.mockReturnValueOnce(chainable({ data: pool, error: null }));

      await expect(
        TripGenerationService.generateTripFromPool('lp-done', 'v-001')
      ).rejects.toThrow('not eligible for trip generation');
    });

    it('should throw for pool with no members', async () => {
      const pool = { id: 'lp-empty', status: 'open', total_weight_kg: 0 };
      mockFrom
        .mockReturnValueOnce(chainable({ data: pool, error: null }))
        .mockReturnValueOnce(chainable({ data: [], error: null }));

      await expect(
        TripGenerationService.generateTripFromPool('lp-empty', 'v-001')
      ).rejects.toThrow('Load pool has no members');
    });
  });

  describe('assignVehicleToTrip', () => {
    it('should assign vehicle and return capacity', async () => {
      const vehicle = { id: 'v-001', transporter_id: 't-001', capacity_kg: 5000 };
      mockFrom
        .mockReturnValueOnce(chainable({ data: vehicle, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await TripGenerationService.assignVehicleToTrip('trip-001', 'v-001');

      expect(result.success).toBe(true);
      expect(result.capacity_allocated_kg).toBe(5000);
    });

    it('should throw for non-existent vehicle', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        TripGenerationService.assignVehicleToTrip('trip-001', 'v-missing')
      ).rejects.toThrow('not found');
    });
  });
});
