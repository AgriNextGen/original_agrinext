import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestWrapper, makeOrder, TEST_USER } from './_setup';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb: Function) => Promise.resolve(cb({ data: [], error: null }))),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  },
}));

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

const testOrders = [
  makeOrder({ id: 'ord-1', status: 'pending', quantity: 10 }),
  makeOrder({ id: 'ord-2', status: 'confirmed', quantity: 20 }),
];

const mockUpdateStatus = vi.fn();

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: null, isLoading: false }),
  useFarmlands: () => ({ data: [], isLoading: false }),
  useCrops: () => ({ data: [], isLoading: false }),
  useTransportRequests: () => ({ data: [], isLoading: false }),
  useFarmerNotifications: () => ({ data: [], isLoading: false }),
  useFarmerOrders: () => ({ data: testOrders, isLoading: false }),
  useDashboardStats: () => ({}),
  useFarmerUpdateOrderStatus: () => ({
    confirmOrder: mockUpdateStatus,
    rejectOrder: mockUpdateStatus,
    updateOrderStatus: mockUpdateStatus,
    isPending: false,
  }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/orders' });

async function renderOrders() {
  const mod = await import('@/pages/farmer/Orders');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('FarmerOrders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders order rows', async () => {
    await renderOrders();
    await waitFor(() => {
      const buyers = screen.getAllByText('Test Buyer');
      expect(buyers.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders page title', async () => {
    await renderOrders();
    await waitFor(() => {
      const titles = screen.getAllByText('orders.title');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders status filter options', async () => {
    await renderOrders();
    await waitFor(() => {
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });
  });

  it('renders view button for orders', async () => {
    await renderOrders();
    await waitFor(() => {
      const viewButtons = screen.getAllByText('View');
      expect(viewButtons.length).toBeGreaterThan(0);
    });
  });
});
