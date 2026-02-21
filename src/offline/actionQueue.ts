import { offlineDB, OfflineAction } from './idb';
import { isOnline, subscribe } from './network';
import { rpcMutate } from '@/lib/readApi';

function sleep(ms:number){ return new Promise(res=>setTimeout(res,ms)); }

const DEFAULT_MAX_RETRIES = 8;
const BACKOFF_MS = [60*1000, 5*60*1000, 15*60*1000, 60*60*1000, 6*60*60*1000, 24*60*60*1000];

export const actionEvents = new EventTarget();

async function processAction(a: OfflineAction) {
  try {
    await offlineDB.actions.update(a.id, { status: 'running', updatedAt: Date.now() });
    // Always pass idempotencyKey to server via headers/params in rpcMutate wrapper
    if (a.type === 'rpc') {
      // attach idempotency key in payload
      const payload = { ...(a.payload || {}), idempotency_key: a.idempotencyKey };
      await rpcMutate(a.name, payload);
    } else {
      // edge or rest handling - try via fetch to edge function
      // for simplicity, attempt to call RPC wrapper if name corresponds
      await rpcMutate(a.name, a.payload || {});
    }
    await offlineDB.actions.delete(a.id);
    actionEvents.dispatchEvent(new CustomEvent('synced', { detail: a }));
  } catch (err:any) {
    const retryCount = (a.retryCount || 0) + 1;
    const maxRetries = a.maxRetries || DEFAULT_MAX_RETRIES;
    let nextRun = null;
    if (retryCount > maxRetries) {
      await offlineDB.actions.update(a.id, { status: 'dead', retryCount, lastError: String(err?.message || err), updatedAt: Date.now() });
      actionEvents.dispatchEvent(new CustomEvent('dead', { detail: a }));
      return;
    } else {
      const backoff = BACKOFF_MS[Math.min(retryCount-1, BACKOFF_MS.length-1)] || BACKOFF_MS[BACKOFF_MS.length-1];
      const jitter = Math.floor(Math.random()*400)+200;
      nextRun = Date.now() + backoff + jitter;
      await offlineDB.actions.update(a.id, { status: 'failed', retryCount, lastError: String(err?.message || err), nextRunAt: nextRun, updatedAt: Date.now() });
      actionEvents.dispatchEvent(new CustomEvent('retry', { detail: { action: a, nextRun } }));
    }
  }
}

let processing = false;

export async function processQueueOnce() {
  if (!isOnline()) return;
  if (processing) return;
  processing = true;
  try {
    const now = Date.now();
    const items = await offlineDB.actions.orderBy('createdAt').filter(a => !a.nextRunAt || a.nextRunAt <= now).toArray();
    for (const a of items) {
      // throttle 1 action/sec + jitter 200-600ms
      await processAction(a);
      const jitter = Math.floor(Math.random()*400)+200;
      await sleep(1000 + jitter);
      if (!isOnline()) break;
    }
  } finally {
    processing = false;
  }
}

export async function enqueueAction(action: Omit<OfflineAction, 'createdAt'|'updatedAt'|'status'|'retryCount'>) {
  const id = action.id || crypto.randomUUID();
  const now = Date.now();
  const a: OfflineAction = {
    id,
    type: action.type,
    name: action.name,
    payload: action.payload,
    idempotencyKey: action.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    status: 'queued',
    retryCount: 0,
    maxRetries: action.maxRetries || DEFAULT_MAX_RETRIES,
    nextRunAt: action.nextRunAt || null,
    lastError: null,
    scope: action.scope || null,
    entityType: action.entityType || null,
    entityId: action.entityId || null
  };
  await offlineDB.actions.put(a);
  actionEvents.dispatchEvent(new CustomEvent('enqueue', { detail: a }));
  // auto-start processing if online
  if (isOnline()) processQueueOnce().catch(()=>{});
  return id;
}

// auto-process on network change
subscribe((online) => {
  if (online) processQueueOnce().catch(()=>{});
});

export default { enqueueAction, processQueueOnce, actionEvents };

