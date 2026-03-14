import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmerProfile } from '@/hooks/useFarmerDashboard';

export interface WeatherData {
  temp_c: number;
  humidity: number;
  wind_kmh: number;
  description: string;
  icon: string;
  forecast_short: string;
  fetched_at: string;
  location: string;
}

interface WeatherResponse {
  data?: WeatherData | null;
  cached: boolean;
  stale?: boolean;
  cache_age_minutes?: number;
  message?: string;
}

export function useWeather() {
  const { data: profile, isLoading: profileLoading } = useFarmerProfile();
  const hasLocation = !!(profile?.village || profile?.district || profile?.pincode);

  const query = useQuery<WeatherResponse>({
    queryKey: ['weather', profile?.id, profile?.village],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke<WeatherResponse>('get-weather', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.data) throw new Error(data?.message || 'Could not load weather');
      return data;
    },
    enabled: !profileLoading && hasLocation,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    weather: query.data?.data ?? null,
    isCached: query.data?.cached ?? false,
    isStale: query.data?.stale ?? false,
    isLoading: profileLoading || query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error ? 'Could not load weather' : null,
    hasLocation,
    profileLoading,
    refetch: query.refetch,
  };
}
