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
      let query = supabase
        .from('crops')
        .select('*')
        .in('status', ['ready', 'one_week'] as const)
        .order('updated_at', { ascending: false });
      
      if (filters?.cropName) {
        query = query.ilike('crop_name', `%${filters.cropName}%`);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status as "growing" | "one_week" | "ready" | "harvested");
      }
      
      const { data: crops, error } = await query;
      if (error) throw error;
      
      // Enrich with farmer info
      const enriched = await Promise.all(
        (crops || []).map(async (crop) => {
          const [farmerRes, landRes] = await Promise.all([
            supabase.from('profiles').select('full_name, village, district').eq('id', crop.farmer_id).maybeSingle(),
            crop.land_id ? supabase.from('farmlands').select('name, village').eq('id', crop.land_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...crop,
            farmer: farmerRes.data,
            land: landRes.data,
          };
        })
      );
      
      // Filter by district if specified
      if (filters?.district) {
        return enriched.filter(p => 
          p.farmer?.district?.toLowerCase().includes(filters.district!.toLowerCase()) ||
          p.land?.village?.toLowerCase().includes(filters.district!.toLowerCase())
        ) as unknown as MarketProduct[];
      }
      
      return enriched as unknown as MarketProduct[];
    },
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
      
      const { data: orders, error } = await supabase
        .from('market_orders')
        .select('*')
        .eq('buyer_id', buyer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Enrich with crop and farmer info
      const enriched = await Promise.all(
        (orders || []).map(async (order) => {
          const [cropRes, farmerRes] = await Promise.all([
            order.crop_id ? supabase.from('crops').select('crop_name, variety').eq('id', order.crop_id).maybeSingle() : Promise.resolve({ data: null }),
            supabase.from('profiles').select('full_name, village').eq('id', order.farmer_id).maybeSingle(),
          ]);
          
          return {
            ...order,
            crop: cropRes.data,
            farmer: farmerRes.data,
          };
        })
      );
      
      return enriched as MarketOrder[];
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
      
      const { data: result, error } = await supabase
        .from('market_orders')
        .insert({
          buyer_id: buyer.id,
          crop_id: data.crop_id,
          farmer_id: data.farmer_id,
          quantity: data.quantity,
          quantity_unit: data.quantity_unit || 'quintals',
          price_offered: data.price_offered,
          delivery_address: data.delivery_address,
          notes: data.notes,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
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
export const useMarketplaceDashboardStats = () => {
  const { data: products } = useMarketProducts();
  const { data: orders } = useBuyerOrders();
  
  return {
    totalProducts: products?.length || 0,
    freshHarvest: products?.filter(p => p.status === 'ready').length || 0,
    oneWeekAway: products?.filter(p => p.status === 'one_week').length || 0,
    activeOrders: orders?.filter(o => !['delivered', 'cancelled'].includes(o.status)).length || 0,
  };
};
