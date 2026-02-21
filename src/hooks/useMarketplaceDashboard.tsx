import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Buyer {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  district: string | null;
  buyer_type: string;
  preferred_crops: string[];
  created_at: string;
  updated_at: string;
}

export interface MarketProduct {
  id: string;
  crop_name: string;
  variety: string | null;
  estimated_quantity: number | null;
  quantity_unit: string | null;
  status: string;
  harvest_estimate: string | null;
  sowing_date: string | null;
  farmer_id: string;
  farmer?: { full_name: string; village: string; district: string };
  land?: { name: string; village: string };
}

export interface MarketOrder {
  id: string;
  buyer_id: string;
  crop_id: string | null;
  farmer_id: string;
  quantity: number;
  quantity_unit: string;
  price_offered: number | null;
  status: string;
  transporter_id: string | null;
  delivery_date: string | null;
  delivery_address: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
  crop?: { crop_name: string; variety: string };
  farmer?: { full_name: string; village: string };
}

// Get buyer profile
export const useBuyerProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['buyer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Buyer | null;
    },
    enabled: !!user?.id,
  });
};

// Create buyer profile
export const useCreateBuyerProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<Buyer>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data: result, error } = await supabase
        .from('buyers')
        .insert({
          user_id: user.id,
          name: data.name || 'Buyer',
          company_name: data.company_name,
          phone: data.phone,
          district: data.district,
          buyer_type: data.buyer_type || 'retail',
          preferred_crops: data.preferred_crops || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-profile'] });
      toast.success('Profile created!');
    },
    onError: (error) => {
      toast.error('Failed to create profile: ' + error.message);
    },
  });
};

// Get available products (crops ready for sale)
export const useMarketProducts = (filters?: {
  cropName?: string;
  district?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['market-products', filters],
    queryFn: async () => {
      // Call compact RPC with simple filter translation
      const filter: any = {};
      if (filters?.cropName) filter.crop_name = filters.cropName;
      if (filters?.status) filter.status = filters.status;
      const { rpcJson } = await import('@/lib/readApi');
      const data = await rpcJson('list_market_products_compact_v1', { p_filter: filter, p_limit: 30, p_cursor: null });
      return data?.items || [];
    },
  });
};

// Infinite product list (cursor pagination)
export const useMarketProductsInfinite = (filters?: { cropName?: string; status?: string }) => {
  const { cropName, status } = filters || {};
  return useInfiniteQuery({
    queryKey: ['market-products-infinite', filters],
    queryFn: async ({ pageParam = null }) => {
      const filter: any = {};
      if (cropName) filter.crop_name = cropName;
      if (status) filter.status = status;
      const { rpcJson } = await import('@/lib/readApi');
      const data = await rpcJson('list_market_products_compact_v1', { p_filter: filter, p_limit: 24, p_cursor: pageParam });
      // rpc returns { items, next_cursor }
      return { items: data?.items || [], next_cursor: data?.next_cursor || null };
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });
};

// Get single product details
export const useProductDetail = (cropId: string) => {
  return useQuery({
    queryKey: ['product-detail', cropId],
    queryFn: async () => {
      const { data: crop, error } = await supabase
        .from('crops')
        .select('*')
        .eq('id', cropId)
        .single();
      
      if (error) throw error;
      
      const [farmerRes, landRes, priceRes] = await Promise.all([
        supabase.from('profiles').select('full_name, village, district, phone').eq('id', crop.farmer_id).maybeSingle(),
        crop.land_id ? supabase.from('farmlands').select('name, village, district, soil_type').eq('id', crop.land_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('market_prices').select('*').eq('crop_name', crop.crop_name).order('date', { ascending: false }).limit(1).maybeSingle(),
      ]);
      
      return {
        ...crop,
        farmer: farmerRes.data,
        land: landRes.data,
        market_price: priceRes.data,
      };
    },
    enabled: !!cropId,
  });
};

// Get buyer orders
export const useBuyerOrders = () => {
  const { data: buyer } = useBuyerProfile();
  
  return useQuery({
    queryKey: ['buyer-orders', buyer?.id],
    queryFn: async () => {
      if (!buyer?.id) return [];
      // use compact orders RPC (cursorless first page)
      const { data } = await (await import('@/lib/readApi')).rpcJson('list_orders_compact_v1', { p_limit: 50, p_cursor: null });
      return data?.items || [];
    },
    enabled: !!buyer?.id,
  });
};

// Create order
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { data: buyer } = useBuyerProfile();
  
  return useMutation({
    mutationFn: async (data: {
      crop_id: string;
      farmer_id: string;
      quantity: number;
      quantity_unit?: string;
      price_offered?: number;
      delivery_address?: string;
      notes?: string;
    }) => {
      if (!buyer?.id) throw new Error('Buyer profile not found');
      // Use Edge function / RPC via marketplaceApi
      const { placeOrder } = await import('@/lib/marketplaceApi');
      const res = await placeOrder(data.crop_id, data.quantity, data.notes || null);
      if (!res || !res.success) throw new Error(res?.error || 'Order failed');
      // Invalidate buyer orders to refresh UI
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast.success('Order placed successfully!');
    },
    onError: (error) => {
      toast.error('Failed to place order: ' + error.message);
    },
  });
};

// Dashboard stats
import { rpcJson } from '@/lib/readApi';

export const useMarketplaceDashboardStats = () => {
  return useQuery({
    queryKey: ['marketplace-dashboard'],
    queryFn: async () => {
      const data = await rpcJson('buyer_dashboard_v1');
      // map returned structure to expected fields used by components
      const totalProducts = 0; // remain from client product list where available
      const freshHarvest = 0;
      const oneWeekAway = 0;
      const activeOrders = (data?.recent_orders_top10 || []).length;
      return { totalProducts, freshHarvest, oneWeekAway, activeOrders, raw: data };
    },
  });
};
