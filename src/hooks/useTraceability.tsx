import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { FILE_SIZE_LIMITS, validateFileSize, isImageFile, isPdfFile } from '@/lib/error-utils';
import { signAndUpload } from '@/lib/storage-upload';

export interface TraceSettings {
  show_origin_level: 'district' | 'district_village';
  show_crop_details: boolean;
  show_crop_timeline: boolean;
  show_stage_photos: boolean;
  show_input_photos: boolean;
  show_soil_report: boolean;
  show_geo_proof: boolean;
}

export const DEFAULT_TRACE_SETTINGS: TraceSettings = {
  show_origin_level: 'district',
  show_crop_details: true,
  show_crop_timeline: true,
  show_stage_photos: false,
  show_input_photos: false,
  show_soil_report: false,
  show_geo_proof: false,
};

export interface TraceAttachment {
  id: string;
  owner_type: string;
  owner_id: string;
  file_url: string;
  file_type: string;
  tag: string;
  visibility: string;
  captured_at: string;
  notes: string | null;
  created_at: string;
  uploaded_by: string;
}

export interface HarvestReadyCrop {
  id: string;
  crop_name: string;
  variety: string | null;
  estimated_quantity: number | null;
  quantity_unit: string | null;
  harvest_estimate: string | null;
  sowing_date: string | null;
  status: string;
  land_id: string | null;
  farmland?: {
    district: string | null;
    village: string | null;
    name: string;
  } | null;
}

export function useHarvestReadyCrops() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['harvest-ready-crops', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('crops')
        .select(`
          id, crop_name, variety, estimated_quantity, quantity_unit,
          harvest_estimate, sowing_date, status, land_id,
          farmlands:land_id (district, village, name)
        `)
        .eq('farmer_id', user.id)
        .in('status', ['growing', 'harvested'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        farmland: c.farmlands || null,
      })) as HarvestReadyCrop[];
    },
    enabled: !!user,
  });
}

export function useListingAttachments(listingId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trace-attachments', listingId],
    queryFn: async () => {
      if (!listingId) return [];
      const { data, error } = await supabase
        .from('trace_attachments')
        .select('*')
        .eq('owner_type', 'listing')
        .eq('owner_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TraceAttachment[];
    },
    enabled: !!listingId && !!user,
  });
}

export function useUploadTraceAttachment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      ownerType,
      ownerId,
      tag,
      visibility = 'private',
      notes,
    }: {
      file: File;
      ownerType: string;
      ownerId: string;
      tag: string;
      visibility?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const isImage = isImageFile(file);
      const isPdf = isPdfFile(file);
      if (!isImage && !isPdf) throw new Error('Only images and PDFs are supported');

      let processedFile = file;

      // Compress images if needed
      if (isImage) {
        const validation = validateFileSize(file, FILE_SIZE_LIMITS.IMAGE_MAX_MB);
        if (!validation.valid) throw new Error(validation.message);

        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > FILE_SIZE_LIMITS.IMAGE_COMPRESS_TARGET_MB) {
          processedFile = await imageCompression(file, {
            maxSizeMB: FILE_SIZE_LIMITS.IMAGE_COMPRESS_TARGET_MB,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
        }
      } else {
        const validation = validateFileSize(file, FILE_SIZE_LIMITS.PDF_MAX_MB);
        if (!validation.valid) throw new Error(validation.message);
      }

      // Upload via signed URL
      const path = await signAndUpload(processedFile, {
        bucket: 'traceability-media',
        contentType: processedFile.type || (isImage ? 'image/jpeg' : 'application/pdf'),
        sizeBytes: processedFile.size,
        entity: { type: 'listing', id: ownerId },
      });

      // Insert record
      const { error: insertError } = await supabase
        .from('trace_attachments')
        .insert({
          owner_type: ownerType,
          owner_id: ownerId,
          file_url: path,
          file_type: isImage ? 'image' : 'pdf',
          tag,
          visibility,
          notes: notes || null,
          uploaded_by: user.id,
          uploader_id: user.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trace-attachments'] });
      toast.success('Evidence uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

export function useToggleAttachmentVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      const { error } = await supabase
        .from('trace_attachments')
        .update({ visibility })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trace-attachments'] });
    },
  });
}
