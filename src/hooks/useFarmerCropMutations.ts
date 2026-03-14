import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateCropParams {
  crop_name: string;
  variety?: string | null;
  land_id?: string | null;
  sowing_date?: string | null;
  harvest_estimate?: string | null;
  status: string;
  estimated_quantity?: number | null;
  quantity_unit?: string;
}

export function useCreateCrop() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCropParams) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('crops').insert({
        farmer_id: user.id,
        crop_name: params.crop_name,
        variety: params.variety ?? null,
        land_id: params.land_id ?? null,
        sowing_date: params.sowing_date ?? null,
        harvest_estimate: params.harvest_estimate ?? null,
        status: params.status,
        estimated_quantity: params.estimated_quantity ?? null,
        quantity_unit: params.quantity_unit ?? 'quintals',
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops', user?.id] });
    },
  });
}

export function useDeleteCrop() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cropId: string) => {
      const { error } = await supabase.from('crops').delete().eq('id', cropId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops', user?.id] });
    },
  });
}
