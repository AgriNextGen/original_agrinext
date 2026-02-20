import { useState } from 'react';
import { useFarmerNotifications, useFarmerProfile } from '@/hooks/useFarmerDashboard';
import { useIsDistrictValid } from '@/hooks/useKarnatakaDistricts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Bell, 
  Cloud, 
  TrendingUp, 
  Sprout, 
  FileText, 
  AlertTriangle,
  ChevronRight,
  Check,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
  price: { icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  weather: { icon: Cloud, color: 'text-blue-600 bg-blue-100' },
  crop: { icon: Sprout, color: 'text-primary bg-primary/10' },
  scheme: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
  alert: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
  pickup: { icon: Bell, color: 'text-primary bg-primary/10' },
  info: { icon: Bell, color: 'text-muted-foreground bg-muted' },
};

const AdvisoriesList = () => {
  const { data: notifications, isLoading } = useFarmerNotifications();
  const { data: profile } = useFarmerProfile();
  const hasValidDistrict = useIsDistrictValid(profile?.district);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user?.id] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Advisories & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const latestNotification = notifications?.[0];

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer group">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Advisories & Alerts
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {unreadCount} new
                  </Badge>
                )}
              </CardTitle>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Show fallback message if district is not set */}
          {!hasValidDistrict && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                Set your district to see local advisories and alerts
              </AlertDescription>
            </Alert>
          )}

          {/* Compact View - Always visible summary */}
          {!isExpanded && (
            <div className="space-y-2">
              {!notifications || notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              ) : latestNotification ? (
                <div className={`flex gap-3 p-2 rounded-lg ${
                  latestNotification.is_read 
                    ? 'bg-muted/30' 
                    : 'bg-primary/5'
                }`}>
                  {(() => {
                    const category = categoryConfig[latestNotification.type.toLowerCase()] || categoryConfig.info;
                    const Icon = category.icon;
                    return (
                      <div className={`p-1.5 rounded-lg h-fit ${category.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{latestNotification.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{latestNotification.message}</p>
                  </div>
                </div>
              ) : null}
              {notifications && notifications.length > 1 && (
                <p className="text-xs text-muted-foreground">+{notifications.length - 1} more notifications</p>
              )}
            </div>
          )}

          {/* Expanded View */}
          <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-6">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {notifications.slice(0, 5).map((notification) => {
                  const category = categoryConfig[notification.type.toLowerCase()] || categoryConfig.info;
                  const Icon = category.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                        notification.is_read 
                          ? 'bg-card border-border/50' 
                          : 'bg-primary/5 border-primary/20'
                      }`}
                    >
                      <div className={`p-2 rounded-lg h-fit ${category.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {notifications.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => window.location.href = '/farmer/notifications'}
                  >
                    View all notifications
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default AdvisoriesList;
