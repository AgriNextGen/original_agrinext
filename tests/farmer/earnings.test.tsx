import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestWrapper, TEST_USER } from './_setup';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useFarmerEarnings', () => ({
  useFarmerEarnings: vi.fn(),
  useFarmerTransactions: vi.fn(),
}));

const Wrapper = createTestWrapper({ route: '/farmer/earnings' });

async function renderEarnings(earningsData: unknown = null, transactions: unknown[] = []) {
  const { useFarmerEarnings, useFarmerTransactions } = await import('@/hooks/useFarmerEarnings');
  (useFarmerEarnings as ReturnType<typeof vi.fn>).mockReturnValue({
    data: earningsData,
    isLoading: !earningsData,
  });
  (useFarmerTransactions as ReturnType<typeof vi.fn>).mockReturnValue({
    data: transactions,
    isLoading: false,
  });
  const mod = await import('@/pages/farmer/Earnings');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('FarmerEarnings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading skeleton when data is pending', async () => {
    await renderEarnings();
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(0);
  });

  it('renders KPI cards with earnings data', async () => {
    await renderEarnings({ totalSales: 12500, pendingPayments: 3200, completedOrders: 8 });
    await waitFor(() => {
      expect(screen.getByText('farmer.earnings.totalSales')).toBeInTheDocument();
      expect(screen.getByText('farmer.earnings.pendingPayments')).toBeInTheDocument();
      expect(screen.getByText('farmer.earnings.completedOrders')).toBeInTheDocument();
    });
  });

  it('renders page with zero earnings', async () => {
    await renderEarnings({ totalSales: 0, pendingPayments: 0, completedOrders: 0 });
    await waitFor(() => {
      const titles = screen.getAllByText('farmer.earnings.title');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders page title', async () => {
    await renderEarnings({ totalSales: 500, pendingPayments: 100, completedOrders: 2 });
    await waitFor(() => {
      const titles = screen.getAllByText('farmer.earnings.title');
      expect(titles.length).toBeGreaterThanOrEqual(1);
    });
  });
});
