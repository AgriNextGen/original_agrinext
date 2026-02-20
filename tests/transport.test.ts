/**
 * Transport Edge Function integration tests
 * Tests accept-load and update-trip-status invocation logic via useTrips hooks.
 * Run with: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAcceptLoadSecure, useUpdateTripStatusSecure } from '@/hooks/useTrips';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAcceptLoadSecure', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('invokes accept-load with correct payload', async () => {
    mockInvoke.mockResolvedValue({ data: { trip: { id: 'trip-1' }, new_status: 'assigned' }, error: null });

    const { result } = renderHook(() => useAcceptLoadSecure(), { wrapper: createWrapper() });
    result.current.mutate({ transportRequestId: 'req-1', vehicleId: 'veh-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith('accept-load', {
      body: { transport_request_id: 'req-1', vehicle_id: 'veh-1' },
    });
  });

  it('throws on data.error (e.g. ALREADY_ASSIGNED)', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'ALREADY_ASSIGNED: This load has already been accepted' },
      error: null,
    });

    const { result } = renderHook(() => useAcceptLoadSecure(), { wrapper: createWrapper() });
    result.current.mutate({ transportRequestId: 'req-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('ALREADY_ASSIGNED');
  });

  it('throws on invoke error (network)', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useAcceptLoadSecure(), { wrapper: createWrapper() });
    result.current.mutate({ transportRequestId: 'req-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Failed to fetch');
  });
});

describe('useUpdateTripStatusSecure', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('invokes update-trip-status with correct payload', async () => {
    mockInvoke.mockResolvedValue({ data: { new_status: 'picked_up' }, error: null });

    const { result } = renderHook(() => useUpdateTripStatusSecure(), { wrapper: createWrapper() });
    result.current.mutate({
      tripId: 'trip-1',
      newStatus: 'picked_up',
      note: 'Picked up',
      proofPaths: ['path/to/proof.jpg'],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInvoke).toHaveBeenCalledWith('update-trip-status', {
      body: {
        trip_id: 'trip-1',
        new_status: 'picked_up',
        note: 'Picked up',
        proof_paths: ['path/to/proof.jpg'],
      },
    });
  });

  it('throws on data.error (e.g. validation)', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'trip_id and new_status required' },
      error: null,
    });

    const { result } = renderHook(() => useUpdateTripStatusSecure(), { wrapper: createWrapper() });
    result.current.mutate({ tripId: 'trip-1', newStatus: '' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('required');
  });
});
