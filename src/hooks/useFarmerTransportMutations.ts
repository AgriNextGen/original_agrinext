import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateTransportRequestParams {
  crop_id?: string | null;
  quantity: number;
  quantity_unit: string;
  pickup_location: string;
  pickup_village?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  notes?: string | null;
  origin_district_id?: string | null;
  dest_district_id?: string | null;
}

export function useCreateTransportRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTransportRequestParams) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('transport_requests').insert({
        farmer_id: user.id,
        crop_id: params.crop_id ?? null,
        quantity: params.quantity,
        quantity_unit: params.quantity_unit,
        pickup_location: params.pickup_location,
        pickup_village: params.pickup_village ?? null,
        preferred_date: params.preferred_date ?? null,
        preferred_time: params.preferred_time ?? null,
        notes: params.notes ?? null,
        origin_district_id: params.origin_district_id ?? null,
        dest_district_id: params.dest_district_id ?? null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-requests', user?.id] });
    },
  });
}

export function useCancelTransportRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('cancel_transport_request_v1', {
        p_request_id: requestId,
      } as any);
      if (error) throw error;
      const result = data as { success: boolean; error_code?: string };
      if (!result.success) throw new Error('This request has already been assigned and cannot be cancelled');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport-requests', user?.id] });
    },
  });
}
