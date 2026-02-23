import { offlineDB } from '@/offline/idb';
import { enqueueAction } from '@/offline/actionQueue';

const maybeTest = typeof indexedDB === "undefined" ? test.skip : test;

maybeTest('enqueue action persists to IndexedDB', async () => {
  const id = crypto.randomUUID();
  await enqueueAction({
    id,
    type: 'rpc',
    name: 'test.rpc',
    payload: { foo: 'bar' },
    idempotencyKey: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'queued',
    retryCount: 0,
    maxRetries: 3,
    nextRunAt: null
  } as any);
  const item = await offlineDB.actions.get(id);
  expect(item).toBeDefined();
  expect(item?.name).toBe('test.rpc');
  await offlineDB.actions.delete(id);
});
