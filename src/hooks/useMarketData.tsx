import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PRICE_FORECASTS_ENABLED = String(import.meta.env.VITE_ENABLE_PRICE_FORECASTS ?? 'false').toLowerCase() === 'true';

export interface PriceForecast {
  id: string;
  crop_name: string;
  district: string;
  state: string;
  direction: 'up' | 'down' | 'stable';
  confidence: 'low' | 'medium' | 'high';
  reason: string;
  generated_at: string;
}

export interface MarketPriceAgg {
  id: string;
  crop_name: string;
  district: string;
  state: string | null;
  modal_price: number | null;
  min_price?: number | null;
  max_price?: number | null;
  unit: string | null;
  confidence: string | null;
  sources_count: number | null;
  freshness_minutes?: number | null;
  fetched_at: string | null;
}

export interface NeighborPrice {
  crop_name: string;
  district: string;
  modal_price: number | null;
  confidence: string | null;
  fetched_at: string | null;
}

type MarketPriceAggCompatRow = {
  id?: string;
  crop_name?: string | null;
  district?: string | null;
  avg_price?: number | null;
  date?: string | null;
  created_at?: string | null;
  trend_direction?: string | null;
  confidence?: string | null;
  sources_count?: number | null;
  unit?: string | null;
};

type MarketPriceRowCompat = {
  id?: string;
  crop_name?: string | null;
  district?: string | null;
  modal_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  date?: string | null;
  created_at?: string | null;
  mandi_name?: string | null;
};

function syntheticId(parts: Array<string | null | undefined>) {
  const token = parts
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join('|');
  return token || crypto.randomUUID();
}

function normalizeAggRow(row: MarketPriceAggCompatRow): MarketPriceAgg {
  return {
    id: row.id || syntheticId([row.crop_name ?? null, row.district ?? null, row.date ?? null]),
    crop_name: row.crop_name || 'Unknown Crop',
    district: row.district || 'Karnataka',
    state: 'Karnataka',
    modal_price: row.avg_price ?? null,
    min_price: null,
    max_price: null,
    unit: row.unit ?? 'qtl',
    confidence: row.confidence ?? null,
    sources_count: row.sources_count ?? null,
    fetched_at: row.date ?? row.created_at ?? null,
  };
}

function normalizeMarketPriceRow(row: MarketPriceRowCompat): MarketPriceAgg {
  return {
    id: row.id || syntheticId([row.crop_name ?? null, row.district ?? null, row.date ?? null, row.mandi_name ?? null]),
    crop_name: row.crop_name || 'Unknown Crop',
    district: row.district || 'Karnataka',
    state: 'Karnataka',
    modal_price: row.modal_price ?? null,
    min_price: row.min_price ?? null,
    max_price: row.max_price ?? null,
    unit: 'qtl',
    confidence: null,
    sources_count: null,
    fetched_at: row.date ?? row.created_at ?? null,
  };
}

function isMissingTableError(error: unknown, tableName: string) {
  const candidate = error as { code?: string; message?: string; details?: string };
  return candidate?.code === 'PGRST205' &&
    `${candidate?.message ?? ''} ${candidate?.details ?? ''}`.toLowerCase().includes(tableName.toLowerCase());
}

/**
 * Fetch neighbor districts for a given district
 */
export const useDistrictNeighbors = (district: string | null | undefined) => {
  return useQuery({
    queryKey: ['district-neighbors', district],
    queryFn: async () => {
      if (!district) return [];
      
      const { data, error } = await supabase
        .from('district_neighbors')
        .select('neighbor_district')
        .eq('district', district);
      
      if (error) {
        console.error('Error fetching neighbors:', error);
        return [];
      }
      
      return data?.map(d => d.neighbor_district) || [];
    },
    enabled: !!district,
    staleTime: 60 * 60 * 1000, // 1 hour - neighbors don't change often
  });
};

/**
 * 3-tier market prices fallback with neighbor comparison:
 * Tier A: Personalized (farmer district + crops)
 * Tier B: District default (farmer district, any crops)
 * Tier C: State default (Karnataka, any crops)
 */
export const useMarketPricesTiered = (
  district: string | null | undefined,
  cropNames: string[] = []
) => {
  return useQuery({
    queryKey: ['market-prices-tiered', district, cropNames],
    queryFn: async () => {
      // Tier A: Try personalized (district + crops)
      if (district && cropNames.length > 0) {
        const { data: tierA, error: errorA } = await supabase
          .from('market_prices_agg')
          .select('id,crop_name,district,avg_price,date,created_at,trend_direction')
          .eq('district', district)
          .in('crop_name', cropNames)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8);

        if (!errorA && tierA && tierA.length > 0) {
          return {
            tier: 'A' as const,
            data: (tierA as unknown as MarketPriceAggCompatRow[]).map(normalizeAggRow),
            label: `Prices for your crops in ${district}`,
          };
        }
      }

      // Tier B: District default (district, any crops)
      if (district) {
        const { data: tierB, error: errorB } = await supabase
          .from('market_prices_agg')
          .select('id,crop_name,district,avg_price,date,created_at,trend_direction')
          .eq('district', district)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6);

        if (!errorB && tierB && tierB.length > 0) {
          return {
            tier: 'B' as const,
            data: (tierB as unknown as MarketPriceAggCompatRow[]).map(normalizeAggRow),
            label: `Top prices in ${district}`,
          };
        }
      }

      // Tier C: Global latest aggregates (schema-compatible fallback)
      const { data: tierC, error: errorC } = await supabase
        .from('market_prices_agg')
        .select('id,crop_name,district,avg_price,date,created_at,trend_direction')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (!errorC && tierC && tierC.length > 0) {
        return {
          tier: 'C' as const,
          data: (tierC as unknown as MarketPriceAggCompatRow[]).map(normalizeAggRow),
          label: 'Karnataka mandi prices',
        };
      }

      // Fallback: Try raw market_prices table
      let fallbackQuery = supabase
        .from('market_prices')
        .select('id,crop_name,district,modal_price,min_price,max_price,date,created_at,mandi_name')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (district) {
        fallbackQuery = fallbackQuery.eq('district', district);
      }

      let { data: fallback, error: fallbackError } = await fallbackQuery;

      if ((!fallback || fallback.length === 0) && district) {
        const rawFallback = await supabase
          .from('market_prices')
          .select('id,crop_name,district,modal_price,min_price,max_price,date,created_at,mandi_name')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6);
        fallback = rawFallback.data;
        fallbackError = rawFallback.error;
      }

      if (!fallbackError && fallback && fallback.length > 0) {
        const transformed: MarketPriceAgg[] = (fallback as unknown as MarketPriceRowCompat[])
          .map(normalizeMarketPriceRow);
        return { tier: 'C' as const, data: transformed, label: 'Karnataka mandi prices' };
      }

      return { tier: 'C' as const, data: [] as MarketPriceAgg[], label: 'No price data available' };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch neighbor district prices for comparison
 */
export const useNeighborPrices = (
  neighborDistricts: string[],
  cropNames: string[]
) => {
  return useQuery({
    queryKey: ['neighbor-prices', neighborDistricts, cropNames],
    queryFn: async () => {
      if (neighborDistricts.length === 0 || cropNames.length === 0) {
        return {} as Record<string, NeighborPrice>;
      }

      const { data, error } = await supabase
        .from('market_prices_agg')
        .select('crop_name, district, avg_price, date, created_at')
        .in('district', neighborDistricts)
        .in('crop_name', cropNames)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching neighbor prices:', error);
        return {} as Record<string, NeighborPrice>;
      }

      // Group by crop and get the best price (highest modal_price) from neighbors
      const bestByaCrop: Record<string, NeighborPrice> = {};
      
      for (const row of (data || []) as unknown as MarketPriceAggCompatRow[]) {
        const cropName = row.crop_name || '';
        if (!cropName) continue;

        const normalized: NeighborPrice = {
          crop_name: cropName,
          district: row.district || 'Karnataka',
          modal_price: row.avg_price ?? null,
          confidence: null,
          fetched_at: row.date ?? row.created_at ?? null,
        };

        const existing = bestByaCrop[cropName];
        if (!existing || (normalized.modal_price && (!existing.modal_price || normalized.modal_price > existing.modal_price))) {
          bestByaCrop[cropName] = normalized;
        }
      }

      return bestByaCrop;
    },
    enabled: neighborDistricts.length > 0 && cropNames.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePriceForecasts = (cropNames?: string[]) => {
  return useQuery({
    queryKey: ['price-forecasts', cropNames],
    queryFn: async () => {
      if (!PRICE_FORECASTS_ENABLED) {
        return [];
      }

      let query = supabase
        .from('price_forecasts')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(20);

      if (cropNames && cropNames.length > 0) {
        query = query.in('crop_name', cropNames);
      }

      const { data, error } = await query;
      if (error) {
        if (isMissingTableError(error, 'price_forecasts')) {
          return [];
        }
        throw error;
      }
      
      // Get latest forecast per crop
      const latestByC: Record<string, PriceForecast> = {};
      for (const f of (data || []) as PriceForecast[]) {
        if (!latestByC[f.crop_name] || new Date(f.generated_at) > new Date(latestByC[f.crop_name].generated_at)) {
          latestByC[f.crop_name] = f;
        }
      }
      
      return Object.values(latestByC);
    },
    enabled: PRICE_FORECASTS_ENABLED,
  });
};
