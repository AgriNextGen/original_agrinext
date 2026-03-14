import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { signAndUpload } from '@/lib/storage-upload';

export interface Trip {
  id: string;
  transport_request_id: string;
  transporter_id: string;
  status: 'created' | 'accepted' | 'pickup_done' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  created_at: string;
  accepted_at: string | null;
  pickup_done_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  issue_code: string | null;
  issue_notes: string | null;
  pickup_proofs: string[] | null;
  delivery_proofs: string[] | null;
  pickup_otp_required: boolean;
  pickup_otp_verified: boolean;
  delivery_otp_required: boolean;
  delivery_otp_verified: boolean;
  actual_weight_kg: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  transport_request?: {
    id: string;
    farmer_id: string;
    crop_id: string | null;
    quantity: number;
    quantity_unit: string | null;
    pickup_location: string;
    pickup_village: string | null;
    preferred_date: string | null;
    preferred_time: string | null;
    drop_location: string | null;
    fare_estimate: number | null;
    notes: string | null;
  };
  farmer?: {
    full_name: string;
    village: string;
    district: string;
    phone: string;
  };
  crop?: {
    crop_name: string;
    variety: string | null;
  };
}

export interface TransportStatusEvent {
  id: string;
  transport_request_id: string;
  trip_id: string | null;
  actor_id: string;
  actor_role: 'farmer' | 'agent' | 'transporter' | 'admin' | 'system';
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
}

// Fetch active trips for current transporter (single RPC, denormalized)
export const useTrips = (status?: string | string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trips', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return [];

      const statusFilter = status == null
        ? null
        : Array.isArray(status)
          ? status
          : [status];

      const { data, error } = await supabase.rpc('get_trips_with_context', {
        p_transporter_id: user.id,
        p_status_filter: statusFilter,
      });

      if (error) throw error;
      return (data || []) as Trip[];
    },
    enabled: !!user?.id,
  });
};

// Fetch single trip by ID (single RPC, denormalized)
export const useTripDetail = (tripId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['trip-detail', tripId],
    queryFn: async () => {
      if (!tripId) return null;

      const { data, error } = await supabase.rpc('get_trip_detail_with_context', {
        p_trip_id: tripId,
      });

      if (error) throw error;
      return data as Trip | null;
    },
    enabled: !!tripId && !!user?.id,
  });
};

// Fetch trip status events
export const useTripStatusEvents = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['trip-status-events', tripId],
    queryFn: async () => {
      if (!tripId) return [];

      const { data, error } = await supabase
        .from('transport_status_events')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TransportStatusEvent[];
    },
    enabled: !!tripId,
  });
};

// Accept load via database RPC (atomic: creates trip + audit trail + farmer notification)
export const useAcceptLoadSecure = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      transportRequestId,
      vehicleId,
    }: {
      transportRequestId: string;
      vehicleId?: string;
    }) => {
      const { data, error } = await supabase.rpc('accept_transport_load', {
        p_transport_request_id: transportRequestId,
        p_vehicle_id: vehicleId ?? null,
      });

      if (error) throw error;
      return data as { trip_id: string; new_status: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-loads'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['active-trips'] });
      queryClient.invalidateQueries({ queryKey: ['transport-requests-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-dashboard'] });
      toast.success(t('hookToasts.trips.loadAccepted'));
    },
    onError: (error: Error) => {
      if (error.message.includes('ALREADY_ASSIGNED') || error.message.includes('already')) {
        toast.error(t('hookToasts.trips.alreadyAccepted'));
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        toast.error(t('hookToasts.trips.networkError'));
      } else {
        toast.error(t('hookToasts.trips.loadFailed') + ': ' + error.message);
      }
    },
  });
};

// Update trip status via database RPC (state machine + audit trail)
export const useUpdateTripStatusSecure = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      tripId,
      newStatus,
      note,
      proofPaths,
      issueCode,
      issueNotes,
      actualWeightKg,
    }: {
      tripId: string;
      newStatus: string;
      note?: string;
      proofPaths?: string[];
      issueCode?: string;
      issueNotes?: string;
      actualWeightKg?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('update_trip_status_v1', {
        p_trip_id: tripId,
        p_new_status: newStatus,
        p_actor_user_id: user.id,
        p_photo_url: proofPaths?.[0] ?? null,
        p_latitude: null,
        p_longitude: null,
        p_notes: note ?? issueNotes ?? null,
      });

      if (error) throw error;

      const result = data as { success: boolean; new_status?: string; error_code?: string; message?: string };
      if (result.success === false) {
        throw new Error(result.message ?? result.error_code ?? 'Status update failed');
      }
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trip-status-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-trips'] });
      queryClient.invalidateQueries({ queryKey: ['completed-trips'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-dashboard'] });
      toast.success(`${t('hookToasts.trips.statusUpdated')} ${data.new_status}`);
    },
    onError: (error: Error) => {
      if (error.message.includes('INVALID_TRANSITION')) {
        toast.error(t('hookToasts.trips.invalidTransition'));
      } else if (error.message.includes('PROOF_REQUIRED')) {
        toast.error(t('hookToasts.trips.photoRequired'));
      } else if (error.message.includes('FORBIDDEN')) {
        toast.error(t('hookToasts.trips.forbidden'));
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        toast.error(t('hookToasts.trips.networkError'));
      } else {
        toast.error(t('hookToasts.trips.statusUpdateFailed') + ': ' + error.message);
      }
    },
  });
};

// Upload proof photo
export const useUploadProof = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      tripId,
      file,
      type,
    }: {
      tripId: string;
      file: File;
      type: 'pickup' | 'delivery';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const filePath = await signAndUpload(file, {
        bucket: 'trip-proofs',
        contentType: file.type,
        sizeBytes: file.size,
        entity: { type: 'trip', id: tripId },
      });

      return filePath;
    },
    onError: (error: Error) => {
      toast.error(t('hookToasts.trips.photoUploadFailed') + ': ' + error.message);
    },
  });
};

// Get signed URL for proof photo
export const useProofSignedUrl = (filePath: string | null) => {
  return useQuery({
    queryKey: ['proof-url', filePath],
    queryFn: async () => {
      if (!filePath) return null;
      // request signed read URL from Edge Function using file_id
      const { data, error } = await supabase.functions.invoke('storage-sign-read-v1', {
        body: { file_id: filePath },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.signed_read_url;
    },
    enabled: !!filePath,
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });
};
