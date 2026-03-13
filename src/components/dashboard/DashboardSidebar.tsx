import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Sprout,
  LandPlot,
  Truck,
  DollarSign,
  Settings,
  LogOut,
  Bell,
  ShoppingBag,
  Package,
  X,
  ClipboardList,
  Users,
  UsersRound,
  UserCog,
  Database,
  TestTube,
  Inbox,
  Ticket,
  Bot,
  Briefcase,
  CalendarDays,
  MapPin,
  AlertTriangle,
  Activity,
  DatabaseZap,
  Banknote,
  RotateCcw,
  Clock,
  CheckCircle,
  CarFront,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

interface DashboardSidebarProps {
  onClose?: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
}

const DashboardSidebar = ({ onClose, isOpen = true, isMobile = false }: DashboardSidebarProps) => {
  const location = useLocation();
  const { signOut, userRole } = useAuth();
  const { t } = useLanguage();
  const { data: notifications } = useNotifications();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  // ── Farmer: 2 groups ──────────────────────────────────────────────
  const farmerGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { icon: CalendarDays, label: t('nav.myDay'), href: ROUTES.FARMER.MY_DAY },
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: ROUTES.FARMER.DASHBOARD },
        { icon: Sprout, label: t('nav.crops'), href: ROUTES.FARMER.CROPS },
        { icon: LandPlot, label: t('nav.farmlands'), href: ROUTES.FARMER.FARMLANDS },
      ],
    },
    {
      label: t('nav.group.marketLogistics'),
      items: [
        { icon: Truck, label: t('nav.transport'), href: ROUTES.FARMER.TRANSPORT },
        { icon: ShoppingBag, label: t('nav.listings'), href: ROUTES.FARMER.LISTINGS },
        { icon: Package, label: t('nav.orders'), href: ROUTES.FARMER.ORDERS },
        { icon: DollarSign, label: t('nav.earnings'), href: ROUTES.FARMER.EARNINGS },
        { icon: Bell, label: t('nav.notifications'), href: ROUTES.FARMER.NOTIFICATIONS, badge: unreadCount > 0 ? unreadCount : undefined },
        { icon: Settings, label: t('nav.settings'), href: ROUTES.FARMER.SETTINGS },
      ],
    },
  ];

  // ── Agent: 3 groups ───────────────────────────────────────────────
  const agentGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { icon: CalendarDays, label: t('nav.today'), href: ROUTES.AGENT.TODAY },
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: ROUTES.AGENT.DASHBOARD },
        { icon: ClipboardList, label: t('nav.myTasks'), href: ROUTES.AGENT.TASKS },
      ],
    },
    {
      label: t('nav.group.network'),
      items: [
        { icon: Users, label: t('nav.myFarmers'), href: ROUTES.AGENT.MY_FARMERS },
        { icon: UsersRound, label: t('nav.farmersAndCrops'), href: ROUTES.AGENT.FARMERS },
        { icon: Truck, label: t('nav.transport'), href: ROUTES.AGENT.TRANSPORT },
        { icon: MapPin, label: t('nav.serviceArea'), href: ROUTES.AGENT.SERVICE_AREA },
      ],
    },
    {
      label: t('nav.group.account'),
      items: [
        { icon: Settings, label: t('nav.profile'), href: ROUTES.AGENT.PROFILE },
      ],
    },
  ];

  // ── Logistics ─────────────────────────────────────────────────────
  const logisticsGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: ROUTES.LOGISTICS.DASHBOARD },
        { icon: Package, label: t('nav.availableLoads'), href: ROUTES.LOGISTICS.AVAILABLE_LOADS },
        { icon: Truck, label: t('nav.activeTrips'), href: ROUTES.LOGISTICS.ACTIVE_TRIPS },
        { icon: CheckCircle, label: t('nav.completed'), href: ROUTES.LOGISTICS.COMPLETED_TRIPS },
        { icon: CarFront, label: t('nav.myVehicles'), href: ROUTES.LOGISTICS.VEHICLES },
        { icon: MapPin, label: t('nav.serviceArea'), href: ROUTES.LOGISTICS.SERVICE_AREA },
        { icon: Settings, label: t('nav.profile'), href: ROUTES.LOGISTICS.PROFILE },
      ],
    },
  ];

  // ── Buyer ─────────────────────────────────────────────────────────
  const buyerGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: ROUTES.MARKETPLACE.DASHBOARD },
        { icon: ShoppingBag, label: t('nav.browseProducts'), href: ROUTES.MARKETPLACE.BROWSE },
        { icon: Package, label: t('nav.myOrders'), href: ROUTES.MARKETPLACE.ORDERS },
        { icon: Settings, label: t('nav.profile'), href: ROUTES.MARKETPLACE.PROFILE },
      ],
    },
  ];

  // ── Admin: 6 groups ───────────────────────────────────────────────
  const adminGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: ROUTES.ADMIN.DASHBOARD },
        { icon: Inbox, label: t('nav.opsInbox'), href: ROUTES.ADMIN.OPS_INBOX },
        { icon: Ticket, label: t('nav.tickets'), href: ROUTES.ADMIN.TICKETS },
      ],
    },
    {
      label: t('nav.group.network'),
      items: [
        { icon: Users, label: t('nav.farmers'), href: ROUTES.ADMIN.FARMERS },
        { icon: UserCog, label: t('nav.agents'), href: ROUTES.ADMIN.AGENTS },
        { icon: Truck, label: t('nav.transporters'), href: ROUTES.ADMIN.TRANSPORTERS },
        { icon: ShoppingBag, label: t('nav.buyers'), href: ROUTES.ADMIN.BUYERS },
        { icon: Sprout, label: t('nav.allCrops'), href: ROUTES.ADMIN.CROPS },
      ],
    },
    {
      label: t('nav.group.operations'),
      items: [
        { icon: Package, label: t('nav.transport'), href: ROUTES.ADMIN.TRANSPORT },
        { icon: ClipboardList, label: t('nav.orders'), href: ROUTES.ADMIN.ORDERS },
        { icon: Clock, label: t('nav.pendingUpdates'), href: ROUTES.ADMIN.PENDING_UPDATES },
      ],
    },
    {
      label: t('nav.group.aiIntelligence'),
      items: [
        { icon: Bot, label: t('nav.aiReview'), href: ROUTES.ADMIN.AI_REVIEW },
        { icon: Sparkles, label: t('nav.aiConsole'), href: ROUTES.ADMIN.AI_CONSOLE },
      ],
    },
    {
      label: t('nav.group.finance'),
      items: [
        { icon: DollarSign, label: t('nav.finance'), href: ROUTES.ADMIN.FINANCE },
        { icon: Banknote, label: t('nav.payouts') || 'Payouts', href: ROUTES.ADMIN.PAYOUTS },
        { icon: RotateCcw, label: t('nav.refunds') || 'Refunds', href: ROUTES.ADMIN.REFUNDS },
        { icon: AlertTriangle, label: t('nav.disputes') || 'Disputes', href: ROUTES.ADMIN.DISPUTES },
      ],
    },
    {
      label: t('nav.group.system'),
      items: [
        { icon: Activity, label: t('nav.systemHealth') || 'System Health', href: ROUTES.ADMIN.SYSTEM_HEALTH },
        { icon: Database, label: t('nav.seedData'), href: ROUTES.ADMIN.SEED_DATA },
        { icon: TestTube, label: t('nav.mysuruDemo'), href: ROUTES.ADMIN.MYSURU_DEMO },
        { icon: Briefcase, label: t('nav.jobs'), href: ROUTES.ADMIN.JOBS },
        { icon: DatabaseZap, label: t('nav.dataHealth'), href: ROUTES.ADMIN.DATA_HEALTH },
      ],
    },
  ];

  const navGroups: NavGroup[] =
    userRole === 'agent' ? agentGroups
    : userRole === 'logistics' ? logisticsGroups
    : userRole === 'buyer' ? buyerGroups
    : userRole === 'admin' ? adminGroups
    : farmerGroups;

  const dashboardTitle =
    userRole === 'agent' ? t('dashboardShell.title.agent')
    : userRole === 'logistics' ? t('dashboardShell.title.logistics')
    : userRole === 'buyer' ? t('dashboardShell.title.buyer')
    : userRole === 'admin' ? t('dashboardShell.title.admin')
    : t('dashboardShell.title.farmer');

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const activeClass = 'bg-sidebar-accent text-sidebar-primary';

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={cn(
        "h-screen w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0",
        isMobile && "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out",
        isMobile && (isOpen ? "translate-x-0" : "-translate-x-full"),
        !isMobile && "relative"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-sidebar-primary">
              {userRole === 'agent' ? <Sparkles className="w-5 h-5 text-sidebar-primary-foreground" />
              : userRole === 'logistics' ? <Truck className="w-5 h-5 text-sidebar-primary-foreground" />
              : userRole === 'buyer' ? <ShoppingBag className="w-5 h-5 text-sidebar-primary-foreground" />
              : userRole === 'admin' ? <Activity className="w-5 h-5 text-sidebar-primary-foreground" />
              : <Sprout className="w-5 h-5 text-sidebar-primary-foreground" />}
            </div>
            <div>
              <span className="font-display font-bold text-lg text-sidebar-foreground leading-tight block">
                {dashboardTitle}
              </span>
              {userRole && userRole !== 'farmer' && (
                <span className="text-xs text-sidebar-primary font-medium">
                  {t(`dashboardShell.subtitle.${userRole}`)}
                </span>
              )}
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent pointer-events-auto relative z-10"
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

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
          {navGroups.map((group, gi) => (
            <div key={gi} className={cn(gi > 0 && "mt-4")}>
              {group.label && (
                <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={handleNavClick}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? activeClass
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </div>
                      {item.badge != null && item.badge > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full min-w-[20px] text-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            aria-label={t('nav.logout')}
            onClick={() => {
              signOut();
              if (onClose) onClose();
            }}
            className="flex w-full justify-start items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            {t('nav.logout')}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
