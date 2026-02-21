import { offlineDB } from '@/offline/idb';
import { enqueueUpload } from '@/offline/uploadQueue';

test('enqueue upload persists to IndexedDB', async () => {
  const id = crypto.randomUUID();
  const blob = new Blob(['hello'], { type: 'text/plain' });
  await enqueueUpload({
    id,
    fileName: 'hello.txt',
    mimeType: 'text/plain',
    size: 5,
    blob,
    purpose: 'proof',
    entityType: 'trip',
    entityId: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID()
  } as any);
  const item = await offlineDB.uploads.get(id);
  expect(item).toBeDefined();
  expect(item?.fileName).toBe('hello.txt');
  await offlineDB.uploads.delete(id);
});

