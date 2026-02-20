import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const useAdminRealtimeSubscriptions = () => {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();

  useEffect(() => {
    // Only subscribe if user is admin
    if (userRole !== 'admin') return;

    console.log('[Admin Realtime] Setting up subscriptions...');

    // Channel for all admin-relevant changes
    const channel = supabase
      .channel('admin-ecosystem-changes')
      // Listen to profiles changes (new farmers/users)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('[Admin Realtime] Profiles change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-farmers'] });
          queryClient.invalidateQueries({ queryKey: ['admin-all-agents'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New user registered', {
              description: 'A new user has joined the platform',
            });
          }
        }
      )
      // Listen to user_roles changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        (payload) => {
          console.log('[Admin Realtime] User roles change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-farmers'] });
          queryClient.invalidateQueries({ queryKey: ['admin-all-agents'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
        }
      )
      // Listen to crops changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crops' },
        (payload) => {
          console.log('[Admin Realtime] Crops change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-crops'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-recent-activity'] });
          
          if (payload.eventType === 'INSERT') {
            const crop = payload.new as { crop_name?: string };
            toast.info('New crop added', {
              description: `Crop: ${crop.crop_name || 'Unknown'}`,
            });
          }
        }
      )
      // Listen to transport_requests changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transport_requests' },
        (payload) => {
          console.log('[Admin Realtime] Transport request change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-transport'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-recent-activity'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New transport request', {
              description: 'A farmer has requested transport',
            });
          } else if (payload.eventType === 'UPDATE') {
            const req = payload.new as { status?: string };
            toast.info('Transport status updated', {
              description: `Status: ${req.status || 'Unknown'}`,
            });
          }
        }
      )
      // Listen to market_orders changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'market_orders' },
        (payload) => {
          console.log('[Admin Realtime] Market order change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          queryClient.invalidateQueries({ queryKey: ['admin-recent-activity'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New market order', {
              description: 'A new order has been placed',
            });
          } else if (payload.eventType === 'UPDATE') {
            const order = payload.new as { status?: string };
            toast.info('Order status updated', {
              description: `Status: ${order.status || 'Unknown'}`,
            });
          }
        }
      )
      // Listen to buyers changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'buyers' },
        (payload) => {
          console.log('[Admin Realtime] Buyers change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-buyers'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New buyer registered', {
              description: 'A new buyer has joined the marketplace',
            });
          }
        }
      )
      // Listen to transporters changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transporters' },
        (payload) => {
          console.log('[Admin Realtime] Transporters change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-transporters'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New transporter registered', {
              description: 'A new logistics partner has joined',
            });
          }
        }
      )
      // Listen to farmlands changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farmlands' },
        (payload) => {
          console.log('[Admin Realtime] Farmlands change:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['admin-all-farmers'] });
          queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
        }
      )
      .subscribe((status) => {
        console.log('[Admin Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Admin Realtime] Cleaning up subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, userRole]);
};

export default useAdminRealtimeSubscriptions;