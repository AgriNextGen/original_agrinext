/**
 * Phase 2 — LogisticsMatchingEngine tests
 *
 * Tests the full matching cycle, single-shipment matching,
 * matching status, and edge cases (empty state, no vehicles).
 *
 * Run with: vitest run tests/logistics/matching-engine.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

vi.mock('@/services/logistics/LoadPoolingService', () => ({
  LoadPoolingService: {
    clusterPendingShipments: vi.fn().mockResolvedValue([]),
    listPools: vi.fn().mockResolvedValue([]),
    autoFillPool: vi.fn().mockResolvedValue({ added: 0, shipment_ids: [] }),
    findPoolableShipments: vi.fn().mockResolvedValue([]),
    createPool: vi.fn().mockResolvedValue({ load_pool_id: 'lp-new-001' }),
    addShipment: vi.fn().mockResolvedValue({ success: true, load_pool_id: 'lp-new-001' }),
    getDispatchReadyPools: vi.fn().mockResolvedValue([]),
    evaluatePoolReadiness: vi.fn().mockResolvedValue({ is_ready: false }),
  },
}));

vi.mock('@/services/logistics/VehicleCapacityService', () => ({
  VehicleCapacityService: {
    findBestVehicleForPool: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/logistics/TripGenerationService', () => ({
  TripGenerationService: {
    generateTripFromPool: vi.fn().mockResolvedValue({
      unified_trip_id: 'ut-gen-001',
      vehicle_id: 'v-001',
      legs_count: 2,
      bookings_count: 1,
      total_weight_kg: 1200,
    }),
  },
}));

vi.mock('@/services/logistics/LogisticsEventService', () => ({
  LogisticsEventService: {
    emit: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/logistics/ReverseLogisticsService', () => ({
  ReverseLogisticsService: {
    scanAndMatch: vi.fn().mockResolvedValue({
      trips_scanned: 0, candidates_created: 0, matches_made: 0, bookings_created: 0, errors: [],
    }),
    findCandidates: vi.fn().mockResolvedValue({ candidates: [], count: 0, remaining_capacity_kg: 0 }),
    getEligibleReturnTrips: vi.fn().mockResolvedValue([]),
    expireCandidates: vi.fn().mockResolvedValue({ expired_count: 0 }),
  },
}));

import { LogisticsMatchingEngine } from '@/services/logistics/LogisticsMatchingEngine';
import { LoadPoolingService } from '@/services/logistics/LoadPoolingService';
import { VehicleCapacityService } from '@/services/logistics/VehicleCapacityService';
import { TripGenerationService } from '@/services/logistics/TripGenerationService';
import { LogisticsEventService } from '@/services/logistics/LogisticsEventService';
import { ReverseLogisticsService } from '@/services/logistics/ReverseLogisticsService';

function chainable(result: { data: unknown; error: unknown; count?: number }) {
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
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb({ ...result, count: result.count ?? 0 })));
  return chain;
}

describe('LogisticsMatchingEngine', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('runMatchingCycle', () => {
    it('should complete a cycle with no pending shipments', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: { id: 'run-001' }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LogisticsMatchingEngine.runMatchingCycle();

      expect(result.run_id).toBe('run-001');
      expect(result.shipments_processed).toBe(0);
      expect(result.pools_created).toBe(0);
      expect(result.trips_generated).toBe(0);
      expect(result.bookings_created).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(LogisticsEventService.emit).toHaveBeenCalled();
    });

    it('should process clusters and generate trips when pools are ready', async () => {
      const clusters = [{
        route_cluster_id: 'rc-001',
        shipments: [{ id: 'sr-001', weight_estimate_kg: 500 }, { id: 'sr-002', weight_estimate_kg: 700 }],
        total_weight_kg: 1200,
        pickup_window_start: '2026-03-15T06:00:00Z',
        pickup_window_end: '2026-03-15T18:00:00Z',
      }];

      vi.mocked(LoadPoolingService.clusterPendingShipments).mockResolvedValueOnce(clusters as never);

      vi.mocked(LoadPoolingService.listPools).mockResolvedValueOnce([]);
      vi.mocked(LoadPoolingService.findPoolableShipments).mockResolvedValueOnce([
        { id: 'sr-001', weight_estimate_kg: 500 },
        { id: 'sr-002', weight_estimate_kg: 700 },
      ] as never);

      const readyPool = { id: 'lp-001', total_weight_kg: 1200, total_volume_cbm: 0, member_count: 2 };
      vi.mocked(LoadPoolingService.getDispatchReadyPools).mockResolvedValueOnce([readyPool] as never);

      vi.mocked(VehicleCapacityService.findBestVehicleForPool).mockResolvedValueOnce([
        { vehicle_id: 'v-001', transporter_id: 't-001', vehicle_type: 'truck', capacity_kg: 5000, capacity_volume_cbm: null, registration_number: 'KA-01', fit_score: 0.24 },
      ]);

      mockFrom
        .mockReturnValueOnce(chainable({ data: { id: 'run-002' }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LogisticsMatchingEngine.runMatchingCycle();

      expect(result.shipments_processed).toBe(2);
      expect(result.trips_generated).toBe(1);
      expect(result.bookings_created).toBe(1);
      expect(TripGenerationService.generateTripFromPool).toHaveBeenCalledWith('lp-001', 'v-001');
    });

    it('should record error when no vehicle available for pool', async () => {
      vi.mocked(LoadPoolingService.clusterPendingShipments).mockResolvedValueOnce([]);

      const readyPool = { id: 'lp-no-veh', total_weight_kg: 50000, total_volume_cbm: 0, member_count: 5 };
      vi.mocked(LoadPoolingService.getDispatchReadyPools).mockResolvedValueOnce([readyPool] as never);
      vi.mocked(VehicleCapacityService.findBestVehicleForPool).mockResolvedValueOnce([]);

      mockFrom
        .mockReturnValueOnce(chainable({ data: { id: 'run-003' }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LogisticsMatchingEngine.runMatchingCycle();

      expect(result.trips_generated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('no vehicle available');
    });
  });

  describe('matchSingleShipment', () => {
    it('should add shipment to existing open pool', async () => {
      const shipment = { id: 'sr-010', route_cluster_id: 'rc-001', weight_estimate_kg: 300, status: 'pending' };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      vi.mocked(LoadPoolingService.listPools)
        .mockResolvedValueOnce([{ id: 'lp-existing', capacity_target_kg: 5000, total_weight_kg: 1000 }] as never)
        .mockResolvedValueOnce([]);

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-010');

      expect(result.pooled).toBe(true);
      expect(result.pool_id).toBe('lp-existing');
      expect(LoadPoolingService.addShipment).toHaveBeenCalledWith('sr-010', 'lp-existing');
    });

    it('should create new pool when no existing pool fits', async () => {
      const shipment = { id: 'sr-011', route_cluster_id: 'rc-002', weight_estimate_kg: 8000, status: 'pending' };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      vi.mocked(LoadPoolingService.listPools)
        .mockResolvedValueOnce([{ id: 'lp-full', capacity_target_kg: 5000, total_weight_kg: 4900 }] as never)
        .mockResolvedValueOnce([]);

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-011');

      expect(result.pooled).toBe(true);
      expect(result.pool_id).toBe('lp-new-001');
      expect(LoadPoolingService.createPool).toHaveBeenCalled();
    });

    it('should return not-pooled for non-pending shipment', async () => {
      const shipment = { id: 'sr-012', route_cluster_id: 'rc-001', weight_estimate_kg: 300, status: 'booked' };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-012');
      expect(result.pooled).toBe(false);
      expect(result.pool_id).toBeNull();
    });

    it('should return not-pooled for shipment without route cluster', async () => {
      const shipment = { id: 'sr-013', route_cluster_id: null, weight_estimate_kg: 300, status: 'pending' };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-013');
      expect(result.pooled).toBe(false);
    });

    it('should throw for non-existent shipment', async () => {
      mockFrom.mockReturnValueOnce(chainable({ data: null, error: null }));

      await expect(
        LogisticsMatchingEngine.matchSingleShipment('sr-missing')
      ).rejects.toThrow('Shipment not found');
    });
  });

  describe('reverse scan integration', () => {
    it('should call ReverseLogisticsService.scanAndMatch during matching cycle', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: { id: 'run-rev' }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      await LogisticsMatchingEngine.runMatchingCycle();

      expect(ReverseLogisticsService.scanAndMatch).toHaveBeenCalledOnce();
    });

    it('should capture reverse scan errors without failing the cycle', async () => {
      vi.mocked(ReverseLogisticsService.scanAndMatch).mockResolvedValueOnce({
        trips_scanned: 2, candidates_created: 1, matches_made: 0, bookings_created: 0,
        errors: ['Trip ut-err: TRIP_NOT_FOUND'],
      });

      mockFrom
        .mockReturnValueOnce(chainable({ data: { id: 'run-rev2' }, error: null }))
        .mockReturnValueOnce(chainable({ data: null, error: null }));

      const result = await LogisticsMatchingEngine.runMatchingCycle();

      expect(result.errors.some((e) => e.includes('Reverse'))).toBe(true);
    });
  });

  describe('getMatchingStatus', () => {
    it('should return status summary', async () => {
      mockFrom
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 5 }))
        .mockReturnValueOnce(chainable({ data: null, error: null, count: 2 }))
        .mockReturnValueOnce(chainable({ data: { id: 'run-last', status: 'completed', shipments_processed: 10 }, error: null }));

      vi.mocked(LoadPoolingService.getDispatchReadyPools).mockResolvedValueOnce([{ id: 'lp-ready' }] as never);

      const status = await LogisticsMatchingEngine.getMatchingStatus();

      expect(status.pending_shipments).toBe(5);
      expect(status.open_pools).toBe(2);
      expect(status.ready_pools).toBe(1);
      expect(status.last_run).not.toBeNull();
    });
  });
});
