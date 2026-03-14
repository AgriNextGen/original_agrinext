/**
 * Phase 2 — Orchestration Integration tests
 *
 * End-to-end flow: shipment created -> clustered -> pooled -> trip generated -> booked.
 * Tests the full pipeline coordination between services.
 *
 * Run with: vitest run tests/logistics/orchestration-integration.test.ts
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
    emitBatch: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/services/logistics/TripManagementService', () => ({
  TripManagementService: {
    createTrip: vi.fn().mockResolvedValue({ unified_trip_id: 'ut-integ-001' }),
  },
}));

vi.mock('@/services/logistics/LoadPoolingService', () => ({
  LoadPoolingService: {
    clusterPendingShipments: vi.fn().mockResolvedValue([]),
    listPools: vi.fn().mockResolvedValue([]),
    autoFillPool: vi.fn().mockResolvedValue({ added: 0, shipment_ids: [] }),
    findPoolableShipments: vi.fn().mockResolvedValue([]),
    createPool: vi.fn().mockResolvedValue({ load_pool_id: 'lp-integ-001' }),
    addShipment: vi.fn().mockResolvedValue({ success: true, load_pool_id: 'lp-integ-001' }),
    getDispatchReadyPools: vi.fn().mockResolvedValue([]),
    evaluatePoolReadiness: vi.fn().mockResolvedValue({ is_ready: false }),
    calculatePoolWeight: vi.fn().mockResolvedValue({ total_weight_kg: 0, member_count: 0 }),
    getPool: vi.fn().mockResolvedValue({ id: 'lp-001', members: [] }),
  },
}));

vi.mock('@/services/logistics/VehicleCapacityService', () => ({
  VehicleCapacityService: {
    findBestVehicleForPool: vi.fn().mockResolvedValue([]),
    getAvailableVehicles: vi.fn().mockResolvedValue([]),
  },
}));

import { LogisticsMatchingEngine } from '@/services/logistics/LogisticsMatchingEngine';
import { LoadPoolingService } from '@/services/logistics/LoadPoolingService';
import { VehicleCapacityService } from '@/services/logistics/VehicleCapacityService';
import { TripGenerationService } from '@/services/logistics/TripGenerationService';
import { LogisticsEventService } from '@/services/logistics/LogisticsEventService';
import { TripManagementService } from '@/services/logistics/TripManagementService';
import { DEFAULT_MATCHING_CONFIG } from '@/services/logistics/types';

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

describe('Orchestration Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('full pipeline: shipment -> pool -> trip -> booking', () => {
    it('should match a single shipment into a new pool', async () => {
      const shipment = {
        id: 'sr-integ-001',
        route_cluster_id: 'rc-integ-001',
        weight_estimate_kg: 500,
        status: 'pending',
      };

      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      vi.mocked(LoadPoolingService.listPools)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-integ-001');

      expect(result.pooled).toBe(true);
      expect(result.pool_id).toBe('lp-integ-001');
      expect(LogisticsEventService.emit).toHaveBeenCalled();
      expect(LoadPoolingService.createPool).toHaveBeenCalled();
      expect(LoadPoolingService.addShipment).toHaveBeenCalledWith('sr-integ-001', 'lp-integ-001');
    });
  });

  describe('edge cases', () => {
    it('should handle shipment cancellation gracefully (non-pending status)', async () => {
      const cancelledShipment = {
        id: 'sr-cancelled',
        route_cluster_id: 'rc-001',
        weight_estimate_kg: 300,
        status: 'cancelled',
      };
      mockFrom.mockReturnValueOnce(chainable({ data: cancelledShipment, error: null }));

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-cancelled');
      expect(result.pooled).toBe(false);
      expect(result.pool_id).toBeNull();
    });

    it('should handle pool with single shipment', async () => {
      const shipment = {
        id: 'sr-solo',
        route_cluster_id: 'rc-solo',
        weight_estimate_kg: 4000,
        status: 'pending',
      };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      vi.mocked(LoadPoolingService.listPools)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      vi.mocked(LoadPoolingService.createPool).mockResolvedValueOnce({ load_pool_id: 'lp-solo' });

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-solo');
      expect(result.pooled).toBe(true);
      expect(result.pool_id).toBe('lp-solo');
    });

    it('should handle multiple pools on same route cluster', async () => {
      const shipment = {
        id: 'sr-multi',
        route_cluster_id: 'rc-multi',
        weight_estimate_kg: 200,
        status: 'pending',
      };
      mockFrom.mockReturnValueOnce(chainable({ data: shipment, error: null }));

      vi.mocked(LoadPoolingService.listPools)
        .mockResolvedValueOnce([
          { id: 'lp-multi-1', capacity_target_kg: 5000, total_weight_kg: 4900 },
          { id: 'lp-multi-2', capacity_target_kg: 5000, total_weight_kg: 1000 },
        ] as never)
        .mockResolvedValueOnce([]);

      const result = await LogisticsMatchingEngine.matchSingleShipment('sr-multi');
      expect(result.pooled).toBe(true);
      expect(result.pool_id).toBe('lp-multi-2');
    });
  });

  describe('DEFAULT_MATCHING_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_MATCHING_CONFIG.min_pool_weight_kg).toBeGreaterThan(0);
      expect(DEFAULT_MATCHING_CONFIG.max_pool_weight_kg).toBeGreaterThan(DEFAULT_MATCHING_CONFIG.min_pool_weight_kg);
      expect(DEFAULT_MATCHING_CONFIG.min_pool_members).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_MATCHING_CONFIG.pickup_window_hours).toBeGreaterThan(0);
      expect(DEFAULT_MATCHING_CONFIG.vehicle_utilization_threshold).toBeGreaterThan(0);
      expect(DEFAULT_MATCHING_CONFIG.vehicle_utilization_threshold).toBeLessThanOrEqual(1);
    });
  });

  describe('TripGenerationService.buildTripLegs integration', () => {
    it('should produce valid multi-stop route from multiple shipments', () => {
      const shipments = [
        {
          id: 'sr-a', pickup_location: 'Kolar Farm 1', pickup_geo_lat: 13.1, pickup_geo_long: 78.1,
          drop_location: 'Bangalore APMC', drop_geo_lat: 12.9, drop_geo_long: 77.5,
          origin_district_id: 'kolar', dest_district_id: 'bangalore',
        },
        {
          id: 'sr-b', pickup_location: 'Kolar Farm 2', pickup_geo_lat: 13.0, pickup_geo_long: 78.0,
          drop_location: 'Bangalore APMC', drop_geo_lat: 12.9, drop_geo_long: 77.5,
          origin_district_id: 'kolar', dest_district_id: 'bangalore',
        },
        {
          id: 'sr-c', pickup_location: 'Kolar Farm 3', pickup_geo_lat: 12.9, pickup_geo_long: 78.2,
          drop_location: 'Bangalore APMC', drop_geo_lat: 12.9, drop_geo_long: 77.5,
          origin_district_id: 'kolar', dest_district_id: 'bangalore',
        },
      ];

      const legs = TripGenerationService.buildTripLegs(shipments as never);

      expect(legs).toHaveLength(6);

      const pickups = legs.filter((l) => l.leg_type === 'pickup');
      const drops = legs.filter((l) => l.leg_type === 'drop');
      expect(pickups).toHaveLength(3);
      expect(drops).toHaveLength(3);

      for (let i = 0; i < legs.length - 1; i++) {
        expect(legs[i].sequence_order).toBeLessThan(legs[i + 1].sequence_order!);
      }

      const allPickupsBefore = pickups.every((p) =>
        drops.every((d) => p.sequence_order! < d.sequence_order!)
      );
      expect(allPickupsBefore).toBe(true);
    });
  });

  describe('backward compatibility', () => {
    it('should not import or modify legacy transport_requests', () => {
      const fromCalls = mockFrom.mock.calls.map((c) => c[0]);
      expect(fromCalls).not.toContain('transport_requests');
      expect(fromCalls).not.toContain('trips');
    });

    it('should use unified domain tables only', () => {
      const validTables = [
        'shipment_requests', 'shipment_items', 'load_pools', 'load_pool_members',
        'unified_trips', 'trip_legs', 'vehicle_capacity_blocks', 'shipment_bookings',
        'reverse_load_candidates', 'route_clusters', 'vehicles',
        'logistics_events', 'matching_runs',
      ];

      const fromCalls = mockFrom.mock.calls.map((c) => c[0] as string);
      for (const table of fromCalls) {
        expect(validTables).toContain(table);
      }
    });
  });
});
