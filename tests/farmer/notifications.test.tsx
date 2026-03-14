import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestWrapper, createMockSupabase, makeNotification, TEST_USER } from './_setup';

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

const testNotifications = [
  makeNotification({ title: 'Price Alert', message: 'Tomato prices up', type: 'price', is_read: false }),
  makeNotification({ title: 'Weather Warning', message: 'Heavy rain expected', type: 'weather', is_read: true }),
  makeNotification({ title: 'Crop Advisory', message: 'Apply fertilizer', type: 'crop', is_read: false }),
];

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: null, isLoading: false }),
  useFarmlands: () => ({ data: [], isLoading: false }),
  useCrops: () => ({ data: [], isLoading: false }),
  useTransportRequests: () => ({ data: [], isLoading: false }),
  useFarmerNotifications: () => ({ data: testNotifications, isLoading: false }),
  useFarmerOrders: () => ({ data: [], isLoading: false }),
  useDashboardStats: () => ({}),
  useFarmerUpdateOrderStatus: () => ({ mutate: vi.fn() }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/notifications' });

async function renderNotifications() {
  const mod = await import('@/pages/farmer/Notifications');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('NotificationsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders notification items', async () => {
    await renderNotifications();
    await waitFor(() => {
      expect(screen.getByText('Price Alert')).toBeInTheDocument();
      expect(screen.getByText('Weather Warning')).toBeInTheDocument();
      expect(screen.getByText('Crop Advisory')).toBeInTheDocument();
    });
  });

  it('renders notification messages', async () => {
    await renderNotifications();
    await waitFor(() => {
      expect(screen.getByText('Tomato prices up')).toBeInTheDocument();
      expect(screen.getByText('Heavy rain expected')).toBeInTheDocument();
    });
  });

  it('renders mark all read button', async () => {
    await renderNotifications();
    await waitFor(() => {
      expect(screen.getByText('notificationsPage.markAllRead')).toBeInTheDocument();
    });
  });

  it('renders filter buttons', async () => {
    await renderNotifications();
    await waitFor(() => {
      expect(screen.getByText('common.all')).toBeInTheDocument();
      expect(screen.getByText('common.unread')).toBeInTheDocument();
    });
  });

  it('renders page title', async () => {
    await renderNotifications();
    await waitFor(() => {
      const titles = screen.getAllByText('notificationsPage.title');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });
});
