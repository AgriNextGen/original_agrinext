import { useInfiniteQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

export const useTransportRequestsInfinite = (filters?: { status?: string }) => {
  return useInfiniteQuery({
    queryKey: ['transport-requests-infinite', filters],
    queryFn: async ({ pageParam = null }) => {
      const data = await rpcJson('list_transport_requests_compact_v1', { p_filter: filters || {}, p_limit: 24, p_cursor: pageParam });
      return { items: data?.items || [], next_cursor: data?.next_cursor || null };
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
};

