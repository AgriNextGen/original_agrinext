import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useFarmerNotifications } from '@/hooks/useFarmerDashboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  TrendingUp, 
  Cloud, 
  Sprout, 
  Gift, 
  AlertCircle,
  Check,
  CheckCheck,
  Truck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  price: { icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600', label: 'Price Alert' },
  weather: { icon: Cloud, color: 'bg-blue-100 text-blue-600', label: 'Weather' },
  crop: { icon: Sprout, color: 'bg-amber-100 text-amber-600', label: 'Crop' },
  scheme: { icon: Gift, color: 'bg-purple-100 text-purple-600', label: 'Scheme' },
  pickup: { icon: Truck, color: 'bg-primary/10 text-primary', label: 'Pickup' },
  info: { icon: AlertCircle, color: 'bg-muted text-muted-foreground', label: 'Info' },
};

const NotificationsPage = () => {
  const { data: notifications, isLoading } = useFarmerNotifications();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const filteredNotifications = notifications?.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    return (n.type || 'info') === filter;
  });

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user?.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update notification';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);
      if (error) throw error;
      toast({ title: 'All notifications marked as read' });
      queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user?.id] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update notifications';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'price', label: 'Price' },
    { value: 'weather', label: 'Weather' },
    { value: 'crop', label: 'Crop' },
    { value: 'pickup', label: 'Pickup' },
  ];

  return (
    <DashboardLayout title="Notifications">
      <PageShell
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          ) : undefined
        }
      >
        {/* Header Stats */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              {opt.value === 'unread' && unreadCount > 0 && (
                <Badge className="ml-2 bg-destructive text-destructive-foreground">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Notifications List */}
        <DataState loading={isLoading} empty={!isLoading && (!filteredNotifications || filteredNotifications.length === 0)} emptyTitle="No notifications found">
          <div className="space-y-3">
            {filteredNotifications?.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.info;
              const Icon = config.icon;
              
              return (
                <Card 
                  key={notification.id} 
                  className={`hover:shadow-medium transition-all ${
                    !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${config.color} shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default NotificationsPage;
