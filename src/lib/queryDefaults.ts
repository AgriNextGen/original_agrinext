// src/lib/queryDefaults.ts
export const QUERY_DEFAULTS = {
  queries: {
    retry: 1,
    staleTime: 30_000, // default for dashboards
    cacheTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    networkMode: 'online',
  },
  mutations: {
    retry: 0,
  },
};

