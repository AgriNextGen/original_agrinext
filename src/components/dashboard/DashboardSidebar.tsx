import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Sprout as CropIcon,
  LandPlot,
  Truck, 
  DollarSign, 
  Settings, 
  LogOut,
  Sprout,
  Bell,
  ShoppingBag,
  Package,
  X,
  ClipboardList,
  Users,
  Sparkles,
  Database,
  TestTube,
  Inbox,
  Ticket,
  Bot,
  Briefcase,
  CalendarDays,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useFarmerNotifications } from '@/hooks/useFarmerDashboard';
import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
}

const DashboardSidebar = ({ onClose, isOpen = true, isMobile = false }: DashboardSidebarProps) => {
  const location = useLocation();
  const { signOut, userRole } = useAuth();
  const { t } = useLanguage();
  const { data: notifications } = useFarmerNotifications();
  
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  // Farmer navigation items
  const farmerNavItems = [
    { icon: CalendarDays, label: 'My Day', href: '/farmer/my-day' },
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/farmer/dashboard' },
    { icon: CropIcon, label: t('nav.crops'), href: '/farmer/crops' },
    { icon: LandPlot, label: t('nav.farmlands'), href: '/farmer/farmlands' },
    { icon: Truck, label: t('nav.transport'), href: '/farmer/transport' },
    { icon: ShoppingBag, label: t('nav.listings'), href: '/farmer/listings' },
    { icon: Package, label: t('nav.orders'), href: '/farmer/orders' },
    { icon: DollarSign, label: t('nav.earnings'), href: '/farmer/earnings' },
    { 
      icon: Bell, 
      label: t('nav.notifications'), 
      href: '/farmer/notifications',
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { icon: Settings, label: t('nav.settings'), href: '/farmer/settings' },
  ];

  // Agent navigation items
  const agentNavItems = [
    { icon: CalendarDays, label: 'Today', href: '/agent/today' },
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/agent/dashboard' },
    { icon: ClipboardList, label: t('nav.myTasks'), href: '/agent/tasks' },
    { icon: Users, label: t('nav.myFarmers'), href: '/agent/my-farmers' },
    { icon: Users, label: t('nav.farmersAndCrops'), href: '/agent/farmers' },
    { icon: Truck, label: t('nav.transport'), href: '/agent/transport' },
    { icon: MapPin, label: 'Service Area', href: '/agent/service-area' },
    { icon: Settings, label: t('nav.profile'), href: '/agent/profile' },
  ];

  // Logistics navigation items
  const logisticsNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/logistics/dashboard' },
    { icon: Package, label: t('nav.availableLoads'), href: '/logistics/loads' },
    { icon: Truck, label: t('nav.activeTrips'), href: '/logistics/trips' },
    { icon: CropIcon, label: t('nav.completed'), href: '/logistics/completed' },
    { icon: LandPlot, label: t('nav.myVehicles'), href: '/logistics/vehicles' },
    { icon: MapPin, label: 'Service Area', href: '/logistics/service-area' },
    { icon: Settings, label: t('nav.profile'), href: '/logistics/profile' },
  ];

  // Buyer/Marketplace navigation items
  const buyerNavItems = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/marketplace/dashboard' },
    { icon: ShoppingBag, label: t('nav.browseProducts'), href: '/marketplace/browse' },
    { icon: Package, label: t('nav.myOrders'), href: '/marketplace/orders' },
    { icon: Settings, label: t('nav.profile'), href: '/marketplace/profile' },
  ];

  // Admin navigation items
  const adminNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Inbox, label: 'Ops Inbox', href: '/admin/ops' },
    { icon: Ticket, label: 'Tickets', href: '/admin/tickets' },
    { icon: Users, label: 'Farmers', href: '/admin/farmers' },
    { icon: Sparkles, label: 'Agents', href: '/admin/agents' },
    { icon: Truck, label: 'Transporters', href: '/admin/transporters' },
    { icon: ShoppingBag, label: 'Buyers', href: '/admin/buyers' },
    { icon: CropIcon, label: 'Crops', href: '/admin/crops' },
    { icon: Package, label: 'Transport', href: '/admin/transport' },
    { icon: ClipboardList, label: 'Orders', href: '/admin/orders' },
    { icon: ClipboardList, label: 'Pending Updates', href: '/admin/pending-updates' },
    { icon: Bot, label: 'AI Review', href: '/admin/ai-review' },
    { icon: Briefcase, label: 'Jobs', href: '/admin/jobs' },
    { icon: DollarSign, label: 'Finance', href: '/admin/finance' },
    { icon: Sparkles, label: 'AI Console', href: '/admin/ai-console' },
    { icon: Database, label: 'Seed Data', href: '/admin/seed-data' },
    { icon: TestTube, label: 'Mysuru Demo', href: '/admin/mysuru-demo' },
    { icon: Settings, label: 'Data Health', href: '/admin/data-health' },
  ];

  // Select nav items based on user role
  const navItems = userRole === 'agent' 
    ? agentNavItems 
    : userRole === 'logistics' 
      ? logisticsNavItems 
      : userRole === 'buyer'
        ? buyerNavItems
        : userRole === 'admin'
          ? adminNavItems
          : farmerNavItems;
  
  const dashboardTitle = userRole === 'agent' 
    ? 'AgriNext Gen Agent' 
    : userRole === 'logistics'
      ? 'AgriNext Gen Transport'
      : userRole === 'buyer'
        ? 'AgriNext Gen Market'
        : userRole === 'admin'
          ? 'AgriNext Gen Admin'
          : 'AgriNext Gen';

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside 
      className={cn(
        "h-screen w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0",
        // Mobile: fixed drawer with transform
        isMobile && "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        isMobile && (isOpen ? "translate-x-0" : "-translate-x-full"),
        // Desktop: static in document flow (handled by parent)
        !isMobile && "relative"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              userRole === 'agent' 
                ? 'bg-purple-600' 
                : userRole === 'logistics'
                  ? 'bg-blue-600'
                  : userRole === 'buyer'
                    ? 'bg-orange-600'
                    : userRole === 'admin'
                      ? 'bg-rose-600'
                      : 'bg-sidebar-primary'
            )}>
              {userRole === 'agent' ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : userRole === 'logistics' ? (
                <Truck className="w-5 h-5 text-white" />
              ) : userRole === 'buyer' ? (
                <ShoppingBag className="w-5 h-5 text-white" />
              ) : userRole === 'admin' ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : (
                <Sprout className="w-5 h-5 text-sidebar-primary-foreground" />
              )}
            </div>
            <div>
              <span className="font-display font-bold text-lg text-sidebar-foreground leading-tight block">
                {dashboardTitle}
              </span>
              {userRole === 'agent' && (
                <span className="text-xs text-purple-500 font-medium">Field Operations</span>
              )}
              {userRole === 'logistics' && (
                <span className="text-xs text-blue-500 font-medium">Logistics Partner</span>
              )}
              {userRole === 'buyer' && (
                <span className="text-xs text-orange-500 font-medium">Marketplace Buyer</span>
              )}
              {userRole === 'admin' && (
                <span className="text-xs text-rose-500 font-medium">Command Center</span>
              )}
            </div>
          </div>
          {/* Mobile close button */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent pointer-events-auto relative z-10"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? userRole === 'agent' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : userRole === 'logistics'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : userRole === 'buyer'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          : userRole === 'admin'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            : 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {'badge' in item && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full min-w-[20px] text-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => {
              signOut();
              if (onClose) onClose();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
