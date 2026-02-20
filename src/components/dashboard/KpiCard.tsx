import { ReactNode } from 'react';
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

const priorityStyles: Record<KpiPriority, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-muted-foreground',
};

const KpiCard = ({ label, value, trend, icon: Icon, priority = 'neutral', onClick }: KpiCardProps) => {
  const clickable = typeof onClick === 'function';

  const TrendIcon = trend === undefined ? Minus : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendClass = trend === undefined ? 'text-muted-foreground' : trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'transition-all duration-standard',
        clickable ? 'cursor-pointer hover:-translate-y-[2px] hover:shadow-elev-2' : 'hover:shadow-elev-1'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-display font-semibold leading-none">{value}</p>
            {trend !== undefined ? (
              <p className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', trendClass)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {Math.abs(trend)}%
              </p>
            ) : null}
          </div>
          {Icon ? (
            <div className={cn('rounded-lg bg-muted p-2.5', priorityStyles[priority])}>
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default KpiCard;
