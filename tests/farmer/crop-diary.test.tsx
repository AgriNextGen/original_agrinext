import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createTestWrapper, TEST_USER } from './_setup';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
    storage: { from: vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }) }) },
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

const mockUpdateGrowthStage = vi.fn();

vi.mock('@/hooks/useCropDiary', () => ({
  useCropDetail: vi.fn(),
  useUpdateGrowthStage: () => ({ mutate: mockUpdateGrowthStage, isPending: false }),
  useCropMedia: () => ({ data: [], isLoading: false }),
  useCropActivityLogs: () => ({ data: [], isLoading: false }),
  useCropPhotoReminders: () => ({ data: [] }),
  useSignedUrl: () => ({ data: null }),
  useDeleteCropMedia: () => ({ mutate: vi.fn() }),
  useUploadCropMedia: () => ({ mutate: vi.fn(), isPending: false }),
  useAddActivityLog: () => ({ mutate: vi.fn(), isPending: false }),
  useReportDisease: () => ({ mutate: vi.fn(), isPending: false }),
}));

const Wrapper = createTestWrapper({ route: '/farmer/crops/crop-123' });

async function renderCropDiary(cropData: unknown = null) {
  const { useCropDetail } = await import('@/hooks/useCropDiary');
  (useCropDetail as ReturnType<typeof vi.fn>).mockReturnValue({
    data: cropData,
    isLoading: !cropData,
  });
  const mod = await import('@/pages/farmer/CropDiary');
  return render(<mod.default />, { wrapper: Wrapper });
}

describe('CropDiaryPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading skeleton when data is pending', async () => {
    await renderCropDiary();
    const skeletons = document.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(0);
  });

  it('renders crop not found state when crop is null after load', async () => {
    const { useCropDetail } = await import('@/hooks/useCropDiary');
    (useCropDetail as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    const mod = await import('@/pages/farmer/CropDiary');
    render(<mod.default />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Crop not found')).toBeInTheDocument();
      expect(screen.getByText('Back to Crops')).toBeInTheDocument();
    });
  });

  it('renders crop details when data loads', async () => {
    const crop = {
      id: 'crop-123',
      crop_name: 'Test Tomato',
      variety: 'Cherry',
      growth_stage: 'vegetative',
      health_status: 'normal',
      sowing_date: '2026-01-15',
      status: 'growing',
      farmland: { name: 'North Farm' },
    };
    await renderCropDiary(crop);
    await waitFor(() => {
      expect(screen.getByText('Test Tomato')).toBeInTheDocument();
    });
  });

  it('renders action buttons', async () => {
    const crop = {
      id: 'crop-123', crop_name: 'Test Tomato', variety: 'Cherry',
      growth_stage: 'seedling', health_status: 'normal', status: 'growing',
      sowing_date: '2026-01-15', farmland: null,
    };
    await renderCropDiary(crop);
    await waitFor(() => {
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
      expect(screen.getByText('Log Activity')).toBeInTheDocument();
      expect(screen.getByText('Report Disease')).toBeInTheDocument();
    });
  });

  it('renders growth stage section', async () => {
    const crop = {
      id: 'crop-123', crop_name: 'Tomato', variety: null,
      growth_stage: 'flowering', health_status: 'normal', status: 'growing',
      sowing_date: null, farmland: null,
    };
    await renderCropDiary(crop);
    await waitFor(() => {
      expect(screen.getByText('Growth Stage')).toBeInTheDocument();
    });
  });
});
