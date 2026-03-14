import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestWrapper, createMockSupabase, makeTransportRequest, makeCrop, makeFarmland, TEST_USER } from './_setup';

const mockSupabase = createMockSupabase();
vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: TEST_USER, session: { access_token: 'test' },
    userRole: 'farmer', realRole: 'farmer', activeRole: 'farmer',
    isDevOverride: false, loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', setLanguage: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const testRequests = [
  makeTransportRequest({ status: 'requested', pickup_location: 'Hunsuru Village' }),
  makeTransportRequest({ status: 'assigned', pickup_location: 'Srirangapatna Market' }),
];

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: null, isLoading: false }),
  useFarmlands: () => ({ data: [makeFarmland()], isLoading: false }),
  useCrops: () => ({ data: [makeCrop()], isLoading: false }),
  useTransportRequests: () => ({ data: testRequests, isLoading: false }),
  useFarmerNotifications: () => ({ data: [], isLoading: false }),
  useFarmerOrders: () => ({ data: [], isLoading: false }),
  useDashboardStats: () => ({}),
  useFarmerUpdateOrderStatus: () => ({ mutate: vi.fn() }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/transport' });

async function renderTransport() {
  const mod = await import('@/pages/farmer/Transport');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('TransportPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders transport request cards', async () => {
    await renderTransport();
    await waitFor(() => {
      const items = screen.getAllByText('Hunsuru');
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders KPI stat cards', async () => {
    await renderTransport();
    await waitFor(() => {
      expect(screen.getByText('farmer.transport.totalRequests')).toBeInTheDocument();
    });
  });

  it('new request button is present', async () => {
    await renderTransport();
    await waitFor(() => {
      expect(screen.getByText('farmer.transport.newRequest')).toBeInTheDocument();
    });
  });

  it('filter buttons are rendered', async () => {
    await renderTransport();
    await waitFor(() => {
      expect(screen.getByText('common.all')).toBeInTheDocument();
      expect(screen.getByText('farmer.transport.pending')).toBeInTheDocument();
    });
  });

  it('cancel request button is visible for requested status', async () => {
    await renderTransport();
    await waitFor(() => {
      const cancelButtons = screen.getAllByText('farmer.transport.cancelRequest');
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
