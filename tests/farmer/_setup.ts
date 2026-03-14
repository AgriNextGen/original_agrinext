/**
 * Shared test utilities for all farmer tests.
 * Provides mock factories, test wrappers, and Supabase mock helpers.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TEST_USER_ID = 'farmer-test-uid-001';
export const TEST_USER = {
  id: TEST_USER_ID,
  email: '919888880101@agrinext.local',
  phone: '+919888880101',
  user_metadata: { role: 'farmer' },
};

// ---------------------------------------------------------------------------
// Mock Supabase chain builder
// ---------------------------------------------------------------------------

export type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
};

function chainable(terminal: { data: unknown; error: unknown }): MockChain {
  const chain: Partial<MockChain> = {};
  const self = () => chain as MockChain;
  chain.select = vi.fn().mockReturnValue(self());
  chain.insert = vi.fn().mockReturnValue(self());
  chain.update = vi.fn().mockReturnValue(self());
  chain.delete = vi.fn().mockReturnValue(self());
  chain.upsert = vi.fn().mockReturnValue(self());
  chain.eq = vi.fn().mockReturnValue(self());
  chain.neq = vi.fn().mockReturnValue(self());
  chain.in = vi.fn().mockReturnValue(self());
  chain.is = vi.fn().mockReturnValue(self());
  chain.like = vi.fn().mockReturnValue(self());
  chain.order = vi.fn().mockReturnValue(self());
  chain.limit = vi.fn().mockReturnValue(self());
  chain.single = vi.fn().mockResolvedValue(terminal);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminal);
  chain.then = vi.fn((cb: (v: typeof terminal) => unknown) => Promise.resolve(cb(terminal)));
  return chain as MockChain;
}

export function createMockSupabase(tableData: Record<string, { data: unknown; error: unknown }> = {}) {
  const defaultResult = { data: [], error: null };
  return {
    from: vi.fn((table: string) => chainable(tableData[table] ?? defaultResult)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

export function createTestWrapper(opts: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries: [opts.route ?? '/farmer/dashboard'] },
        children,
      ),
    );
  };
}

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

let _seq = 0;
function uid() { return `test-${++_seq}-${Math.random().toString(36).slice(2, 8)}`; }

export function makeFarmland(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    farmer_id: TEST_USER_ID,
    name: 'Test Farm Plot',
    area: 2.5,
    area_unit: 'acres',
    soil_type: 'red',
    village: 'Hunsuru',
    district: 'Mysuru',
    geo_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeCrop(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    farmer_id: TEST_USER_ID,
    crop_name: 'Test Tomato',
    variety: 'Cherry',
    status: 'growing' as const,
    health_status: 'normal',
    growth_stage: 'seedling',
    land_id: null,
    sowing_date: '2026-01-15',
    harvest_estimate: '2026-04-15',
    estimated_quantity: 50,
    quantity_unit: 'quintals',
    farmland: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    seller_id: TEST_USER_ID,
    title: 'Fresh Tomatoes',
    category: 'vegetable',
    price: 25,
    quantity: 100,
    available_qty: 100,
    unit: 'kg',
    unit_price: 25,
    is_active: true,
    status: 'approved',
    description: 'Organic tomatoes',
    location: 'Mysuru',
    crop_id: null,
    trace_code: null,
    image_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    buyer_id: 'buyer-001',
    farmer_id: TEST_USER_ID,
    crop_id: null,
    quantity: 10,
    quantity_unit: 'kg',
    price_offered: 25,
    status: 'pending',
    payment_status: null,
    delivery_date: null,
    delivery_address: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    buyer: { name: 'Test Buyer', company_name: null, phone: '+919000000001', district: 'Mysuru' },
    crop: { crop_name: 'Tomato', variety: 'Cherry' },
    ...overrides,
  };
}

export function makeTransportRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    farmer_id: TEST_USER_ID,
    quantity: 50,
    quantity_unit: 'kg',
    pickup_location: 'Hunsuru Village',
    pickup_village: 'Hunsuru',
    preferred_date: '2026-03-20',
    preferred_time: 'morning',
    status: 'requested' as const,
    crop_id: null,
    crop: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    user_id: TEST_USER_ID,
    title: 'Price Alert',
    message: 'Tomato prices increased by 10%',
    type: 'price',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    full_name: 'Test Farmer',
    phone: '+919888880101',
    village: 'Hunsuru',
    district: 'Mysuru',
    taluk: null,
    pincode: null,
    district_source: null,
    district_confidence: null,
    total_land_area: 5,
    avatar_url: null,
    location: null,
    preferred_language: 'en',
    ...overrides,
  };
}

export function makeEarnings() {
  return {
    totalSales: 12500,
    pendingPayments: 3200,
    completedOrders: 8,
  };
}

export function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    amount: 1500,
    type: 'sale',
    status: 'completed',
    date: new Date().toISOString(),
    description: 'Tomato sale',
    ...overrides,
  };
}
