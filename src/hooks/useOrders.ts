import { useInfiniteQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

export const useOrdersInfinite = () => {
  return useInfiniteQuery({
    queryKey: ['orders-infinite'],
    queryFn: async ({ pageParam = null }) => {
      const data = await rpcJson('list_orders_compact_v1', { p_limit: 24, p_cursor: pageParam });
      return { items: data?.items || [], next_cursor: data?.next_cursor || null };
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
};

