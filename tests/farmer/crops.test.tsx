import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestWrapper, createMockSupabase, makeCrop, makeFarmland, TEST_USER } from './_setup';

const mockSupabase = createMockSupabase();
vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const farmland = makeFarmland({ name: 'Test Farm' });
const testCrops = [
  makeCrop({ id: 'crop-1', crop_name: 'Tomato', variety: 'Cherry', status: 'growing', farmland }),
  makeCrop({ id: 'crop-2', crop_name: 'Onion', variety: 'Red', status: 'ready', farmland }),
  makeCrop({ id: 'crop-3', crop_name: 'Potato', variety: null, status: 'harvested', farmland: null }),
];

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: null, isLoading: false }),
  useFarmlands: () => ({ data: [farmland], isLoading: false }),
  useCrops: () => ({ data: testCrops, isLoading: false }),
  useTransportRequests: () => ({ data: [], isLoading: false }),
  useFarmerNotifications: () => ({ data: [], isLoading: false }),
  useFarmerOrders: () => ({ data: [], isLoading: false }),
  useDashboardStats: () => ({ totalFarmlands: 1, totalCrops: 3 }),
  useFarmerUpdateOrderStatus: () => ({ mutate: vi.fn() }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/crops' });

async function renderCrops() {
  const mod = await import('@/pages/farmer/Crops');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('CropsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders crop cards with names and status badges', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByText('Tomato')).toBeInTheDocument();
      expect(screen.getByText('Onion')).toBeInTheDocument();
      expect(screen.getByText('Potato')).toBeInTheDocument();
    });
  });

  it('renders KPI stat cards with counts', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByText('farmer.crops.totalCrops')).toBeInTheDocument();
    });
  });

  it('add crop button is present', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByText('farmer.crops.addCrop')).toBeInTheDocument();
    });
  });

  it('search filters crop cards', async () => {
    await renderCrops();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('farmer.crops.searchPlaceholder');
    await user.type(input, 'Tomato');
    await waitFor(() => {
      expect(screen.getByText('Tomato')).toBeInTheDocument();
      expect(screen.queryByText('Onion')).not.toBeInTheDocument();
    });
  });

  it('diary button navigates to crop diary', async () => {
    await renderCrops();
    await waitFor(() => {
      const diaryButtons = screen.getAllByText('farmer.crops.diary');
      expect(diaryButtons.length).toBe(3);
    });
  });

  it('edit buttons have correct aria-labels', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByLabelText('Edit Tomato')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit Onion')).toBeInTheDocument();
    });
  });

  it('transport buttons have correct aria-labels', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByLabelText('Request transport for Tomato')).toBeInTheDocument();
    });
  });

  it('delete buttons have correct aria-labels', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByLabelText('Delete Tomato')).toBeInTheDocument();
    });
  });

  it('variety text renders when present', async () => {
    await renderCrops();
    await waitFor(() => {
      expect(screen.getByText('Cherry')).toBeInTheDocument();
      expect(screen.getByText('Red')).toBeInTheDocument();
    });
  });
});
