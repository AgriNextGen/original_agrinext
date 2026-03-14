import { LucideIcon, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KpiPriority = 'primary' | 'success' | 'warning' | 'info' | 'neutral';

export interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: LucideIcon;
  priority?: KpiPriority;
  onClick?: () => void;
}

const priorityConfig: Record<KpiPriority, { icon: string; card: string; text: string }> = {
  primary: {
    icon: 'bg-primary/15 text-primary',
    card: 'border-primary/20',
    text: 'text-primary',
  },
  success: {
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    card: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    card: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    card: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
  },
  neutral: {
    icon: 'bg-muted text-muted-foreground',
    card: '',
    text: 'text-muted-foreground',
  },
};

const KpiCard = ({ label, value, trend, icon: Icon, priority = 'neutral', onClick }: KpiCardProps) => {
  const clickable = typeof onClick === 'function';
  const config = priorityConfig[priority];

  const TrendIcon = trend === undefined ? Minus : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendClass = trend === undefined ? 'text-muted-foreground' : trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  const handleKeyDown = clickable
    ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }
    : undefined;

  return (
    <Card
      className={cn(
        'transition-all duration-standard border-2',
        config.card,
        clickable ? 'cursor-pointer hover:-translate-y-[2px] hover:shadow-elev-2 active:translate-y-0' : 'hover:shadow-elev-1'
      )}
      onClick={onClick}
      {...(clickable ? { role: 'button', tabIndex: 0, onKeyDown: handleKeyDown } : {})}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">{label}</p>
            <p className="mt-2 text-3xl font-display font-bold leading-none tabular-nums">{value}</p>
            {trend !== undefined ? (
              <p className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', trendClass)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {Math.abs(trend)}%
              </p>
            ) : null}
          </div>
          {Icon ? (
            <div className={cn('rounded-xl p-2.5 shrink-0', config.icon)}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;
