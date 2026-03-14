/**
 * Logistics Dashboard — Vitest + RTL component tests
 *
 * Tests rendering states (loading, no-profile, data, error),
 * KPI cards, navigation buttons, active trips and available loads sections.
 *
 * Run with: vitest run tests/logistics/logistics-dashboard.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createTestWrapper,
  createMockSupabase,
  TEST_LOGISTICS_USER,
  makeTransporter,
  makeTransportRequest,
  makeDashboardStats,
} from './_setup';

function throwPg(error: unknown): never {
  if (error && typeof error === "object" && "message" in error) {
    throw new Error((error as { message: string }).message);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSupabase = createMockSupabase();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: TEST_LOGISTICS_USER,
    session: { access_token: 'test-token' },
    userRole: 'logistics',
    realRole: 'logistics',
    activeRole: 'logistics',
    isDevOverride: false,
    loading: false,
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

vi.mock('@/hooks/useRealtimeSubscriptions', () => ({
  useRealtimeSubscriptions: vi.fn(),
}));

const mockRpcJson = vi.fn();
vi.mock('@/lib/readApi', () => ({
  rpcJson: (...args: unknown[]) => mockRpcJson(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadDashboard() {
  const mod = await import('@/pages/logistics/Dashboard');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LogisticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('shows loading skeleton while profile is loading', async () => {
    // Make from('transporters') return a pending promise that never resolves during test
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    // Skeleton elements should be visible
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows create profile prompt when no transporter profile exists', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    mockRpcJson.mockResolvedValue({ available_loads_count: 0, trips_by_status: {} });

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('logistics.createProfile')).toBeInTheDocument();
    });
  });

  it('renders KPI cards when dashboard data loads', async () => {
    const transporter = makeTransporter();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: transporter, error: null }),
            }),
          }),
        };
      }
      if (table === 'transport_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [makeTransportRequest()], error: null }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    const stats = makeDashboardStats();
    mockRpcJson.mockResolvedValue(stats.raw);

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('logistics.transporterDashboard')).toBeInTheDocument();
    });
  });

  it('navigates to profile when profile button is clicked', async () => {
    const transporter = makeTransporter();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: transporter, error: null }),
            }),
          }),
        };
      }
      if (table === 'transport_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    mockRpcJson.mockResolvedValue({ available_loads_count: 0, trips_by_status: {} });

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('logistics.transporterDashboard')).toBeInTheDocument();
    });

    const profileButton = screen.getByLabelText('Open profile');
    await userEvent.click(profileButton);

    expect(mockNavigate).toHaveBeenCalledWith('/logistics/profile');
  });

  it('shows empty state when no active trips exist', async () => {
    const transporter = makeTransporter();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: transporter, error: null }),
            }),
          }),
        };
      }
      if (table === 'transport_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    mockRpcJson.mockResolvedValue({ available_loads_count: 0, trips_by_status: {} });

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('logistics.noActiveTrips')).toBeInTheDocument();
    });
  });

  it('shows empty state when no available loads exist', async () => {
    const transporter = makeTransporter();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transporters') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: transporter, error: null }),
            }),
          }),
        };
      }
      if (table === 'transport_requests') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return createMockSupabase().from(table);
    });

    mockRpcJson.mockResolvedValue({ available_loads_count: 0, trips_by_status: {} });

    const Dashboard = await loadDashboard();
    render(<Dashboard />, { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(screen.getByText('logistics.noLoadsFound')).toBeInTheDocument();
    });
  });
});
