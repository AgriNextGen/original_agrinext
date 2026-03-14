import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createMockSupabase, TEST_USER } from './_setup';

const mockSupabase = createMockSupabase();
vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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

vi.mock('@/hooks/useRealtimeSubscriptions', () => ({
  useRealtimeSubscriptions: vi.fn(),
}));

vi.mock('@/lib/readApi', () => ({
  rpcJson: vi.fn(),
}));

import { rpcJson } from '@/lib/readApi';

function freshWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(MemoryRouter, { initialEntries: ['/farmer/dashboard'] }, children));
}

async function renderDashboard() {
  const mod = await import('@/pages/farmer/Dashboard');
  return render(<mod.default />, { wrapper: freshWrapper() });
}

describe('FarmerDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading skeleton while data is pending', async () => {
    (rpcJson as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    await renderDashboard();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state with retry button on query failure', async () => {
    (rpcJson as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    }, { timeout: 10000 });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  }, 15000);

  it('renders dashboard widgets on successful data load', async () => {
    (rpcJson as ReturnType<typeof vi.fn>).mockResolvedValue({
      farmlands: [], crops: [], transport_requests: [], notifications: [],
    });
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('dashboard.welcome')).toBeInTheDocument();
    });
  });

  it('retry button is clickable', async () => {
    (rpcJson as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    }, { timeout: 10000 });
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn.closest('button')).not.toBeDisabled();
  }, 15000);
});
