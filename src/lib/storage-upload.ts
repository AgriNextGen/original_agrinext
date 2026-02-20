import { supabase } from '@/integrations/supabase/client';

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

  // return file identifier (if available) to be stored in DB
  return result.file_id || result.path;
}
