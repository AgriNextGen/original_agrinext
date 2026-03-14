import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateFarmlandParams {
  name: string;
  area: number;
  area_unit: string;
  soil_type?: string | null;
  village?: string | null;
  district?: string | null;
  location_lat?: number | null;
  location_long?: number | null;
  geo_verified?: boolean;
}

export function useCreateFarmland() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateFarmlandParams) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('farmlands').insert({
        farmer_id: user.id,
        name: params.name,
        area: params.area,
        area_unit: params.area_unit,
        soil_type: params.soil_type ?? null,
        village: params.village ?? null,
        district: params.district ?? null,
        location_lat: params.location_lat ?? null,
        location_long: params.location_long ?? null,
        geo_verified: params.geo_verified ?? false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmlands', user?.id] });
    },
  });
}

export function useDeleteFarmland() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (farmlandId: string) => {
      const { error } = await supabase.from('farmlands').delete().eq('id', farmlandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmlands', user?.id] });
    },
  });
}
