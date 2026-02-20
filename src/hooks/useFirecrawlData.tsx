import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFarmerProfile, useCrops } from '@/hooks/useFarmerDashboard';

export interface MarketPriceAgg {
  id: string;
  crop_name: string;
  district: string;
  state: string;
  modal_price: number | null;
  unit: string;
  confidence: 'low' | 'medium' | 'high' | null;
  sources_count: number;
  sources_used: string[] | null;
  fetched_at: string;
}

export interface AgriAdvisory {
  id: string;
  state: string;
  district: string | null;
  crop_name: string | null;
  title: string;
  summary: string | null;
  recommended_actions: string | null;
  published_date: string | null;
  source_url: string | null;
  fetched_at: string;
}

export interface SchemeCatalog {
  id: string;
  state: string;
  scheme_name: string;
  eligibility: string | null;
  benefits: string | null;
  documents: string | null;
  apply_steps: string | null;
  deadline: string | null;
  official_link: string | null;
  fetched_at: string;
}

// Fetch aggregated market prices for farmer's district and crops
export const useMarketPricesAgg = () => {
  const { data: profile } = useFarmerProfile();
  const { data: crops } = useCrops();
  
  const district = profile?.district;
  const cropNames = [...new Set(crops?.filter(c => c.status !== 'harvested').map(c => c.crop_name) || [])];

  return useQuery({
    queryKey: ['market-prices-agg', district, cropNames],
    queryFn: async () => {
      if (!district) return [];

      let query = supabase
        .from('market_prices_agg')
        .select('*')
        .eq('district', district)
        .order('fetched_at', { ascending: false });

      if (cropNames.length > 0) {
        query = query.in('crop_name', cropNames);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data as MarketPriceAgg[];
    },
    enabled: !!district,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Fetch all aggregated prices (fallback when no district)
export const useAllMarketPricesAgg = () => {
  return useQuery({
    queryKey: ['all-market-prices-agg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_prices_agg')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as MarketPriceAgg[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

// Fetch advisories for farmer's district and crops
export const useAgriAdvisories = () => {
  const { data: profile } = useFarmerProfile();
  const { data: crops } = useCrops();
  
  const district = profile?.district;
  const cropNames = [...new Set(crops?.filter(c => c.status !== 'harvested').map(c => c.crop_name) || [])];

  return useQuery({
    queryKey: ['agri-advisories', district, cropNames],
    queryFn: async () => {
      let query = supabase
        .from('agri_advisories')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (district) {
        query = query.or(`district.is.null,district.ilike.%${district}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data as AgriAdvisory[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Fetch schemes catalog
export const useSchemesCatalog = () => {
  return useQuery({
    queryKey: ['schemes-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schemes_catalog')
        .select('*')
        .eq('state', 'Karnataka')
        .order('fetched_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as SchemeCatalog[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Fetch crop calendar for farmer's crops
export const useCropCalendar = () => {
  const { data: crops } = useCrops();
  const cropNames = [...new Set(crops?.filter(c => c.status !== 'harvested').map(c => c.crop_name) || [])];

  return useQuery({
    queryKey: ['crop-calendar', cropNames],
    queryFn: async () => {
      if (cropNames.length === 0) return [];

      const { data, error } = await supabase
        .from('crop_calendar')
        .select('*')
        .in('crop_name', cropNames)
        .order('fetched_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: cropNames.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};
