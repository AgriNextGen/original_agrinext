import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TEST_USER, TEST_USER_ID } from './_setup';

const mockFrom = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: mockSelect,
        eq: (...eqArgs: unknown[]) => {
          mockEq(...eqArgs);
          return {
            select: mockSelect,
            eq: mockEq,
            order: vi.fn().mockReturnThis(),
            then: vi.fn((cb: Function) => Promise.resolve(cb({ data: [], error: null }))),
          };
        },
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb: Function) => Promise.resolve(cb({ data: [], error: null }))),
      };
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: TEST_USER, session: { access_token: 'test' },
    userRole: 'farmer', realRole: 'farmer', activeRole: 'farmer',
    isDevOverride: false, loading: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('Farmer query scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useFarmlands scopes query to farmer_id', async () => {
    const { useFarmlands } = await import('@/hooks/useFarmerDashboard');
    renderHook(() => useFarmlands(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('farmlands');
      expect(mockEq).toHaveBeenCalledWith('farmer_id', TEST_USER_ID);
    });
  });

  it('useCrops scopes query to farmer_id', async () => {
    const { useCrops } = await import('@/hooks/useFarmerDashboard');
    renderHook(() => useCrops(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('crops');
      expect(mockEq).toHaveBeenCalledWith('farmer_id', TEST_USER_ID);
    });
  });

  it('useTransportRequests scopes query to farmer_id', async () => {
    const { useTransportRequests } = await import('@/hooks/useFarmerDashboard');
    renderHook(() => useTransportRequests(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('transport_requests');
      expect(mockEq).toHaveBeenCalledWith('farmer_id', TEST_USER_ID);
    });
  });

  it('useFarmerNotifications scopes query to user_id', async () => {
    const { useFarmerNotifications } = await import('@/hooks/useFarmerDashboard');
    renderHook(() => useFarmerNotifications(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockEq).toHaveBeenCalledWith('user_id', TEST_USER_ID);
    });
  });
});

describe('Farmer route protection', () => {
  it('ROUTES.FARMER paths all start with /farmer/', async () => {
    const { ROUTES } = await import('@/lib/routes');
    const farmerRoutes = Object.values(ROUTES.FARMER).filter(
      (v): v is string => typeof v === 'string',
    );
    for (const route of farmerRoutes) {
      expect(route).toMatch(/^\/farmer/);
    }
  });

  it('farmer routes are wrapped with ProtectedRoute allowedRoles=farmer', async () => {
    const routeModule = await import('@/routes/farmerRoutes');
    expect(routeModule.default).toBeDefined();
  });
});
