import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcJson, rpcMutate } from '@/lib/readApi';

export interface OpsInboxItem {
  id: string;
  item_type: string;
  entity_type: string;
  entity_id: string;
  severity: string;
  status: string;
  summary: string | null;
  metadata: Record<string, any>;
  updated_at: string;
}

interface OpsInboxPage {
  items: OpsInboxItem[];
  next_cursor: { updated_at: string; id: string } | null;
}

export function useOpsInbox(filters: Record<string, string> = {}) {
  return useInfiniteQuery<OpsInboxPage>({
    queryKey: ['ops-inbox', filters],
    queryFn: async ({ pageParam }) => {
      const res = await rpcJson('admin.get_ops_inbox_v1', {
        p_filters: filters,
        p_limit: 30,
        p_cursor: pageParam ?? null,
      });
      return res as OpsInboxPage;
    },
    initialPageParam: null as any,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useResolveOpsItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase
        .from('ops_inbox_items')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ops-inbox'] }),
  });
}
