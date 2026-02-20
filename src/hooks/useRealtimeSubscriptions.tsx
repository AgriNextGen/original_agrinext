import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to set up real-time subscriptions for farmer dashboard data
 * This enables live updates when data changes in the database
 */
export const useRealtimeSubscriptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to crops changes
    const cropsChannel = supabase
      .channel('crops-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crops',
          filter: `farmer_id=eq.${user.id}`,
        },
        () => {
          console.log('Crops updated - refreshing data');
          queryClient.invalidateQueries({ queryKey: ['crops', user.id] });
        }
      )
      .subscribe();

    // Subscribe to farmlands changes
    const farmlandsChannel = supabase
      .channel('farmlands-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'farmlands',
          filter: `farmer_id=eq.${user.id}`,
        },
        () => {
          console.log('Farmlands updated - refreshing data');
          queryClient.invalidateQueries({ queryKey: ['farmlands', user.id] });
        }
      )
      .subscribe();

    // Subscribe to transport requests changes
    const transportChannel = supabase
      .channel('transport-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transport_requests',
          filter: `farmer_id=eq.${user.id}`,
        },
        () => {
          console.log('Transport requests updated - refreshing data');
          queryClient.invalidateQueries({ queryKey: ['transport-requests', user.id] });
        }
      )
      .subscribe();

    // Subscribe to notifications changes
    const notificationsChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Notifications updated - refreshing data');
          queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user.id] });
        }
      )
      .subscribe();

    // Subscribe to market orders changes (for farmer orders)
    const ordersChannel = supabase
      .channel('farmer-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_orders',
          filter: `farmer_id=eq.${user.id}`,
        },
        () => {
          console.log('Market orders updated - refreshing data');
          queryClient.invalidateQueries({ queryKey: ['farmer-orders', user.id] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(cropsChannel);
      supabase.removeChannel(farmlandsChannel);
      supabase.removeChannel(transportChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user?.id, queryClient]);
};

export default useRealtimeSubscriptions;