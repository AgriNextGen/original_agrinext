import { supabase } from '@/integrations/supabase/client';
import uploadQueue from '@/offline/uploadQueue';
import network from '@/offline/network';

export type StorageEntityType = 'crop' | 'trip' | 'listing' | 'soil_report';

interface SignUploadParams {
  bucket: string;
  contentType: string;
  sizeBytes: number;
  entity: {
    type: StorageEntityType;
    id: string;
  };
}

interface SignUploadResult {
  signedUrl: string;
  token: string;
  path: string;
  bucket: string;
}

export async function signAndUpload(
  file: File | Blob,
  params: SignUploadParams
): Promise<string> {
  // If offline, enqueue upload
  if (!network.isOnline()) {
    const idempotencyKey = crypto.randomUUID();
    const id = await uploadQueue.enqueueUpload({
      id: crypto.randomUUID(),
      fileName: (file as any).name || 'blob',
      mimeType: params.contentType,
      size: params.sizeBytes,
      blob: file,
      purpose: params.entity.type,
      entityType: params.entity.type,
      entityId: params.entity.id,
      idempotencyKey
    });
    return id; // return local id to store as placeholder
  }

  const { data, error } = await supabase.functions.invoke('storage-sign-upload-v1', {
    body: {
      bucket: params.bucket,
      content_type: params.contentType,
      size_bytes: params.sizeBytes,
      entity: params.entity,
    },
  });

  if (error) throw new Error(`Sign upload failed: ${error.message}`);
  if (data?.error) throw new Error(data.error);

  const result = data as SignUploadResult & { file_id?: string };
  
  const uploadRes = await supabase.storage
    .from(params.bucket)
    .uploadToSignedUrl(result.path, result.token, file, {
      contentType: params.contentType,
    });

  if (uploadRes.error) throw new Error(`Upload failed: ${uploadRes.error.message}`);

  // If server returned a file_id, confirm upload (marks status='ready')
  if (result.file_id) {
    try {
      await supabase.functions.invoke('storage-confirm-upload-v1', { body: { file_id: result.file_id } });
    } catch (e) {
      // Non-fatal: caller can cleanup via storage-delete-v1 if needed
      console.warn('storage-confirm-upload-v1 failed:', e);
    }
  }

  // return file identifier (if available) to be stored in DB
  return result.file_id || result.path;
}
