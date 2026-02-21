import { useState, useEffect } from 'react';

type OfflineAction = {
  id: string;
  action_type: string;
  payload: any;
  created_at: string;
};

const KEY = 'offlineQueue:v1';

export function enqueueAction(action_type: string, payload: any) {
  const item: OfflineAction = { id: crypto.randomUUID(), action_type, payload, created_at: new Date().toISOString() };
  const cur = JSON.parse(localStorage.getItem(KEY) || '[]');
  cur.push(item);
  localStorage.setItem(KEY, JSON.stringify(cur));
  window.dispatchEvent(new CustomEvent('offlineQueue.updated'));
  return item.id;
}

export function getPending(): OfflineAction[] {
  return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function removeAction(id: string) {
  const cur: OfflineAction[] = JSON.parse(localStorage.getItem(KEY) || '[]');
  const next = cur.filter(c => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('offlineQueue.updated'));
}

export async function retryAll(handler: (action: OfflineAction) => Promise<boolean>) {
  const cur: OfflineAction[] = JSON.parse(localStorage.getItem(KEY) || '[]');
  for (const a of cur) {
    try {
      const ok = await handler(a);
      if (ok) removeAction(a.id);
    } catch (e) {
      console.warn('retry failed', e);
    }
  }
}

export function useOfflineQueue() {
  const [count, setCount] = useState(() => getPending().length);

  useEffect(() => {
    const updater = () => setCount(getPending().length);
    window.addEventListener('offlineQueue.updated', updater);
    updater();
    return () => window.removeEventListener('offlineQueue.updated', updater);
  }, []);

  return { count, pending: getPending, retryAll };
}
