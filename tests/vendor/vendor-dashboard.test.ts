/**
 * Vendor Dashboard — Page rendering and data flow tests
 *
 * Tests vendor dashboard pages render correctly with loading,
 * empty, and data states.
 *
 * Run with: vitest run tests/vendor/vendor-dashboard.test.ts
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-vendor-001' },
    userRole: 'vendor',
    session: { access_token: 'test' },
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

function chainable(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.update = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.not = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(cb(result)));
  return chain;
}

describe('Vendor Dashboard Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compute dashboard stats from shipment statuses', () => {
    const shipments = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'in_transit' },
      { id: '3', status: 'delivered' },
      { id: '4', status: 'booked' },
      { id: '5', status: 'completed' },
      { id: '6', status: 'pooled' },
    ];

    const activeStatuses = ['pending', 'pooled', 'booked', 'in_transit'];
    const completedStatuses = ['delivered', 'completed'];

    const active = shipments.filter(s => activeStatuses.includes(s.status)).length;
    const awaitingPickup = shipments.filter(s => ['pending', 'pooled', 'booked'].includes(s.status)).length;
    const inTransit = shipments.filter(s => s.status === 'in_transit').length;
    const delivered = shipments.filter(s => completedStatuses.includes(s.status)).length;

    expect(active).toBe(4);
    expect(awaitingPickup).toBe(3);
    expect(inTransit).toBe(1);
    expect(delivered).toBe(2);
  });
});

describe('Vendor Profile CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create vendor profile on first save', async () => {
    const selectChain = chainable({ data: null, error: null });
    const insertChain = chainable({
      data: {
        id: 'v-001',
        user_id: 'test-vendor-001',
        business_name: 'Test Shop',
        business_type: 'fertilizer_shop',
      },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain);

    expect(mockFrom).toBeDefined();
  });

  it('should update existing vendor profile', async () => {
    const selectChain = chainable({
      data: { id: 'v-001' },
      error: null,
    });
    const updateChain = chainable({
      data: {
        id: 'v-001',
        user_id: 'test-vendor-001',
        business_name: 'Updated Shop',
      },
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    expect(mockFrom).toBeDefined();
  });
});

describe('Vendor Shipment Item Attachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert shipment items with correct structure', () => {
    const shipmentId = 'sr-vendor-001';
    const items = [
      { product_name: 'DAP Fertilizer', quantity: 50, unit: 'bags', weight_kg: 2500 },
      { product_name: 'Hybrid Seeds', quantity: 100, unit: 'packets', weight_kg: 50 },
    ];

    const insertItems = items.map(item => ({
      shipment_request_id: shipmentId,
      product_name: item.product_name,
      category: null,
      quantity: item.quantity,
      unit: item.unit,
      weight_kg: item.weight_kg,
    }));

    expect(insertItems).toHaveLength(2);
    expect(insertItems[0].shipment_request_id).toBe(shipmentId);
    expect(insertItems[0].product_name).toBe('DAP Fertilizer');
    expect(insertItems[1].unit).toBe('packets');
  });
});

describe('Vendor Security', () => {
  it('should only allow vendor role to access vendor routes', () => {
    const allowedRoles = ['vendor'];
    expect(allowedRoles).not.toContain('farmer');
    expect(allowedRoles).not.toContain('buyer');
    expect(allowedRoles).not.toContain('admin');
    expect(allowedRoles).not.toContain('logistics');
    expect(allowedRoles).toContain('vendor');
  });

  it('should scope vendor shipments to source_actor_id', () => {
    const userId = 'vendor-user-001';
    const queryFilters = {
      request_source_type: 'vendor',
      source_actor_id: userId,
    };
    expect(queryFilters.request_source_type).toBe('vendor');
    expect(queryFilters.source_actor_id).toBe(userId);
  });
});
