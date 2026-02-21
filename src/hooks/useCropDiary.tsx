import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { signAndUpload } from '@/lib/storage-upload';

export interface CropMedia {
  id: string;
  crop_id: string;
  owner_farmer_id: string;
  uploaded_by: string;
  uploader_role: 'farmer' | 'agent' | 'admin';
  captured_at: string;
  file_path: string;
  mime_type: string;
  caption: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface CropActivityLog {
  id: string;
  crop_id: string;
  owner_farmer_id: string;
  created_by: string;
  creator_role: 'farmer' | 'agent' | 'admin';
  activity_type: 'photo' | 'fertilizer' | 'spray' | 'irrigation' | 'weeding' | 'disease' | 'growth_update' | 'harvest_update' | 'note' | 'other';
  activity_at: string;
  notes: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  media_id: string | null;
  meta: Record<string, unknown> | null;
  consent_captured: boolean;
  consent_note: string | null;
  consent_at: string | null;
  created_at: string;
  media?: CropMedia | null;
}

export interface CropWithDiaryFields {
  id: string;
  crop_name: string;
  variety: string | null;
  sowing_date: string | null;
  harvest_estimate: string | null;
  status: 'growing' | 'one_week' | 'ready' | 'harvested';
  estimated_quantity: number | null;
  quantity_unit: string | null;
  land_id: string | null;
  growth_stage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvesting';
  health_status: 'normal' | 'watch' | 'diseased';
  last_observed_issue_at: string | null;
  last_photo_at: string | null;
  farmland?: { id: string; name: string; district: string | null; village: string | null } | null;
}

// Fetch single crop with diary fields
export const useCropDetail = (cropId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crop-detail', cropId],
    queryFn: async () => {
      if (!cropId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('crops')
        .select(`
          *,
          farmland:farmlands(id, name, district, village)
        `)
        .eq('id', cropId)
        .eq('farmer_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as CropWithDiaryFields | null;
    },
    enabled: !!cropId && !!user?.id,
  });
};

// Fetch crop media for a crop
export const useCropMedia = (cropId: string | undefined, limit = 30) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crop-media', cropId, limit],
    queryFn: async () => {
      if (!cropId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('crop_media')
        .select('*')
        .eq('crop_id', cropId)
        .eq('owner_farmer_id', user.id)
        .order('captured_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as CropMedia[];
    },
    enabled: !!cropId && !!user?.id,
  });
};

// Fetch activity logs for a crop
export const useCropActivityLogs = (cropId: string | undefined, limit = 50) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crop-activity-logs', cropId, limit],
    queryFn: async () => {
      if (!cropId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('crop_activity_logs')
        .select(`
          *,
          media:crop_media(*)
        `)
        .eq('crop_id', cropId)
        .eq('owner_farmer_id', user.id)
        .order('activity_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as CropActivityLog[];
    },
    enabled: !!cropId && !!user?.id,
  });
};

// Generate signed URL for media
export const useSignedUrl = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      // If filePath is a file_id (UUID), use Edge function to authorize read
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(filePath);
      if (isUuid) {
        const { data, error } = await supabase.functions.invoke('storage-sign-read-v1', { body: { file_id: filePath } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        return data.signed_read_url;
      }

      const { data, error } = await supabase.storage
        .from('crop-media')
        .createSignedUrl(filePath, 600); // 10 min TTL
      
      if (error) throw error;
      return data.signedUrl;
    },
  });
};

// Upload crop media
export const useUploadCropMedia = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cropId,
      file,
      caption,
      tags,
      latitude,
      longitude,
    }: {
      cropId: string;
      file: File;
      caption?: string;
      tags?: string[];
      latitude?: number;
      longitude?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload via signed URL
      const filePath = await signAndUpload(file, {
        bucket: 'crop-media',
        contentType: file.type,
        sizeBytes: file.size,
        entity: { type: 'crop', id: cropId },
      });

      // Insert media record
      const { data: mediaData, error: mediaError } = await supabase
        .from('crop_media')
        .insert({
          crop_id: cropId,
          owner_farmer_id: user.id,
          uploaded_by: user.id,
          uploader_role: 'farmer',
          file_path: filePath,
          mime_type: file.type,
          caption: caption || null,
          tags: tags || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          geo_verified: !!(latitude && longitude),
        })
        .select()
        .single();

      if (mediaError) {
        throw mediaError;
      }

      // Insert activity log
      await supabase.from('crop_activity_logs').insert({
        crop_id: cropId,
        owner_farmer_id: user.id,
        created_by: user.id,
        creator_role: 'farmer',
        activity_type: 'photo',
        media_id: mediaData.id,
        notes: caption || null,
      });

      return mediaData;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-media', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-activity-logs', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-detail', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast.success('Photo uploaded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to upload photo: ' + error.message);
    },
  });
};

// Add activity log
export const useAddActivityLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cropId,
      activityType,
      notes,
      severity,
      meta,
    }: {
      cropId: string;
      activityType: CropActivityLog['activity_type'];
      notes?: string;
      severity?: 'low' | 'medium' | 'high';
      meta?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('crop_activity_logs')
        .insert({
          crop_id: cropId,
          owner_farmer_id: user.id,
          created_by: user.id,
          creator_role: 'farmer',
          activity_type: activityType,
          notes: notes || null,
          severity: severity || null,
          meta: meta ? JSON.parse(JSON.stringify(meta)) : null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-activity-logs', variables.cropId] });
      toast.success('Activity logged successfully!');
    },
    onError: (error) => {
      toast.error('Failed to log activity: ' + error.message);
    },
  });
};

// Update crop growth stage
export const useUpdateGrowthStage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cropId,
      growthStage,
    }: {
      cropId: string;
      growthStage: CropWithDiaryFields['growth_stage'];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('crops')
        .update({ growth_stage: growthStage })
        .eq('id', cropId)
        .eq('farmer_id', user.id);

      if (error) throw error;

      // Log the update
      await supabase.from('crop_activity_logs').insert([{
        crop_id: cropId,
        owner_farmer_id: user.id,
        created_by: user.id,
        creator_role: 'farmer',
        activity_type: 'growth_update',
        notes: `Growth stage updated to ${growthStage}`,
      }]);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-detail', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-activity-logs', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast.success('Growth stage updated!');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
};

// Report disease
export const useReportDisease = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      cropId,
      notes,
      severity,
      file,
    }: {
      cropId: string;
      notes: string;
      severity: 'low' | 'medium' | 'high';
      file?: File;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      let mediaId: string | null = null;

      // Upload photo if provided
      if (file) {
        const filePath = await signAndUpload(file, {
          bucket: 'crop-media',
          contentType: file.type,
          sizeBytes: file.size,
          entity: { type: 'crop', id: cropId },
        });

        const { data: mediaData, error: mediaError } = await supabase
          .from('crop_media')
          .insert({
            crop_id: cropId,
            owner_farmer_id: user.id,
            uploaded_by: user.id,
            uploader_role: 'farmer',
            file_path: filePath,
            mime_type: file.type,
            caption: 'Disease report photo',
            tags: ['disease'],
          })
          .select()
          .single();

        if (mediaError) throw mediaError;

        mediaId = mediaData.id;
      }

      // Update crop health status
      const { error: updateError } = await supabase
        .from('crops')
        .update({
          health_status: 'diseased',
          last_observed_issue_at: new Date().toISOString(),
        })
        .eq('id', cropId)
        .eq('farmer_id', user.id);

      if (updateError) throw updateError;

      // Insert disease activity log
      const { error: logError } = await supabase
        .from('crop_activity_logs')
        .insert({
          crop_id: cropId,
          owner_farmer_id: user.id,
          created_by: user.id,
          creator_role: 'farmer',
          activity_type: 'disease',
          notes,
          severity,
          media_id: mediaId,
        });

      if (logError) throw logError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crop-detail', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-activity-logs', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-media', variables.cropId] });
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      toast.success('Disease reported successfully!');
    },
    onError: (error) => {
      toast.error('Failed to report disease: ' + error.message);
    },
  });
};

// Delete media
export const useDeleteCropMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mediaId, filePath, cropId }: { mediaId: string; filePath: string; cropId: string }) => {
      // Delete from storage via Edge function (service-role cleanup)
      try {
        const { error: delErr } = await supabase.functions.invoke('storage-delete-v1', {
          body: { bucket: 'crop-media', path: filePath },
        });
        if (delErr) console.warn('storage-delete-v1 warning:', delErr);
      } catch (e) {
        console.warn('storage-delete-v1 failed:', e);
      }

      // Delete from database
      const { error } = await supabase.from('crop_media').delete().eq('id', mediaId);
      if (error) throw error;

      return cropId;
    },
    onSuccess: (cropId) => {
      queryClient.invalidateQueries({ queryKey: ['crop-media', cropId] });
      queryClient.invalidateQueries({ queryKey: ['crop-activity-logs', cropId] });
      toast.success('Photo deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
};

// Get crops needing photo reminders
export const useCropPhotoReminders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crop-photo-reminders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('crops')
        .select('id, crop_name, variety, sowing_date, last_photo_at, created_at')
        .eq('farmer_id', user.id)
        .neq('status', 'harvested')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const today = new Date();
      const reminders: Array<{
        cropId: string;
        cropName: string;
        variety: string | null;
        monthIndex: number;
        needsPhoto: boolean;
      }> = [];

      for (const crop of data || []) {
        const baseDate = crop.sowing_date ? new Date(crop.sowing_date) : new Date(crop.created_at);
        const daysSinceBase = Math.floor((today.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
        const monthIndex = Math.floor(daysSinceBase / 30) + 1;

        // Check if needs photo (no photo or last photo > 25 days ago)
        let needsPhoto = !crop.last_photo_at;
        if (crop.last_photo_at) {
          const daysSincePhoto = Math.floor(
            (today.getTime() - new Date(crop.last_photo_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          needsPhoto = daysSincePhoto > 25;
        }

        if (needsPhoto) {
          reminders.push({
            cropId: crop.id,
            cropName: crop.crop_name,
            variety: crop.variety,
            monthIndex,
            needsPhoto: true,
          });
        }
      }

      return reminders.slice(0, 3); // Return top 3 reminders
    },
    enabled: !!user?.id,
  });
};
