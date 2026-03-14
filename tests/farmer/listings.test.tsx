import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTestWrapper, createMockSupabase, makeListing, TEST_USER } from './_setup';

const mockSupabase = createMockSupabase({
  listings: { data: [], error: null },
});
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

vi.mock('@/hooks/useTraceability', () => ({
  useHarvestReadyCrops: () => ({ data: [], isLoading: false }),
  useSaveTraceSettings: () => ({ mutate: vi.fn() }),
  useCreateListingFromCrop: () => ({ mutate: vi.fn() }),
  DEFAULT_TRACE_SETTINGS: {
    show_origin: true, show_crop_details: true, show_photos: false,
    show_soil_report: false, show_activity_log: false,
  },
}));

const testListings = [
  makeListing({ title: 'Fresh Tomatoes', category: 'vegetable', price: 25, quantity: 100, is_active: true }),
  makeListing({ title: 'Organic Onions', category: 'vegetable', price: 30, quantity: 50, is_active: false }),
];

const Wrapper = createTestWrapper({ route: '/farmer/listings' });

async function renderListings(listings = testListings) {
  mockSupabase.from.mockImplementation(() => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn((cb: Function) => Promise.resolve(cb({ data: listings, error: null }))),
    };
    return chain;
  });
  const mod = await import('@/pages/farmer/Listings');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('FarmerListings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders listing cards with titles', async () => {
    await renderListings();
    await waitFor(() => {
      expect(screen.getByText('Fresh Tomatoes')).toBeInTheDocument();
      expect(screen.getByText('Organic Onions')).toBeInTheDocument();
    });
  });

  it('add listing button is present', async () => {
    await renderListings();
    await waitFor(() => {
      expect(screen.getByText('farmer.listings.addListing')).toBeInTheDocument();
    });
  });

  it('listing menu buttons are present', async () => {
    await renderListings();
    await waitFor(() => {
      const menuButtons = screen.getAllByLabelText('Listing menu');
      expect(menuButtons.length).toBe(2);
    });
  });

  it('renders empty state when no listings', async () => {
    await renderListings([]);
    await waitFor(() => {
      expect(screen.getByText('farmer.listings.noListingsYet')).toBeInTheDocument();
    });
  });

  it('displays price and quantity for each listing', async () => {
    await renderListings();
    await waitFor(() => {
      expect(screen.getByText('Fresh Tomatoes')).toBeInTheDocument();
    });
  });
});
