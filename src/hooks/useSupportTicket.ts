import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcMutate } from '@/lib/readApi';

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      category,
      entityType,
      entityId,
      message,
    }: {
      category: string;
      entityType?: string;
      entityId?: string;
      message: string;
    }) =>
      rpcMutate('create_support_ticket_v2', {
        p_category: category,
        p_entity_type: entityType ?? null,
        p_entity_id: entityId ?? null,
        p_message: message,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-tickets'] });
      qc.invalidateQueries({ queryKey: ['farmer-dashboard'] });
    },
  });
}
