import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface KarnatakaDistrict {
  id: string;
  district: string;
}

// Fetch all Karnataka districts
export const useKarnatakaDistricts = () => {
  return useQuery({
    queryKey: ['karnataka-districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('karnataka_districts')
        .select('*')
        .order('district', { ascending: true });

      if (error) throw error;
      return data as KarnatakaDistrict[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (districts rarely change)
  });
};

// Check if farmer's district is valid (exists in karnataka_districts)
export const useIsDistrictValid = (district: string | null | undefined) => {
  const { data: districts } = useKarnatakaDistricts();
  
  if (!district || !districts) return false;
  
  return districts.some(
    d => d.district.toLowerCase() === district.toLowerCase()
  );
};

// Hook to check if farmer needs to set their district
export const useFarmerNeedsDistrict = () => {
  const { user } = useAuth();
  const { data: districts, isLoading: districtsLoading } = useKarnatakaDistricts();

  return useQuery({
    queryKey: ['farmer-needs-district', user?.id],
    queryFn: async () => {
      if (!user?.id) return { needsDistrict: false, profile: null };

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, district, village, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Check if district is null or not in the valid list
      const hasValidDistrict = profile?.district && districts?.some(
        d => d.district.toLowerCase() === profile.district?.toLowerCase()
      );

      return {
        needsDistrict: !hasValidDistrict,
        profile,
      };
    },
    enabled: !!user?.id && !districtsLoading && !!districts,
  });
};

// Mutation to update farmer's location
export const useUpdateFarmerLocation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      district: string;
      village?: string;
      taluk?: string;
      pincode?: string;
      district_source?: 'user' | 'pincode' | 'agent' | 'unknown';
      district_confidence?: 'high' | 'medium' | 'low';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          district: data.district,
          village: data.village || null,
          taluk: data.taluk || null,
          pincode: data.pincode || null,
          district_source: data.district_source || 'user',
          district_confidence: data.district_confidence || 'high',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmer-profile'] });
      queryClient.invalidateQueries({ queryKey: ['farmer-needs-district'] });
      queryClient.invalidateQueries({ queryKey: ['market-prices'] });
      queryClient.invalidateQueries({ queryKey: ['all-market-prices'] });
      toast.success('Location saved! You\'ll now see personalized market data.');
    },
    onError: (error) => {
      toast.error('Failed to save location: ' + error.message);
    },
  });
};
