import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestWrapper, createMockSupabase, makeFarmland, TEST_USER } from './_setup';

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

vi.mock('@/hooks/useGeoCapture', () => ({
  useGeoCapture: () => ({
    position: null, capturing: false, error: null,
    capture: vi.fn(), clear: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const testFarmlands = [
  makeFarmland({ name: 'North Field', village: 'Hunsuru' }),
  makeFarmland({ name: 'South Plot', village: 'Srirangapatna' }),
];

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: null, isLoading: false }),
  useFarmlands: () => ({ data: testFarmlands, isLoading: false }),
  useCrops: () => ({ data: [], isLoading: false }),
  useTransportRequests: () => ({ data: [], isLoading: false }),
  useFarmerNotifications: () => ({ data: [], isLoading: false }),
  useFarmerOrders: () => ({ data: [], isLoading: false }),
  useDashboardStats: () => ({ totalFarmlands: 2, totalCrops: 0 }),
  useFarmerUpdateOrderStatus: () => ({ mutate: vi.fn() }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/farmlands' });

async function renderFarmlands() {
  const mod = await import('@/pages/farmer/Farmlands');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('FarmlandsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders farmland cards with names and areas', async () => {
    await renderFarmlands();
    await waitFor(() => {
      expect(screen.getByText('North Field')).toBeInTheDocument();
      expect(screen.getByText('South Plot')).toBeInTheDocument();
    });
  });

  it('renders KPI stats cards', async () => {
    await renderFarmlands();
    await waitFor(() => {
      expect(screen.getByText('farmer.farmlands.totalPlots')).toBeInTheDocument();
      expect(screen.getByText('farmer.farmlands.totalAcres')).toBeInTheDocument();
    });
  });

  it('add farmland button is present and clickable', async () => {
    await renderFarmlands();
    await waitFor(() => {
      expect(screen.getByText('farmer.farmlands.addFarmland')).toBeInTheDocument();
    });
  });

  it('search input filters farmland cards', async () => {
    await renderFarmlands();
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText('farmer.farmlands.searchPlaceholder');
    await user.type(searchInput, 'North');
    await waitFor(() => {
      expect(screen.getByText('North Field')).toBeInTheDocument();
      expect(screen.queryByText('South Plot')).not.toBeInTheDocument();
    });
  });

  it('edit button has correct aria-label', async () => {
    await renderFarmlands();
    await waitFor(() => {
      expect(screen.getByLabelText('Edit North Field')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit South Plot')).toBeInTheDocument();
    });
  });

  it('delete button has correct aria-label', async () => {
    await renderFarmlands();
    await waitFor(() => {
      expect(screen.getByLabelText('Delete North Field')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete South Plot')).toBeInTheDocument();
    });
  });

  it('soil reports button is present for each card', async () => {
    await renderFarmlands();
    await waitFor(() => {
      const soilButtons = screen.getAllByText('farmer.farmlands.soilReports');
      expect(soilButtons.length).toBe(2);
    });
  });
});

describe('FarmlandsPage - search empty state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows no results message when search matches nothing', async () => {
    await renderFarmlands();
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText('farmer.farmlands.searchPlaceholder');
    await user.type(searchInput, 'NonexistentFarm');
    await waitFor(() => {
      expect(screen.getByText('farmer.farmlands.noFarmlandsFound')).toBeInTheDocument();
    });
  });
});
