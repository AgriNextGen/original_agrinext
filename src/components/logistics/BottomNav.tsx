import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, User } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: ROUTES.LOGISTICS.DASHBOARD },
  { icon: Package, labelKey: 'nav.availableLoads', href: ROUTES.LOGISTICS.AVAILABLE_LOADS },
  { icon: Truck, labelKey: 'nav.activeTrips', href: ROUTES.LOGISTICS.ACTIVE_TRIPS },
  { icon: User, labelKey: 'nav.profile', href: ROUTES.LOGISTICS.PROFILE },
] as const;

export default function LogisticsBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border md:hidden safe-area-bottom"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ icon: Icon, labelKey, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 rounded-lg transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center h-7 w-7 rounded-full transition-colors',
                active && 'bg-primary/10'
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium leading-tight truncate max-w-[60px]">
                {t(labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
