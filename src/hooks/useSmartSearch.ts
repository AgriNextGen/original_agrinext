import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { rpcJson, rpcMutate } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';

export function useSmartSearch() {
  const { user } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [suggestedFilters, setSuggestedFilters] = useState<Record<string, string> | null>(null);

  const submitSearch = useMutation({
    mutationFn: async (queryText: string) => {
      const id = await rpcMutate('enqueue_job_v1', {
        p_job_type: 'ai_search_intent_v1',
        p_payload: { query_text: queryText, actor_id: user?.id },
        p_run_at: new Date().toISOString(),
        p_idempotency_key: null,
      });
      setJobId(id);
      return id;
    },
  });

  const suggestionQuery = useQuery({
    queryKey: ['smart-search-suggestion', jobId],
    queryFn: async () => {
      const res = await rpcJson('admin.list_ai_outputs_v1', {
        p_filters: { target_type: 'search_intent', status: 'suggested' },
        p_limit: 5,
      });
      const items = (res?.items || []) as any[];
      if (items.length > 0) {
        const latest = items[0];
        setSuggestedFilters(latest.output?.suggested_filters ?? null);
        return latest;
      }
      return null;
    },
    enabled: !!jobId,
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  return { submitSearch, suggestedFilters, setSuggestedFilters, isSearching: submitSearch.isPending, suggestion: suggestionQuery.data };
}
