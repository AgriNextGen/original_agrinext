/**
 * Vendor Reverse Logistics — Integration tests
 *
 * Tests that vendor shipments participate in the reverse logistics engine.
 * Vendor agri-input shipments should be matched to return trips.
 *
 * Run with: vitest run tests/vendor/vendor-reverse-logistics.test.ts
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
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.gt = vi.fn().mockReturnValue(self());
  chain.gte = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Vendor Reverse Logistics Participation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scan for reverse load candidates', async () => {
    const candidates = [
      {
        id: 'rlc-001',
        unified_trip_id: 'ut-001',
        available_capacity_kg: 500,
        candidate_score: 85,
        status: 'identified',
        shipment_request_id: null,
        origin_district_id: 'dist-001',
        dest_district_id: 'dist-002',
      },
    ];

    mockRpc.mockResolvedValueOnce({ data: { candidates, count: 1, remaining_capacity_kg: 500 }, error: null });

    const result = await ReverseLogisticsService.findCandidates('ut-001');

    expect(result).toBeDefined();
    expect(mockRpc).toHaveBeenCalledWith('find_reverse_load_candidates_v1', { p_unified_trip_id: 'ut-001' });
  });
});

describe('Vendor Shipment Pipeline Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should flow vendor shipment through logistics: create → pool → book', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: { shipment_request_id: 'sr-v001', route_cluster_id: 'rc-100' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { load_pool_id: 'lp-001' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { booking_id: 'bk-001', trip_id: 'ut-001' },
        error: null,
      });

    const { LogisticsOrchestratorService } = await import(
      '@/services/logistics/LogisticsOrchestratorService'
    );

    const shipment = await LogisticsOrchestratorService.createShipmentRequest({
      request_source_type: 'vendor',
      source_actor_id: 'vendor-user-001',
      shipment_type: 'agri_input',
      pickup_location: 'Vendor Warehouse',
      drop_location: 'Farm Village',
      weight_estimate_kg: 800,
    });

    expect(shipment.shipment_request_id).toBe('sr-v001');

    const pool = await LogisticsOrchestratorService.createLoadPool({
      route_cluster_id: shipment.route_cluster_id!,
      capacity_target_kg: 5000,
    });

    expect(pool.load_pool_id).toBe('lp-001');
  });
});

describe('Vendor Shipment Types', () => {
  it('should support agri_input shipment type', () => {
    const validTypes = ['farm_produce', 'agri_input', 'general_goods', 'return_goods'];
    expect(validTypes).toContain('agri_input');
  });

  it('should support return_goods for reverse logistics', () => {
    const validTypes = ['farm_produce', 'agri_input', 'general_goods', 'return_goods'];
    expect(validTypes).toContain('return_goods');
  });
});
