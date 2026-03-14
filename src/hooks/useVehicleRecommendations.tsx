import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIME } from '@/lib/constants';
import type { VehicleRecommendationRow } from '@/services/logistics/types';

const REC_QUERY_KEYS = {
  forPool: (poolId: string) => ['recommendations', 'pool', poolId],
  forVehicle: (vehicleId: string) => ['recommendations', 'vehicle', vehicleId],
  pending: (transporterId: string) => ['recommendations', 'pending', transporterId],
  all: ['recommendations'],
} as const;

export function useVehicleRecommendationsForPool(poolId: string) {
  return useQuery({
    queryKey: REC_QUERY_KEYS.forPool(poolId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_recommendations')
        .select('*')
        .eq('load_pool_id', poolId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('recommendation_score', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as VehicleRecommendationRow[];
    },
    enabled: !!poolId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useLoadRecommendationsForVehicle(vehicleId: string) {
  return useQuery({
    queryKey: REC_QUERY_KEYS.forVehicle(vehicleId),
    queryFn: async () => {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, capacity_kg')
        .eq('id', vehicleId)
        .maybeSingle();

      if (!vehicle) return [];

      const veh = vehicle as { id: string; capacity_kg: number };

      const { data: pools, error } = await supabase
        .from('load_pools')
        .select('id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, created_at')
        .in('status', ['open', 'filling', 'full'])
        .lte('total_weight_kg', veh.capacity_kg)
        .order('total_weight_kg', { ascending: false })
        .limit(10);

      if (error) throw new Error(error.message);
      return pools ?? [];
    },
    enabled: !!vehicleId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function usePendingRecommendations() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: REC_QUERY_KEYS.pending(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_recommendations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('recommendation_score', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as VehicleRecommendationRow[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useAcceptRecommendation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { data: rec } = await supabase
        .from('vehicle_recommendations')
        .select('load_pool_id, vehicle_id')
        .eq('id', recommendationId)
        .maybeSingle();

      if (!rec) throw new Error('Recommendation not found');
      const row = rec as { load_pool_id: string; vehicle_id: string };

      const { error } = await supabase
        .from('vehicle_recommendations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);

      if (error) throw new Error(error.message);

      await supabase
        .from('vehicle_recommendations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('load_pool_id', row.load_pool_id)
        .eq('status', 'pending')
        .neq('id', recommendationId);

      return { recommendation_id: recommendationId, pool_id: row.load_pool_id, vehicle_id: row.vehicle_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REC_QUERY_KEYS.all });
      toast({ title: t('hookToasts.vehicleRecommendations.accepted'), description: t('hookToasts.vehicleRecommendations.acceptedDesc') });
    },
    onError: (error: Error) => {
      toast({ title: t('hookToasts.vehicleRecommendations.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectRecommendation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('vehicle_recommendations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', recommendationId)
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REC_QUERY_KEYS.all });
      toast({ title: t('hookToasts.vehicleRecommendations.rejected') });
    },
    onError: (error: Error) => {
      toast({ title: t('hookToasts.vehicleRecommendations.error'), description: error.message, variant: 'destructive' });
    },
  });
}
