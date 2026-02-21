import { useInfiniteQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';

export const useAgentTasksInfinite = () => {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['agent-tasks-infinite', user?.id],
    enabled: !!user?.id,
    queryFn: async ({ pageParam = null }) => {
      const data = await rpcJson('list_agent_tasks_compact_v1', { p_agent_id: user?.id, p_limit: 24, p_cursor: pageParam });
      return { items: data?.items || [], next_cursor: data?.next_cursor || null };
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
};

