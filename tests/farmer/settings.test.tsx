import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestWrapper, makeProfile, TEST_USER } from './_setup';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
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

vi.mock('@/hooks/useServiceAreas', () => ({
  useSetProfileGeo: () => ({ mutate: vi.fn(), isPending: false }),
}));

const profile = makeProfile();

vi.mock('@/hooks/useFarmerDashboard', () => ({
  useFarmerProfile: () => ({ data: profile, isLoading: false }),
  useFarmlands: () => ({ data: [], isLoading: false }),
  useCrops: () => ({ data: [], isLoading: false }),
  useTransportRequests: () => ({ data: [], isLoading: false }),
  useFarmerNotifications: () => ({ data: [], isLoading: false }),
  useFarmerOrders: () => ({ data: [], isLoading: false }),
  useDashboardStats: () => ({}),
  useFarmerUpdateOrderStatus: () => ({ mutate: vi.fn() }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/settings' });

async function renderSettings() {
  const mod = await import('@/pages/farmer/Settings');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('SettingsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders profile information section', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.profile_information')).toBeInTheDocument();
    });
  });

  it('renders profile field labels', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.full_name')).toBeInTheDocument();
      expect(screen.getByText('settings.phone')).toBeInTheDocument();
      expect(screen.getByText('settings.village')).toBeInTheDocument();
      expect(screen.getByText('settings.district')).toBeInTheDocument();
    });
  });

  it('renders save changes button', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('common.save_changes')).toBeInTheDocument();
    });
  });

  it('renders preferences section', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.preferences')).toBeInTheDocument();
    });
  });

  it('renders language options', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.language')).toBeInTheDocument();
      const englishElements = screen.getAllByText('settings.english');
      expect(englishElements.length).toBeGreaterThanOrEqual(1);
      const kannadaElements = screen.getAllByText('settings.kannada');
      expect(kannadaElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders geographic location section', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.geographicLocation')).toBeInTheDocument();
    });
  });

  it('renders account security section', async () => {
    await renderSettings();
    await waitFor(() => {
      expect(screen.getByText('settings.account_security')).toBeInTheDocument();
    });
  });
});
