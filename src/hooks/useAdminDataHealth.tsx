import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrustedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  state: string;
  district: string | null;
  active: boolean;
  last_crawled_at: string | null;
  crawl_frequency_hours: number;
}

interface FarmerSegment {
  segment_key: string;
  district: string;
  crop_canonical: string;
  active_farmer_count: number;
  last_crawled_at: string | null;
  crawl_frequency_hours: number;
}

interface WebFetchLog {
  id: string;
  endpoint: string;
  query: string | null;
  success: boolean;
  latency_ms: number | null;
  http_status: number | null;
  error: string | null;
  fetched_at: string;
}

interface PriceConfidenceStats {
  high: number;
  medium: number;
  low: number;
}

export function useTrustedSources() {
  return useQuery({
    queryKey: ['admin-trusted-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_sources')
        .select('*')
        .order('last_crawled_at', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as TrustedSource[];
    },
  });
}

export function useFarmerSegments() {
  return useQuery({
    queryKey: ['admin-farmer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmer_segments')
        .select('*')
        .gt('active_farmer_count', 0)
        .order('last_crawled_at', { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as FarmerSegment[];
    },
  });
}

export function useWebFetchLogs() {
  return useQuery({
    queryKey: ['admin-web-fetch-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('web_fetch_logs')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as WebFetchLog[];
    },
  });
}

export function usePriceConfidence() {
  return useQuery({
    queryKey: ['admin-price-confidence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_prices_agg')
        .select('confidence');
      if (error) throw error;

      const stats: PriceConfidenceStats = { high: 0, medium: 0, low: 0 };
      data?.forEach((row: { confidence: string | null }) => {
        if (row.confidence === 'high') stats.high++;
        else if (row.confidence === 'medium') stats.medium++;
        else stats.low++;
      });
      return stats;
    },
  });
}
