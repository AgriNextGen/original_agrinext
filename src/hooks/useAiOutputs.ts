import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcJson, rpcMutate } from '@/lib/readApi';

export interface AiOutput {
  id: string;
  target_type: string;
  target_id: string;
  provider: string;
  output: Record<string, any>;
  confidence: number | null;
  status: string;
  created_at: string;
}

interface AiOutputsPage {
  items: AiOutput[];
  next_cursor: { created_at: string; id: string } | null;
}

export function useAiOutputs(filters: Record<string, string> = {}) {
  return useInfiniteQuery<AiOutputsPage>({
    queryKey: ['ai-outputs', filters],
    queryFn: async ({ pageParam }) => {
      return await rpcJson('admin.list_ai_outputs_v1', {
        p_filters: filters,
        p_limit: 30,
        p_cursor: pageParam ?? null,
      });
    },
    initialPageParam: null as any,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAcceptAiSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ outputId, accept }: { outputId: string; accept: boolean }) =>
      rpcMutate('admin.accept_ai_suggestion_v1', { p_ai_output_id: outputId, p_accept: accept }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-outputs'] });
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });
}
