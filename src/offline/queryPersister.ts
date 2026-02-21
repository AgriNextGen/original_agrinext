import { offlineDB } from './idb';
import { QueryClient } from '@tanstack/react-query';

const WHITELIST = [
  'agent-tasks',
  'today-tasks',
  'agent-dashboard-stats',
  'dashboard',
  'entity-360',
  'get_timeline_v1'
];

function keyToString(key: unknown[]) {
  try { return JSON.stringify(key); } catch { return String(key); }
}

export default {
  async persist(queryClient: QueryClient) {
    try {
      const all = queryClient.getQueryCache().getAll();
      const toPersist: any[] = [];
      all.forEach(q => {
        const k = q.queryKey as any[];
        if (!k || k.length === 0) return;
        if (WHITELIST.includes(k[0])) {
          const data = queryClient.getQueryData(k);
          toPersist.push({ key: k, state: data });
        }
      });
      await offlineDB.cache_meta.put({ key: 'queries', value: toPersist });
    } catch (e) { console.error('persist error', e); }
  },
  async restore() {
    try {
      const rec = await offlineDB.cache_meta.get('queries');
      return rec?.value || [];
    } catch (e) { console.error('restore error', e); return []; }
  }
};

