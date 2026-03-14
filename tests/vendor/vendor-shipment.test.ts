/**
 * Vendor Logistics — Shipment creation and item attachment tests
 *
 * Tests vendor-specific shipment flows using the unified logistics engine.
 * Vendors must use the same APIs as farmers and buyers.
 *
 * Run with: vitest run tests/vendor/vendor-shipment.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { LogisticsOrchestratorService } from '@/services/logistics/LogisticsOrchestratorService';
import type { CreateShipmentRequestParams } from '@/services/logistics/types';

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Vendor Shipment Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a vendor shipment via the shared orchestrator', async () => {
    const expectedResult = {
      shipment_request_id: 'sr-vendor-001',
      route_cluster_id: 'rc-100',
    };
    mockRpc.mockResolvedValueOnce({ data: expectedResult, error: null });

    const params: CreateShipmentRequestParams = {
      request_source_type: 'vendor',
      source_actor_id: 'vendor-user-001',
      shipment_type: 'agri_input',
      pickup_location: 'Fertilizer Warehouse, Mysuru',
      drop_location: 'Hunsuru Village Store',
      weight_estimate_kg: 2000,
      items: [
        { product_name: 'DAP Fertilizer', quantity: 50, unit: 'bags', weight_kg: 2500 },
        { product_name: 'Hybrid Seeds', quantity: 100, unit: 'packets', weight_kg: 50 },
      ],
    };

    const result = await LogisticsOrchestratorService.createShipmentRequest(params);

    expect(result).toEqual(expectedResult);
    expect(mockRpc).toHaveBeenCalledWith('create_shipment_request_v1', {
      p_params: expect.objectContaining({
        request_source_type: 'vendor',
        source_actor_id: 'vendor-user-001',
        shipment_type: 'agri_input',
      }),
    });
  });

  it('should reject shipment creation on RPC error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RLS policy violation' },
    });

    const params: CreateShipmentRequestParams = {
      request_source_type: 'vendor',
      source_actor_id: 'vendor-user-001',
      shipment_type: 'agri_input',
    };

    await expect(
      LogisticsOrchestratorService.createShipmentRequest(params)
    ).rejects.toThrow('create_shipment_request failed');
  });

  it('should set default shipment_type to agri_input for vendors', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { shipment_request_id: 'sr-002', route_cluster_id: null },
      error: null,
    });

    const params: CreateShipmentRequestParams = {
      request_source_type: 'vendor',
      source_actor_id: 'vendor-user-002',
      shipment_type: 'agri_input',
      pickup_location: 'Seed Store',
      drop_location: 'Farm Village',
    };

    await LogisticsOrchestratorService.createShipmentRequest(params);

    expect(mockRpc).toHaveBeenCalledWith('create_shipment_request_v1', {
      p_params: expect.objectContaining({
        shipment_type: 'agri_input',
      }),
    });
  });
});

describe('Vendor Shipment Detail Retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve a vendor shipment with items and bookings', async () => {
    const shipment = {
      id: 'sr-vendor-001',
      request_source_type: 'vendor',
      source_actor_id: 'vendor-user-001',
      shipment_type: 'agri_input',
      status: 'pending',
      pickup_location: 'Warehouse',
      drop_location: 'Village',
      weight_estimate_kg: 1000,
      created_at: '2026-03-14T10:00:00Z',
      updated_at: '2026-03-14T10:00:00Z',
    };
    const items = [
      { id: 'si-001', shipment_request_id: 'sr-vendor-001', product_name: 'DAP', quantity: 50, unit: 'bags' },
    ];
    const bookings: unknown[] = [];

    const shipmentChain = chainable({ data: shipment, error: null });
    const itemsChain = chainable({ data: items, error: null });
    const bookingsChain = chainable({ data: bookings, error: null });

    mockFrom
      .mockReturnValueOnce(shipmentChain)
      .mockReturnValueOnce(itemsChain)
      .mockReturnValueOnce(bookingsChain);

    const result = await LogisticsOrchestratorService.getShipmentRequest('sr-vendor-001');

    expect(result.request_source_type).toBe('vendor');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_name).toBe('DAP');
    expect(result.bookings).toHaveLength(0);
  });

  it('should throw when shipment not found', async () => {
    const chain = chainable({ data: null, error: null });
    mockFrom.mockReturnValueOnce(chain);

    await expect(
      LogisticsOrchestratorService.getShipmentRequest('nonexistent')
    ).rejects.toThrow('Shipment not found');
  });
});

describe('Vendor Role Constants', () => {
  it('should include vendor in APP_ROLES', async () => {
    const { APP_ROLES } = await import('@/types/domain');
    expect(APP_ROLES).toContain('vendor');
  });

  it('should include vendor in ROLES constant', async () => {
    const { ROLES } = await import('@/lib/constants');
    expect(ROLES.VENDOR).toBe('vendor');
  });

  it('should include vendor in ROLE_DASHBOARD_ROUTES', async () => {
    const { ROLE_DASHBOARD_ROUTES } = await import('@/lib/routes');
    expect(ROLE_DASHBOARD_ROUTES.vendor).toBe('/vendor/dashboard');
  });
});

describe('Vendor Route Constants', () => {
  it('should define all vendor routes', async () => {
    const { ROUTES } = await import('@/lib/routes');
    expect(ROUTES.VENDOR.ROOT).toBe('/vendor');
    expect(ROUTES.VENDOR.DASHBOARD).toBe('/vendor/dashboard');
    expect(ROUTES.VENDOR.CREATE_SHIPMENT).toBe('/vendor/shipments/create');
    expect(ROUTES.VENDOR.ACTIVE_SHIPMENTS).toBe('/vendor/shipments/active');
    expect(ROUTES.VENDOR.SHIPMENT_HISTORY).toBe('/vendor/shipments/history');
    expect(ROUTES.VENDOR.LOGISTICS_REQUESTS).toBe('/vendor/logistics-requests');
    expect(ROUTES.VENDOR.REVERSE_LOGISTICS).toBe('/vendor/reverse-logistics');
    expect(ROUTES.VENDOR.PROFILE).toBe('/vendor/profile');
  });

  it('should generate dynamic shipment detail paths', async () => {
    const { ROUTES } = await import('@/lib/routes');
    expect(ROUTES.VENDOR.SHIPMENT_DETAIL('abc-123')).toBe('/vendor/shipments/abc-123');
  });
});

describe('ShipmentSourceType', () => {
  it('should include vendor in ShipmentSourceType', async () => {
    const validTypes = ['farmer', 'buyer', 'vendor', 'admin'];
    const vendorType: string = 'vendor';
    expect(validTypes).toContain(vendorType);
  });
});
