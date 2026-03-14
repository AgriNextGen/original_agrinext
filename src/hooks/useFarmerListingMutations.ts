import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ListingData {
  crop_id?: string | null;
  crop_name: string;
  variety?: string | null;
  quantity: number;
  quantity_unit: string;
  price_per_unit: number;
  description?: string | null;
  harvest_date?: string | null;
  origin_district_id?: string | null;
  origin_market_id?: string | null;
  [key: string]: unknown;
}

export function useCreateListing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ListingData) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('listings')
        .insert([{ ...params, farmer_id: user.id, status: 'approved', is_active: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ListingData> }) => {
      const { error } = await supabase.from('listings').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from('listings').delete().eq('id', listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useToggleListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentActive }: { id: string; currentActive: boolean }) => {
      const { error } = await supabase
        .from('listings')
        .update({ is_active: !currentActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
