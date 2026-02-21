import { useState, useEffect, useMemo } from 'react';
import { Bell, Search, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useFarmerNotifications, useFarmerProfile } from '@/hooks/useFarmerDashboard';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import SyncIndicator from '@/components/SyncIndicator';

interface DashboardHeaderProps {
  title: string;
  onMenuClick?: () => void;
}

const DashboardHeader = ({ title, onMenuClick }: DashboardHeaderProps) => {
  const { user, signOut, userRole } = useAuth();
  const { t } = useLanguage();
  const { data: notifications } = useFarmerNotifications();
  const { data: profile } = useFarmerProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const unreadCount = useMemo(() => 
    notifications?.filter(n => !n.is_read).length || 0,
    [notifications]
  );
  
  const recentNotifications = useMemo(() => 
    notifications?.slice(0, 5) || [],
    [notifications]
  );

  // Set up real-time notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-header')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user?.id] });
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const initials = getInitials(profile?.full_name, user?.email);

  // Role-specific settings navigation
  const getSettingsPath = () => {
    const rolePaths: Record<string, string> = {
      farmer: '/farmer/settings',
      buyer: '/marketplace/profile',
      logistics: '/logistics/profile',
      agent: '/agent/dashboard',
      admin: '/admin/dashboard',
    };
    return rolePaths[userRole || ''] || '/';
  };

  // Role-specific notification path
  const getNotificationPath = () => {
    if (userRole === 'farmer') return '/farmer/notifications';
    return getSettingsPath();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg md:text-xl font-semibold text-foreground truncate max-w-[200px] md:max-w-none">
          {title}
        </h1>
        <div className="ml-3">
          <SyncIndicator />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile Search Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setSearchOpen(!searchOpen)}
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </Button>

        {/* Desktop Search */}
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 bg-muted/50 border-0"
          />
        </div>
        
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>{t('nav.notifications')}</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">{unreadCount} {t('common.unread')}</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recentNotifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('notifications.no_notifications')}
              </div>
            ) : (
              <>
                {recentNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      if (!notification.is_read) {
                        markAsRead(notification.id);
                      }
                      navigate(getNotificationPath());
                    }}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-medium text-sm">{notification.title}</span>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-center justify-center text-primary cursor-pointer"
                  onClick={() => navigate(getNotificationPath())}
                >
                  {t('notifications.view_all')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name || t('common.user')}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(getSettingsPath())}>
              {t('settings.profile_settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={signOut}
            >
              {t('auth.sign_out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Bar */}
      {searchOpen && (
        <div className="absolute top-16 left-0 right-0 p-4 bg-background border-b border-border md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-full pl-9"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
