import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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
  title: string;
  crop_name: string;
  variety: string | null;
  category: string;
  price: number;
  unit_price: number;
  quantity: number;
  available_qty: number;
  unit: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  is_active: boolean;
  status: string | null;
  trace_code: string | null;
  crop_id: string | null;
  farmer_id: string | null;
  seller_id: string;
  created_at: string;
  updated_at: string;
  crop?: { crop_name: string; variety: string | null; status: string; harvest_estimate: string | null; sowing_date: string | null; estimated_quantity: number | null; quantity_unit: string | null } | null;
  farmer?: { full_name: string; village: string | null; district: string | null; phone: string | null } | null;
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

const LISTING_SELECT = `
  id, title, category, price, unit_price, quantity, available_qty, unit,
  description, location, image_url, is_active, status, trace_code,
  crop_id, farmer_id, seller_id, created_at, updated_at,
  crop:crops!listings_crop_id_fkey(crop_name, variety, status, harvest_estimate, sowing_date, estimated_quantity, quantity_unit)
`;

function buildListingQuery(filters?: { cropName?: string; status?: string; district?: string }) {
  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('is_active', true);

  if (filters?.cropName) {
    query = query.ilike('title', `%${filters.cropName}%`);
  }
  if (filters?.status) {
    const dbStatus = filters.status === 'active' ? 'approved' : filters.status;
    query = query.eq('status', dbStatus);
  }
  return query;
}

async function enrichWithProfiles(listings: any[]): Promise<MarketProduct[]> {
  if (listings.length === 0) return [];

  const sellerIds = [...new Set(listings.map(l => l.seller_id).filter(Boolean))];
  if (sellerIds.length === 0) return listings.map(mapListing);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, village, district, phone')
    .in('id', sellerIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return listings.map(row => mapListing({
    ...row,
    farmer: profileMap.get(row.seller_id) || null,
  }));
}

function mapListing(row: any): MarketProduct {
  return {
    ...row,
    crop_name: row.crop?.crop_name || row.title,
    variety: row.crop?.variety || null,
  };
}

export const useMarketProducts = (filters?: {
  cropName?: string;
  district?: string;
  status?: string;
}) => {
  return useQuery<MarketProduct[]>({
    queryKey: ['market-products', filters],
    queryFn: async () => {
      const { data, error } = await buildListingQuery(filters)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return enrichWithProfiles(data || []);
    },
  });
};

export const useMarketProductsInfinite = (filters?: { cropName?: string; status?: string }) => {
  return useInfiniteQuery({
    queryKey: ['market-products-infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * 24;
      const { data, error } = await buildListingQuery(filters)
        .order('updated_at', { ascending: false })
        .range(from, from + 23);

      if (error) throw error;
      const items = await enrichWithProfiles(data || []);
      return { items, nextPage: items.length === 24 ? (pageParam as number) + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};

export const useProductDetail = (listingId: string) => {
  return useQuery({
    queryKey: ['product-detail', listingId],
    queryFn: async () => {
      const { data: listing, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', listingId)
        .single();

      if (error) throw error;

      const cropName = (listing as any).crop?.crop_name || listing.title;

      const [farmerRes, priceRes, landRes] = await Promise.all([
        listing.seller_id
          ? supabase.from('profiles').select('full_name, village, district, phone').eq('id', listing.seller_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('market_prices').select('*').eq('crop_name', cropName).order('date', { ascending: false }).limit(1).maybeSingle(),
        listing.crop_id
          ? supabase.from('crops').select('land_id').eq('id', listing.crop_id).maybeSingle().then(async (cropRes) => {
              if (cropRes.data?.land_id) {
                return supabase.from('farmlands').select('name, village, district, soil_type').eq('id', cropRes.data.land_id).maybeSingle();
              }
              return { data: null };
            })
          : Promise.resolve({ data: null }),
      ]);

      return {
        ...mapListing({ ...listing, farmer: farmerRes.data }),
        land: landRes.data,
        market_price: priceRes.data,
      };
    },
    enabled: !!listingId,
  });
};

// Get buyer orders
export const useBuyerOrders = () => {
  const { data: buyer } = useBuyerProfile();
  
  return useQuery({
    queryKey: ['buyer-orders', buyer?.id],
    queryFn: async () => {
      if (!buyer?.id) return [];
      // rpcJson returns the value directly (not wrapped in { data })
      const result = await (await import('@/lib/readApi')).rpcJson('list_orders_compact_v1', { p_limit: 50, p_cursor: null });
      return result?.items || [];
    },
    enabled: !!buyer?.id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { data: buyer } = useBuyerProfile();

  return useMutation({
    mutationFn: async (data: {
      listing_id: string;
      quantity: number;
      notes?: string;
    }) => {
      if (!buyer?.id) throw new Error('Buyer profile not found');
      const { placeOrder } = await import('@/lib/marketplaceApi');
      const res = await placeOrder(data.listing_id, data.quantity, data.notes || null);
      if (!res || !res.success) throw new Error(res?.error || 'Order failed');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['market-products'] });
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
