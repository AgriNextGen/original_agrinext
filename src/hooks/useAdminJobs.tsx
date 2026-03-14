import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAdminJobsSummary() {
  return useQuery({
    queryKey: ['admin', 'jobs-summary'],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('admin-jobs-summary');
      if (error) throw error;
      return result;
    },
  });
}

export function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobType, payload }: { jobType: string; payload: any }) => {
      const { error } = await supabase.functions.invoke('admin-enqueue', {
        body: { job_type: jobType, payload },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs-summary'] });
    },
  });
}
