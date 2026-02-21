import { useQuery } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';

export interface GeoState {
  id: string;
  name_en: string;
  name_local?: string;
  iso_code?: string;
}

export interface GeoDistrict {
  id: string;
  name_en: string;
  name_local?: string;
  state_id: string;
  state_name?: string;
}

export interface GeoMarket {
  id: string;
  name_en: string;
  name_local?: string;
  district_id: string;
  district_name?: string;
  market_type: string;
}

export function useGeoStates(q = '') {
  return useQuery<GeoState[]>({
    queryKey: ['geo-search', 'state', q],
    queryFn: async () => {
      const data = await rpcJson('geo_search_v1', { p_q: q, p_type: 'state', p_limit: 50 });
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useGeoDistricts(stateId?: string | null, q = '') {
  return useQuery<GeoDistrict[]>({
    queryKey: ['geo-search', 'district', stateId, q],
    queryFn: async () => {
      const data = await rpcJson('geo_search_v1', {
        p_q: q,
        p_type: 'district',
        p_state_id: stateId || null,
        p_limit: 50,
      });
      return data ?? [];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useGeoMarkets(districtId?: string | null, q = '') {
  return useQuery<GeoMarket[]>({
    queryKey: ['geo-search', 'market', districtId, q],
    queryFn: async () => {
      const data = await rpcJson('geo_search_v1', {
        p_q: q,
        p_type: 'market',
        p_district_id: districtId || null,
        p_limit: 50,
      });
      return data ?? [];
    },
    enabled: !!districtId,
    staleTime: 1000 * 60 * 30,
  });
}
