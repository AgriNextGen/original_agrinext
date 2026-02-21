import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * IMPORTANT: All trip mutations (accept, status update) are handled via useTrips.tsx secure hooks.
 * This file contains ONLY read queries for logistics dashboard data.
 * DO NOT add mutation hooks here - use useAcceptLoadSecure and useUpdateTripStatusSecure from useTrips.tsx
 */

export interface Transporter {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  vehicle_capacity: number | null;
  registration_number: string | null;
  operating_village: string | null;
  operating_district: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  transporter_id: string;
  vehicle_type: string;
  capacity: number;
  number_plate: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransportRequest {
  id: string;
  farmer_id: string;
  crop_id: string | null;
  quantity: number;
  quantity_unit: string | null;
  pickup_location: string;
  pickup_village: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  status: 'requested' | 'assigned' | 'en_route' | 'picked_up' | 'delivered' | 'cancelled';
  transporter_id: string | null;
  vehicle_id: string | null;
  pickup_photo_url: string | null;
  delivery_photo_url: string | null;
  distance_km: number | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  farmer?: { full_name: string; village: string; district: string; phone: string };
  crop?: { crop_name: string; variety: string };
}

export interface AITransportLog {
  id: string;
  transporter_id: string;
  log_type: string;
  input_data: any;
  output_text: string | null;
  created_at: string;
}

// Hook to get or create transporter profile
export const useTransporterProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['transporter-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('transporters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Transporter | null;
    },
    enabled: !!user?.id,
  });
};

// Hook to create transporter profile
export const useCreateTransporterProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<Transporter>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data: result, error } = await supabase
        .from('transporters')
        .insert({
          user_id: user.id,
          name: data.name || 'Transporter',
          phone: data.phone,
          vehicle_type: data.vehicle_type,
          vehicle_capacity: data.vehicle_capacity,
          registration_number: data.registration_number,
          operating_village: data.operating_village,
          operating_district: data.operating_district,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transporter-profile'] });
      toast.success('Profile created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create profile: ' + error.message);
    },
  });
};

// Hook to get all available transport requests
export const useAvailableLoads = () => {
  return useQuery({
    queryKey: ['available-loads'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('status', 'requested')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch farmer and crop details for each request
      const enrichedRequests = await Promise.all(
        (requests || []).map(async (request) => {
          const [farmerResult, cropResult] = await Promise.all([
            supabase.from('profiles').select('full_name, village, district, phone').eq('id', request.farmer_id).maybeSingle(),
            request.crop_id 
              ? supabase.from('crops').select('crop_name, variety').eq('id', request.crop_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...request,
            farmer: farmerResult.data,
            crop: cropResult.data,
          };
        })
      );
      
      return enrichedRequests as TransportRequest[];
    },
  });
};

// Hook to get active trips for current transporter
export const useActiveTrips = () => {
  const { data: transporter } = useTransporterProfile();
  
  return useQuery({
    queryKey: ['active-trips', transporter?.id],
    queryFn: async () => {
      if (!transporter?.id) return [];
      
      const { data: requests, error } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('transporter_id', transporter.user_id)
        .in('status', ['assigned', 'en_route', 'picked_up'])
        .order('preferred_date', { ascending: true });
      
      if (error) throw error;
      
      const enrichedRequests = await Promise.all(
        (requests || []).map(async (request) => {
          const [farmerResult, cropResult] = await Promise.all([
            supabase.from('profiles').select('full_name, village, district, phone').eq('id', request.farmer_id).maybeSingle(),
            request.crop_id 
              ? supabase.from('crops').select('crop_name, variety').eq('id', request.crop_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...request,
            farmer: farmerResult.data,
            crop: cropResult.data,
          };
        })
      );
      
      return enrichedRequests as TransportRequest[];
    },
    enabled: !!transporter?.id,
  });
};

// Hook to get completed trips
export const useCompletedTrips = () => {
  const { data: transporter } = useTransporterProfile();
  
  return useQuery({
    queryKey: ['completed-trips', transporter?.id],
    queryFn: async () => {
      if (!transporter?.id) return [];
      
      const { data: requests, error } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('transporter_id', transporter.user_id)
        .eq('status', 'delivered')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      const enrichedRequests = await Promise.all(
        (requests || []).map(async (request) => {
          const [farmerResult, cropResult] = await Promise.all([
            supabase.from('profiles').select('full_name, village, district, phone').eq('id', request.farmer_id).maybeSingle(),
            request.crop_id 
              ? supabase.from('crops').select('crop_name, variety').eq('id', request.crop_id).maybeSingle()
              : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...request,
            farmer: farmerResult.data,
            crop: cropResult.data,
          };
        })
      );
      
      return enrichedRequests as TransportRequest[];
    },
    enabled: !!transporter?.id,
  });
};

// Hook to get vehicles for current transporter
export const useVehicles = () => {
  const { data: transporter } = useTransporterProfile();
  
  return useQuery({
    queryKey: ['vehicles', transporter?.id],
    queryFn: async () => {
      if (!transporter?.id) return [];
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('transporter_id', transporter.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!transporter?.id,
  });
};

// Hook to get AI transport logs
export const useAITransportLogs = () => {
  const { data: transporter } = useTransporterProfile();
  
  return useQuery({
    queryKey: ['ai-transport-logs', transporter?.id],
    queryFn: async () => {
      if (!transporter?.id) return [];
      
      const { data, error } = await supabase
        .from('ai_transport_logs')
        .select('*')
        .eq('transporter_id', transporter.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as AITransportLog[];
    },
    enabled: !!transporter?.id,
  });
};

// Hook to get dashboard stats
import { rpcJson } from '@/lib/readApi';

export const useLogisticsDashboardStats = () => {
  const q = useQuery({
    queryKey: ['logistics-dashboard'],
    queryFn: async () => {
      const data = await rpcJson('logistics_dashboard_v1');
      return {
        stats: {
          availableLoads: Number(data?.available_loads_count || 0),
          acceptedTrips: 0,
          tripsInProgress: Number((data?.trips_by_status && data.trips_by_status['en_route']) || 0),
          completedTrips: Number((data?.trips_by_status && data.trips_by_status['delivered']) || 0),
        },
        transporter: null,
        raw: data
      };
    }
  });
  return q.data || { stats: { availableLoads:0, acceptedTrips:0, tripsInProgress:0, completedTrips:0 }, transporter: null };
};