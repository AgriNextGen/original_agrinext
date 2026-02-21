import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpcMutate } from '@/lib/readApi';
import { useAuth } from '@/hooks/useAuth';

export interface ServiceArea {
  id: string;
  role_scope: string;
  user_id: string;
  state_id: string | null;
  district_id: string | null;
  market_id: string | null;
  radius_km: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  district_name?: string;
  state_name?: string;
}

export function useMyServiceAreas(roleScope: string) {
  const { user } = useAuth();
  return useQuery<ServiceArea[]>({
    queryKey: ['service-areas', user?.id, roleScope],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('geo_service_areas')
        .select('*')
        .eq('user_id', user.id)
        .eq('role_scope', roleScope)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = (data ?? []) as ServiceArea[];
      const districtIds = items.map((a) => a.district_id).filter(Boolean) as string[];
      if (districtIds.length > 0) {
        const { data: districts } = await supabase
          .from('geo_districts')
          .select('id, name_en, state_id')
          .in('id', districtIds);
        const dMap = new Map((districts ?? []).map((d: any) => [d.id, d]));
        for (const item of items) {
          const d = dMap.get(item.district_id!);
          if (d) item.district_name = d.name_en;
        }
      }
      return items;
    },
    enabled: !!user?.id,
  });
}

export function useUpsertServiceArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      role_scope: string;
      state_id?: string;
      district_id?: string;
      market_id?: string;
      radius_km?: number;
      is_active?: boolean;
    }) => {
      return rpcMutate('upsert_service_area_v1', {
        p_role_scope: params.role_scope,
        p_state_id: params.state_id || null,
        p_district_id: params.district_id || null,
        p_market_id: params.market_id || null,
        p_radius_km: params.radius_km ?? null,
        p_is_active: params.is_active ?? true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-areas'] });
    },
  });
}

export function useDeleteServiceArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => rpcMutate('delete_service_area_v1', { p_id: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-areas'] });
    },
  });
}

export function useSetProfileGeo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      state_id?: string;
      district_id?: string;
      market_id?: string;
    }) => {
      return rpcMutate('set_profile_geo_v1', {
        p_state_id: params.state_id || null,
        p_district_id: params.district_id || null,
        p_market_id: params.market_id || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer-profile'] });
      qc.invalidateQueries({ queryKey: ['agent-profile'] });
      qc.invalidateQueries({ queryKey: ['transporter-profile'] });
      qc.invalidateQueries({ queryKey: ['buyer-profile'] });
    },
  });
}
