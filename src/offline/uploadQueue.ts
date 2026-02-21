import { offlineDB, OfflineUpload } from './idb';
import { isOnline, subscribe } from './network';
import { supabase } from '@/integrations/supabase/client';

function sleep(ms:number){ return new Promise(res=>setTimeout(res,ms)); }

const DEFAULT_MAX_RETRIES = 6;

export const uploadEvents = new EventTarget();

async function processUpload(u: OfflineUpload) {
  try {
    await offlineDB.uploads.update(u.id, { status: 'uploading' });
    // 1) request signed URL via edge function
    const { data, error } = await supabase.functions.invoke('storage-sign-upload-v1', {
      body: {
        bucket: u.purpose === 'proof' ? 'trip-proofs' : 'crop-media',
        content_type: u.mimeType,
        size_bytes: u.size,
        entity: { type: u.entityType, id: u.entityId, purpose: u.purpose }
      }
    });
    if (error || data?.error) throw new Error(error?.message || data?.error || 'sign_failed');
    const signed = data;
    const signedUrl = signed.token || signed.signed_url || signed.signedUrl;
    // 2) upload blob via PUT
    const resp = await fetch(signedUrl, { method: 'PUT', body: u.blob, headers: { 'Content-Type': u.mimeType } });
    if (!resp.ok) throw new Error(`upload_failed:${resp.status}`);
    // 3) confirm upload via RPC (files_confirm_upload_v1 expects file_id if returned; if server returned file_id earlier, include)
    if (signed.file_id) {
      await supabase.rpc('public.files_confirm_upload_v1', { p_file_id: signed.file_id });
    }
    await offlineDB.uploads.delete(u.id);
    uploadEvents.dispatchEvent(new CustomEvent('succeeded', { detail: u }));
  } catch (err:any) {
    const retryCount = (u.retryCount || 0) + 1;
    if (retryCount > (u.retryCount || DEFAULT_MAX_RETRIES)) {
      await offlineDB.uploads.update(u.id, { status: 'dead', retryCount, lastError: String(err?.message || err) });
      uploadEvents.dispatchEvent(new CustomEvent('dead', { detail: u }));
      return;
    } else {
      const backoff = Math.min(5*60*1000 * retryCount, 24*60*60*1000);
      const nextRun = Date.now() + backoff + Math.floor(Math.random()*400)+200;
      await offlineDB.uploads.update(u.id, { status: 'failed', retryCount, lastError: String(err?.message || err), nextRunAt: nextRun });
      uploadEvents.dispatchEvent(new CustomEvent('retry', { detail: { upload: u, nextRun } }));
    }
  }
}

let processing = false;

export async function processUploadsOnce() {
  if (!isOnline()) return;
  if (processing) return;
  processing = true;
  try {
    const now = Date.now();
    const items = await offlineDB.uploads.orderBy('createdAt').filter(u => !u.nextRunAt || u.nextRunAt <= now).toArray();
    for (const u of items) {
      await processUpload(u);
      // delay between uploads
      await sleep(500 + Math.floor(Math.random()*700));
      if (!isOnline()) break;
    }
  } finally {
    processing = false;
  }
}

export async function enqueueUpload(upload: Omit<OfflineUpload,'createdAt'|'retryCount'|'status'>) {
  const id = upload.id || crypto.randomUUID();
  const now = Date.now();
  const u: OfflineUpload = {
    id,
    fileName: upload.fileName,
    mimeType: upload.mimeType,
    size: upload.size,
    blob: upload.blob,
    purpose: upload.purpose,
    entityType: upload.entityType,
    entityId: upload.entityId,
    status: 'queued',
    retryCount: 0,
    nextRunAt: null,
    lastError: null,
    idempotencyKey: upload.idempotencyKey,
    createdAt: now
  };
  await offlineDB.uploads.put(u);
  uploadEvents.dispatchEvent(new CustomEvent('enqueue', { detail: u }));
  if (isOnline()) processUploadsOnce().catch(()=>{});
  return id;
}

subscribe((online) => { if (online) processUploadsOnce().catch(()=>{}); });

export default { enqueueUpload, processUploadsOnce, uploadEvents };

