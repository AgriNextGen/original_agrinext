/**
 * Phase 2 — VehicleCapacityService tests
 *
 * Tests vehicle querying, capacity allocation, release,
 * over-booking prevention, and best-vehicle ranking.
 *
 * Run with: vitest run tests/logistics/vehicle-capacity-service.test.ts
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

import { VehicleCapacityService } from '@/services/logistics/VehicleCapacityService';
import { LogisticsEventService } from '@/services/logistics/LogisticsEventService';

function chainable(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.update = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.gte = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('VehicleCapacityService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('getAvailableVehicles', () => {
    it('should return vehicles meeting minimum capacity', async () => {
      const vehicles = [
        { id: 'v-001', transporter_id: 't-001', vehicle_type: 'truck', capacity_kg: 5000, registration_number: 'KA-01-AB-1234' },
        { id: 'v-002', transporter_id: 't-002', vehicle_type: 'truck', capacity_kg: 8000, registration_number: 'KA-01-CD-5678' },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: vehicles, error: null }));

      const result = await VehicleCapacityService.getAvailableVehicles({ min_capacity_kg: 3000 });

      expect(result).toHaveLength(2);
      expect(result[0].vehicle_id).toBe('v-001');
      expect(result[0].capacity_kg).toBe(5000);
    });

    it('should return empty array when no vehicles match', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: [], error: null }));

      const result = await VehicleCapacityService.getAvailableVehicles({ min_capacity_kg: 50000 });
      expect(result).toHaveLength(0);
    });

    it('should throw on query error', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: { message: 'db error' } }));

      await expect(
        VehicleCapacityService.getAvailableVehicles({ min_capacity_kg: 1000 })
      ).rejects.toThrow('getAvailableVehicles failed');
    });
  });

  describe('allocateCapacity', () => {
    it('should deduct weight from capacity block via RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { block_id: 'vcb-001', trip_id: 'trip-001', weight_allocated_kg: 1500, volume_allocated_cbm: 0, remaining_weight_kg: 3500, remaining_volume_cbm: null },
        error: null,
      });

      const result = await VehicleCapacityService.allocateCapacity('trip-001', 1500);

      expect(result.weight_allocated_kg).toBe(1500);
      expect(result.remaining_weight_kg).toBe(3500);
      expect(mockRpc).toHaveBeenCalledWith('allocate_vehicle_capacity_v1', {
        p_trip_id: 'trip-001', p_weight_kg: 1500, p_volume_cbm: 0,
      });
    });

    it('should reject when weight exceeds remaining capacity', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INSUFFICIENT_CAPACITY: requested 1000 kg but insufficient remaining' },
      });

      await expect(
        VehicleCapacityService.allocateCapacity('trip-001', 1000)
      ).rejects.toThrow('Insufficient capacity');
    });

    it('should reject when volume exceeds remaining capacity', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'INSUFFICIENT_CAPACITY: requested 5 kg but insufficient remaining' },
      });

      await expect(
        VehicleCapacityService.allocateCapacity('trip-001', 100, 5)
      ).rejects.toThrow('Insufficient capacity');
    });

    it('should throw when no capacity block exists', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'NO_CAPACITY_BLOCK: no capacity block found for trip trip-missing' },
      });

      await expect(
        VehicleCapacityService.allocateCapacity('trip-missing', 100)
      ).rejects.toThrow('No capacity block found');
    });
  });

  describe('releaseCapacity', () => {
    it('should add weight back to capacity block via RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { block_id: 'vcb-001', trip_id: 'trip-001', weight_released_kg: 500, volume_released_cbm: 0, remaining_weight_kg: 3500, remaining_volume_cbm: null },
        error: null,
      });

      const result = await VehicleCapacityService.releaseCapacity('trip-001', 500);

      expect(result.remaining_weight_kg).toBe(3500);
      expect(result.weight_allocated_kg).toBe(-500);
      expect(mockRpc).toHaveBeenCalledWith('release_vehicle_capacity_v1', {
        p_trip_id: 'trip-001', p_weight_kg: 500, p_volume_cbm: 0,
      });
    });

    it('should throw when no capacity block exists', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'NO_CAPACITY_BLOCK: no capacity block found for trip trip-missing' },
      });

      await expect(
        VehicleCapacityService.releaseCapacity('trip-missing', 100)
      ).rejects.toThrow('No capacity block found');
    });
  });

  describe('getCapacityBlock', () => {
    it('should return the latest capacity block for a trip', async () => {
      const block = { id: 'vcb-001', unified_trip_id: 'trip-001', remaining_weight_kg: 4000, remaining_volume_cbm: 10 };
      mockFrom.mockReturnValueOnce(chainable({ data: block, error: null }));

      const result = await VehicleCapacityService.getCapacityBlock('trip-001');
      expect(result).not.toBeNull();
      expect(result!.remaining_weight_kg).toBe(4000);
    });

    it('should return null when no block exists', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await VehicleCapacityService.getCapacityBlock('trip-none');
      expect(result).toBeNull();
    });
  });

  describe('findBestVehicleForPool', () => {
    it('should rank vehicles by fit score (best fit first)', async () => {
      const vehicles = [
        { id: 'v-small', transporter_id: 't-1', vehicle_type: 'truck', capacity_kg: 2000, registration_number: 'KA-01' },
        { id: 'v-big', transporter_id: 't-2', vehicle_type: 'truck', capacity_kg: 10000, registration_number: 'KA-02' },
      ];
      mockFrom.mockReturnValueOnce(chainable({ data: vehicles, error: null }));

      const result = await VehicleCapacityService.findBestVehicleForPool({
        total_weight_kg: 1800,
        total_volume_cbm: 0,
      });

      expect(result).toHaveLength(2);
      expect(result[0].vehicle_id).toBe('v-small');
      expect(result[0].fit_score).toBeGreaterThan(result[1].fit_score);
    });

    it('should return empty for zero-weight pool', async () => {
      const result = await VehicleCapacityService.findBestVehicleForPool({
        total_weight_kg: 0,
        total_volume_cbm: 0,
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('capacity events', () => {
    it('should emit capacity_allocated event after allocation', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { block_id: 'vcb-evt', trip_id: 'trip-evt', weight_allocated_kg: 1000, volume_allocated_cbm: 0, remaining_weight_kg: 4000, remaining_volume_cbm: null },
        error: null,
      });

      await VehicleCapacityService.allocateCapacity('trip-evt', 1000);

      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'capacity_allocated', entity_id: 'vcb-evt' })
      );
    });

    it('should emit capacity_released event after release', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { block_id: 'vcb-rel', trip_id: 'trip-rel', weight_released_kg: 500, volume_released_cbm: 0, remaining_weight_kg: 3500, remaining_volume_cbm: null },
        error: null,
      });

      await VehicleCapacityService.releaseCapacity('trip-rel', 500);

      expect(LogisticsEventService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'capacity_released', entity_id: 'vcb-rel' })
      );
    });
  });
});
