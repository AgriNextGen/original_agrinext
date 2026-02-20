import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EarningsSummary {
  totalSales: number;
  pendingPayments: number;
  completedOrders: number;
  pendingOrders: number;
}

export interface OrderTransaction {
  id: string;
  type: 'credit';
  description: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  cropName: string | null;
  buyerName: string | null;
}

/**
 * Hook to fetch real earnings data from market_orders
 * Total Sales = sum of price_offered for delivered/completed orders
 * Pending = sum of price_offered for requested/confirmed/shipped orders
 */
export const useFarmerEarnings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['farmer-earnings', user?.id],
    queryFn: async (): Promise<EarningsSummary> => {
      if (!user?.id) {
        return { totalSales: 0, pendingPayments: 0, completedOrders: 0, pendingOrders: 0 };
      }

      const { data: orders, error } = await supabase
        .from('market_orders')
        .select('status, price_offered')
        .eq('farmer_id', user.id);

      if (error) throw error;

      const completedStatuses = ['delivered', 'completed'];
      const pendingStatuses = ['pending', 'confirmed', 'shipped'];

      let totalSales = 0;
      let pendingPayments = 0;
      let completedOrders = 0;
      let pendingOrders = 0;

      for (const order of orders || []) {
        const amount = order.price_offered || 0;
        
        if (completedStatuses.includes(order.status)) {
          totalSales += amount;
          completedOrders++;
        } else if (pendingStatuses.includes(order.status)) {
          pendingPayments += amount;
          pendingOrders++;
        }
      }

      return {
        totalSales,
        pendingPayments,
        completedOrders,
        pendingOrders,
      };
    },
    enabled: !!user?.id,
  });
};

/**
 * Hook to fetch recent transactions (orders as transactions)
 */
export const useFarmerTransactions = (limit: number = 20) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['farmer-transactions', user?.id, limit],
    queryFn: async (): Promise<OrderTransaction[]> => {
      if (!user?.id) return [];

      const { data: orders, error } = await supabase
        .from('market_orders')
        .select(`
          id,
          status,
          price_offered,
          created_at,
          crop_id
        `)
        .eq('farmer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Enrich with crop and buyer info
      const transactions: OrderTransaction[] = await Promise.all(
        (orders || []).map(async (order) => {
          let cropName: string | null = null;
          let buyerName: string | null = null;

          if (order.crop_id) {
            const { data: crop } = await supabase
              .from('crops')
              .select('crop_name')
              .eq('id', order.crop_id)
              .maybeSingle();
            cropName = crop?.crop_name || null;
          }

          const completedStatuses = ['delivered', 'completed'];

          return {
            id: order.id,
            type: 'credit' as const,
            description: cropName 
              ? `Order for ${cropName}` 
              : `Order #${order.id.slice(0, 8).toUpperCase()}`,
            amount: order.price_offered || 0,
            date: order.created_at,
            status: completedStatuses.includes(order.status) ? 'completed' as const : 'pending' as const,
            cropName,
            buyerName,
          };
        })
      );

      return transactions;
    },
    enabled: !!user?.id,
  });
};
