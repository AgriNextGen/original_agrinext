import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcJson, rpcMutate } from '@/lib/readApi';

export interface SupportTicket {
  id: string;
  created_by: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  status: string;
  priority: string;
  assigned_admin: string | null;
  role: string | null;
  updated_at: string;
  created_at: string;
}

interface TicketsPage {
  items: SupportTicket[];
  next_cursor: { updated_at: string; id: string } | null;
}

export function useAdminTickets(filters: Record<string, string> = {}) {
  return useInfiniteQuery<TicketsPage>({
    queryKey: ['admin-tickets', filters],
    queryFn: async ({ pageParam }) => {
      return await rpcJson('admin.list_tickets_v1', {
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

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, adminId }: { ticketId: string; adminId: string }) =>
      rpcMutate('admin.assign_ticket_v1', { p_ticket_id: ticketId, p_admin_user_id: adminId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, status, note }: { ticketId: string; status: string; note?: string }) =>
      rpcMutate('admin.update_ticket_status_v2', { p_ticket_id: ticketId, p_status: status, p_note: note ?? null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });
}
