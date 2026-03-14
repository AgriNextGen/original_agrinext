import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Sprout,
  ShoppingBag,
  Truck,
  MoreHorizontal,
  Search,
  Package,
  User,
  CalendarDays,
  ClipboardList,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

interface TabItem {
  icon: LucideIcon;
  label: string;
  href: string;
  matchPrefixes?: string[];
}

const BottomTabBar = ({ onMoreClick }: { onMoreClick: () => void }) => {
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useLanguage();

  if (userRole !== 'farmer' && userRole !== 'buyer' && userRole !== 'logistics' && userRole !== 'agent') return null;

  const farmerTabs: TabItem[] = [
    {
      icon: Home,
      label: t('nav.tab.home'),
      href: ROUTES.FARMER.DASHBOARD,
      matchPrefixes: [ROUTES.FARMER.DASHBOARD, ROUTES.FARMER.MY_DAY],
    },
    {
      icon: Sprout,
      label: t('nav.tab.crops'),
      href: ROUTES.FARMER.CROPS,
      matchPrefixes: [ROUTES.FARMER.CROPS, ROUTES.FARMER.FARMLANDS],
    },
    {
      icon: ShoppingBag,
      label: t('nav.tab.market'),
      href: ROUTES.FARMER.LISTINGS,
      matchPrefixes: [ROUTES.FARMER.LISTINGS, ROUTES.FARMER.ORDERS, ROUTES.FARMER.EARNINGS],
    },
    {
      icon: Truck,
      label: t('nav.tab.transport'),
      href: ROUTES.FARMER.TRANSPORT,
      matchPrefixes: [ROUTES.FARMER.TRANSPORT],
    },
  ];

  const buyerTabs: TabItem[] = [
    {
      icon: Home,
      label: t('nav.dashboard'),
      href: ROUTES.MARKETPLACE.DASHBOARD,
    },
    {
      icon: Search,
      label: t('nav.browseProducts'),
      href: ROUTES.MARKETPLACE.BROWSE,
      matchPrefixes: [ROUTES.MARKETPLACE.BROWSE, '/marketplace/product'],
    },
    {
      icon: Package,
      label: t('nav.myOrders'),
      href: ROUTES.MARKETPLACE.ORDERS,
    },
    {
      icon: User,
      label: t('nav.profile'),
      href: ROUTES.MARKETPLACE.PROFILE,
    },
  ];

  const agentTabs: TabItem[] = [
    {
      icon: CalendarDays,
      label: t('nav.today'),
      href: ROUTES.AGENT.TODAY,
      matchPrefixes: [ROUTES.AGENT.TODAY, ROUTES.AGENT.DASHBOARD],
    },
    {
      icon: ClipboardList,
      label: t('nav.tasks'),
      href: ROUTES.AGENT.TASKS,
      matchPrefixes: [ROUTES.AGENT.TASKS],
    },
    {
      icon: Users,
      label: t('nav.farmers'),
      href: ROUTES.AGENT.MY_FARMERS,
      matchPrefixes: [ROUTES.AGENT.MY_FARMERS, ROUTES.AGENT.FARMERS, '/agent/farmer'],
    },
    {
      icon: Truck,
      label: t('nav.tab.transport'),
      href: ROUTES.AGENT.TRANSPORT,
      matchPrefixes: [ROUTES.AGENT.TRANSPORT],
    },
  ];

  const logisticsTabs: TabItem[] = [
    {
      icon: Home,
      label: t('nav.dashboard'),
      href: ROUTES.LOGISTICS.DASHBOARD,
    },
    {
      icon: Package,
      label: t('nav.availableLoads'),
      href: ROUTES.LOGISTICS.AVAILABLE_LOADS,
      matchPrefixes: [ROUTES.LOGISTICS.AVAILABLE_LOADS],
    },
    {
      icon: Truck,
      label: t('nav.activeTrips'),
      href: ROUTES.LOGISTICS.ACTIVE_TRIPS,
      matchPrefixes: [ROUTES.LOGISTICS.ACTIVE_TRIPS, '/logistics/trip'],
    },
    {
      icon: User,
      label: t('nav.profile'),
      href: ROUTES.LOGISTICS.PROFILE,
    },
  ];

  const tabs = userRole === 'agent' ? agentTabs : userRole === 'logistics' ? logisticsTabs : userRole === 'buyer' ? buyerTabs : farmerTabs;

  const isActive = (tab: TabItem) => {
    if (tab.matchPrefixes) {
      return tab.matchPrefixes.some(
        (prefix) =>
          location.pathname === prefix ||
          location.pathname.startsWith(prefix + '/')
      );
    }
    return location.pathname === tab.href;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[48px] min-w-[48px]',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
              <tab.icon
                className={cn(
                  'h-5 w-5 transition-all',
                  active && 'scale-110'
                )}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}

        {(userRole === 'farmer' || userRole === 'agent') && (
          <button
            type="button"
            onClick={onMoreClick}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors min-h-[48px] min-w-[48px]"
            aria-label={t('nav.tab.more')}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>{t('nav.tab.more')}</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default BottomTabBar;
