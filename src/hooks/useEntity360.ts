import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rpcJson, rpcMutate } from '@/lib/readApi';

export interface Entity360Data {
  entity_type: string;
  entity_id: string;
  core: Record<string, any> | null;
  timeline: Array<{ created_at: string; event_type: string; actor_user_id: string; metadata: Record<string, any> }>;
  tickets: Array<{ id: string; category: string; message: string; status: string; priority: string; created_at: string }>;
  related: Record<string, string | null>;
  security_events_30d: number;
}

export function useEntity360(entityType: string, entityId: string) {
  return useQuery<Entity360Data>({
    queryKey: ['entity-360', entityType, entityId],
    queryFn: () => rpcJson('admin.entity_360_v1', { p_entity_type: entityType, p_entity_id: entityId }),
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAiTimelineSummary(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['ai-timeline-summary', entityType, entityId],
    queryFn: async () => {
      const res = await rpcJson('admin.list_ai_outputs_v1', {
        p_filters: { status: 'suggested', target_type: 'timeline' },
        p_limit: 1,
      });
      const items = (res?.items || []) as any[];
      return items.find((i: any) => i.target_id === entityId) ?? null;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
}

export function useLockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, lock }: { userId: string; lock: boolean }) =>
      rpcMutate('admin.lock_user_v1', { p_user_id: userId, p_lock: lock }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useUnlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      rpcMutate('admin.unlock_user_v1', { p_user_id: userId, p_reason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useOverrideTripStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripId, newStatus, reason }: { tripId: string; newStatus: string; reason: string }) =>
      rpcMutate('admin.override_trip_status_v1', { p_trip_id: tripId, p_new_status: newStatus, p_reason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useOverrideOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, newStatus, reason }: { orderId: string; newStatus: string; reason: string }) =>
      rpcMutate('admin.admin_override_order_v1', { p_order_id: orderId, p_new_status: newStatus, p_reason: reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useForceLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      rpcMutate('admin.force_logout_user_v1', { p_user_id: userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useSetAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newStatus, reason, blockedUntil }: { userId: string; newStatus: string; reason?: string; blockedUntil?: string | null }) =>
      rpcMutate('admin.set_account_status_v1', { p_user_id: userId, p_new_status: newStatus, p_reason: reason || null, p_blocked_until: blockedUntil || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useResetRiskScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      rpcMutate('admin.reset_risk_score_v1', { p_user_id: userId, p_reason: reason || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}

export function useAddRiskScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, delta, reason }: { userId: string; delta: number; reason?: string }) =>
      rpcMutate('admin.add_risk_score_v1', { p_user_id: userId, p_delta: delta, p_reason: reason || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entity-360'] }),
  });
}
