import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { signAndUpload } from '@/lib/storage-upload';

export interface Trip {
  id: string;
  transport_request_id: string;
  transporter_id: string;
  status: 'assigned' | 'en_route' | 'arrived' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'issue';
  assigned_at: string;
  en_route_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
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

// Accept load via edge function
export const useAcceptLoadSecure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transportRequestId,
      vehicleId,
    }: {
      transportRequestId: string;
      vehicleId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('accept-load', {
        body: {
          transport_request_id: transportRequestId,
          vehicle_id: vehicleId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['available-loads'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['active-trips'] });
      toast.success('Load accepted successfully!');
    },
    onError: (error: Error) => {
      if (error.message.includes('ALREADY_ASSIGNED') || error.message.includes('already')) {
        toast.error('This load has already been accepted by another transporter');
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to accept load: ' + error.message);
      }
    },
  });
};

// Update trip status via edge function
export const useUpdateTripStatusSecure = () => {
  const queryClient = useQueryClient();

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
      const { data, error } = await supabase.functions.invoke('update-trip-status', {
        body: {
          trip_id: tripId,
          new_status: newStatus,
          note,
          proof_paths: proofPaths,
          issue_code: issueCode,
          issue_notes: issueNotes,
          actual_weight_kg: actualWeightKg,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip-detail'] });
      queryClient.invalidateQueries({ queryKey: ['trip-status-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-trips'] });
      queryClient.invalidateQueries({ queryKey: ['completed-trips'] });
      toast.success(`Status updated to ${data.new_status}`);
    },
    onError: (error: Error) => {
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to update status: ' + error.message);
      }
    },
  });
};

// Upload proof photo
export const useUploadProof = () => {
  const { user } = useAuth();

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
      toast.error('Failed to upload photo: ' + error.message);
    },
  });
};

// Get signed URL for proof photo
export const useProofSignedUrl = (filePath: string | null) => {
  return useQuery({
    queryKey: ['proof-url', filePath],
    queryFn: async () => {
      if (!filePath) return null;

      const { data, error } = await supabase.storage
        .from('trip-proofs')
        .createSignedUrl(filePath, 600); // 10 min expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 5 * 60 * 1000, // Cache for 5 min
  });
};
