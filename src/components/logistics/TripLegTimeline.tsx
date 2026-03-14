import { MapPin, Package, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import StatusBadge from './StatusBadge';
import type { TripLeg } from '@/services/logistics/types';

interface TripLegTimelineProps {
  legs: TripLeg[];
  className?: string;
}

const LEG_ICONS = {
  pickup: Package,
  drop: MapPin,
  waypoint: Navigation,
} as const;

export default function TripLegTimeline({ legs, className }: TripLegTimelineProps) {
  const { t } = useLanguage();

  if (legs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">{t('logistics.noTripLegs')}</p>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {legs.map((leg, idx) => {
        const Icon = LEG_ICONS[leg.leg_type] ?? Navigation;
        const isLast = idx === legs.length - 1;

        return (
          <div key={leg.id} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                leg.status === 'completed' ? 'border-green-500 bg-green-50' :
                leg.status === 'in_progress' ? 'border-blue-500 bg-blue-50' :
                'border-gray-300 bg-gray-50'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {leg.leg_type === 'pickup' ? t('logistics.pickup') :
                   leg.leg_type === 'drop' ? t('logistics.dropoff') :
                   t('logistics.waypoint')}
                  {' '}#{leg.sequence_order}
                </p>
                <StatusBadge status={leg.status} className="text-xs" />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {leg.location_name ?? t('common.unknown')}
              </p>
              {leg.estimated_arrival_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('logistics.eta')}: {new Date(leg.estimated_arrival_at).toLocaleString()}
                </p>
              )}
              {leg.actual_arrival_at && (
                <p className="text-xs text-green-600 mt-0.5">
                  {t('logistics.arrived')}: {new Date(leg.actual_arrival_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
