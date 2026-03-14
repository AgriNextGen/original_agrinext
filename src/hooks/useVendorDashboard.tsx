import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LogisticsOrchestratorService } from '@/services/logistics/LogisticsOrchestratorService';
import type {
  ShipmentRequest,
  ShipmentItem,
  ShipmentBooking,
  ReverseLoadCandidate,
  CreateShipmentRequestParams,
  CreateShipmentItemParams,
  ShipmentStatus,
} from '@/services/logistics/types';
import { CACHE_TIME } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const VENDOR_QUERY_KEYS = {
  shipments: (userId: string) => ['vendor', 'shipments', userId],
  activeShipments: (userId: string) => ['vendor', 'activeShipments', userId],
  shipmentHistory: (userId: string) => ['vendor', 'shipmentHistory', userId],
  pendingShipments: (userId: string) => ['vendor', 'pendingShipments', userId],
  shipmentDetail: (shipmentId: string) => ['vendor', 'shipment', shipmentId],
  reverseOpportunities: (userId: string) => ['vendor', 'reverseOpportunities', userId],
  dashboardStats: (userId: string) => ['vendor', 'dashboardStats', userId],
  vendorProfile: (userId: string) => ['vendor', 'profile', userId],
} as const;

const ACTIVE_STATUSES: ShipmentStatus[] = ['pending', 'pooled', 'booked', 'in_transit'];
const COMPLETED_STATUSES: ShipmentStatus[] = ['delivered', 'completed'];
const PENDING_STATUSES: ShipmentStatus[] = ['draft', 'pending', 'pooled'];

export function useVendorShipments() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.shipments(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_requests')
        .select('*')
        .eq('request_source_type', 'vendor')
        .eq('source_actor_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ShipmentRequest[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useVendorActiveShipments() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.activeShipments(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_requests')
        .select('*')
        .eq('request_source_type', 'vendor')
        .eq('source_actor_id', userId)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ShipmentRequest[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useVendorShipmentHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.shipmentHistory(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_requests')
        .select('*')
        .eq('request_source_type', 'vendor')
        .eq('source_actor_id', userId)
        .in('status', COMPLETED_STATUSES)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ShipmentRequest[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.MEDIUM,
  });
}

export function useVendorPendingShipments() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.pendingShipments(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_requests')
        .select('*')
        .eq('request_source_type', 'vendor')
        .eq('source_actor_id', userId)
        .in('status', PENDING_STATUSES)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ShipmentRequest[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useVendorShipmentDetail(shipmentId: string) {
  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.shipmentDetail(shipmentId),
    queryFn: async () => {
      return LogisticsOrchestratorService.getShipmentRequest(shipmentId);
    },
    enabled: !!shipmentId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useVendorReverseOpportunities() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.reverseOpportunities(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reverse_load_candidates')
        .select('*')
        .in('status', ['identified', 'offered'])
        .order('candidate_score', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ReverseLoadCandidate[];
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useVendorDashboardStats() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.dashboardStats(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_requests')
        .select('id, status')
        .eq('request_source_type', 'vendor')
        .eq('source_actor_id', userId);

      if (error) throw new Error(error.message);
      const shipments = (data ?? []) as { id: string; status: string }[];

      const active = shipments.filter(s => ACTIVE_STATUSES.includes(s.status as ShipmentStatus)).length;
      const awaitingPickup = shipments.filter(s => s.status === 'pending' || s.status === 'pooled' || s.status === 'booked').length;
      const inTransit = shipments.filter(s => s.status === 'in_transit').length;
      const delivered = shipments.filter(s => COMPLETED_STATUSES.includes(s.status as ShipmentStatus)).length;

      return { active, awaitingPickup, inTransit, delivered, total: shipments.length };
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.SHORT,
  });
}

export function useCreateVendorShipment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (params: Omit<CreateShipmentRequestParams, 'request_source_type' | 'source_actor_id'>) => {
      return LogisticsOrchestratorService.createShipmentRequest({
        ...params,
        request_source_type: 'vendor',
        source_actor_id: userId,
        shipment_type: params.shipment_type ?? 'agri_input',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      toast({ title: t('hookToasts.vendor.shipmentCreated'), description: t('hookToasts.vendor.shipmentEntered') });
    },
    onError: (error: Error) => {
      toast({ title: t('hookToasts.vendor.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddShipmentItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ shipmentId, items }: { shipmentId: string; items: CreateShipmentItemParams[] }) => {
      const insertItems = items.map(item => ({
        shipment_request_id: shipmentId,
        product_name: item.product_name,
        category: item.category ?? null,
        quantity: item.quantity,
        unit: item.unit ?? 'kg',
        weight_kg: item.weight_kg ?? null,
      }));

      const { data, error } = await supabase
        .from('shipment_items')
        .insert(insertItems)
        .select();

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ShipmentItem[];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.shipmentDetail(variables.shipmentId) });
      toast({ title: 'Items added', description: 'Shipment items have been attached.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVendorProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: VENDOR_QUERY_KEYS.vendorProfile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
    staleTime: CACHE_TIME.LONG,
  });
}

export function useUpdateVendorProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (profile: {
      business_name?: string;
      business_type?: string;
      gst_number?: string;
      contact_phone?: string;
      contact_email?: string;
      address?: string;
      district_id?: string;
      market_id?: string;
    }) => {
      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('vendors')
          .update(profile)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      } else {
        const { data, error } = await supabase
          .from('vendors')
          .insert({ user_id: userId, ...profile })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDOR_QUERY_KEYS.vendorProfile(userId) });
      toast({ title: t('hookToasts.vendor.profileUpdated') });
    },
    onError: (error: Error) => {
      toast({ title: t('hookToasts.vendor.error'), description: error.message, variant: 'destructive' });
    },
  });
}
