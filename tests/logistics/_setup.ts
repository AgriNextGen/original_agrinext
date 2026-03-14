/**
 * Shared test utilities for all logistics Vitest tests.
 * Provides mock factories, test wrappers, and data factories
 * mirroring the pattern from tests/farmer/_setup.ts.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TEST_LOGISTICS_USER_ID = 'logistics-test-uid-001';
export const TEST_LOGISTICS_USER = {
  id: TEST_LOGISTICS_USER_ID,
  email: '919888880103@agrinext.local',
  phone: '+919888880103',
  user_metadata: { role: 'logistics' },
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
      getUser: vi.fn().mockResolvedValue({ data: { user: TEST_LOGISTICS_USER }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/proof.jpg' }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed-proof' }, error: null }),
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
        { initialEntries: [opts.route ?? '/logistics/dashboard'] },
        children,
      ),
    );
  };
}

// ---------------------------------------------------------------------------
// Data factories
// ---------------------------------------------------------------------------

let _seq = 0;
function uid() { return `logi-test-${++_seq}-${Math.random().toString(36).slice(2, 8)}`; }

export function makeTransporter(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    user_id: TEST_LOGISTICS_USER_ID,
    name: 'Test Transporter',
    phone: '+919888880103',
    vehicle_type: 'mini_truck',
    vehicle_capacity: 1000,
    registration_number: 'KA-01-TEST-0001',
    operating_village: 'Hunsuru',
    operating_district: 'Mysuru',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    transporter_id: 'transporter-001',
    vehicle_type: 'truck',
    capacity_kg: 5000,
    registration_number: 'KA-01-AB-1234',
    refrigerated: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeTransportRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    farmer_id: 'farmer-test-uid-001',
    crop_id: null,
    quantity: 50,
    quantity_unit: 'kg',
    pickup_location: 'Hunsuru Village',
    pickup_village: 'Hunsuru',
    preferred_date: '2026-03-20',
    preferred_time: 'morning',
    status: 'requested' as const,
    transporter_id: null,
    vehicle_id: null,
    assigned_trip_id: null,
    accepted_trip_id: null,
    pickup_photo_url: null,
    delivery_photo_url: null,
    distance_km: null,
    completed_at: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    farmer: { full_name: 'Test Farmer', village: 'Hunsuru', district: 'Mysuru', phone: '+919888880101' },
    crop: { crop_name: 'Tomato', variety: 'Cherry' },
    ...overrides,
  };
}

export function makeTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    transport_request_id: 'req-001',
    transporter_id: TEST_LOGISTICS_USER_ID,
    status: 'accepted' as const,
    created_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
    pickup_done_at: null,
    in_transit_at: null,
    delivered_at: null,
    completed_at: null,
    cancelled_at: null,
    issue_code: null,
    issue_notes: null,
    pickup_proofs: null,
    delivery_proofs: null,
    pickup_otp_required: false,
    pickup_otp_verified: false,
    delivery_otp_required: false,
    delivery_otp_verified: false,
    actual_weight_kg: null,
    updated_at: new Date().toISOString(),
    transport_request: {
      id: 'req-001',
      farmer_id: 'farmer-test-uid-001',
      crop_id: null,
      quantity: 50,
      quantity_unit: 'kg',
      pickup_location: 'Hunsuru Village',
      pickup_village: 'Hunsuru',
      preferred_date: '2026-03-20',
      preferred_time: 'morning',
      drop_location: 'Mysuru Mandi',
      fare_estimate: 500,
      notes: null,
    },
    farmer: { full_name: 'Test Farmer', village: 'Hunsuru', district: 'Mysuru', phone: '+919888880101' },
    crop: { crop_name: 'Tomato', variety: 'Cherry' },
    ...overrides,
  };
}

export function makeTripStatusEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    transport_request_id: 'req-001',
    trip_id: 'trip-001',
    actor_id: TEST_LOGISTICS_USER_ID,
    actor_role: 'transporter' as const,
    old_status: null,
    new_status: 'accepted',
    note: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(),
    user_id: TEST_LOGISTICS_USER_ID,
    title: 'New Load Available',
    message: 'A new transport request is available near Hunsuru',
    type: 'transport',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function makeDashboardStats(overrides: Record<string, unknown> = {}) {
  return {
    stats: {
      availableLoads: 5,
      acceptedTrips: 2,
      tripsInProgress: 1,
      completedTrips: 12,
    },
    transporter: null,
    raw: {
      available_loads_count: 5,
      trips_by_status: { accepted: 2, pickup_done: 0, in_transit: 1, delivered: 10, completed: 2 },
    },
    ...overrides,
  };
}
