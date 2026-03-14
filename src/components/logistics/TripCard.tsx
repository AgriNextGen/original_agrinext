import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ArrowRight, Truck, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';
import StatusBadge from './StatusBadge';
import type { UnifiedTrip } from '@/services/logistics/types';

interface TripCardProps {
  trip: UnifiedTrip;
  onViewDetail?: (tripId: string) => void;
  className?: string;
}

export default function TripCard({ trip, onViewDetail, className }: TripCardProps) {
  const { t } = useLanguage();

  const DirectionIcon = trip.trip_direction === 'return' ? RotateCcw : Truck;
  const directionLabel =
    trip.trip_direction === 'return'
      ? t('logistics.returnTrip')
      : trip.trip_direction === 'mixed'
        ? t('logistics.mixedTrip')
        : t('logistics.forwardTrip');

  const est = trip.estimated_earnings_inr ?? 0;
  const act = trip.actual_earnings_inr ?? 0;
  const earnings = act > 0 ? act : est;

  const totalKg = trip.capacity_total_kg ?? 0;
  const usedKg = trip.capacity_used_kg ?? 0;
  const capacityPct = totalKg > 0 ? Math.round((usedKg / totalKg) * 100) : 0;

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DirectionIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{directionLabel}</span>
            </div>
            <StatusBadge status={trip.trip_status} />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{trip.start_location ?? t('common.unknown')}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">{trip.end_location ?? t('common.unknown')}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {trip.planned_start_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{t('logistics.pickup')}:</span>
                <span>{format(parseISO(trip.planned_start_at), 'MMM d')}</span>
              </div>
            )}
            {trip.planned_end_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{t('logistics.delivery')}:</span>
                <span>{format(parseISO(trip.planned_end_at), 'MMM d')}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('logistics.load')}:</span>{' '}
              <span>{usedKg} / {totalKg > 0 ? totalKg : '—'} kg ({capacityPct}%)</span>
            </div>
            {earnings > 0 && (
              <div>
                <span className="text-muted-foreground">{t('logistics.earnings')}:</span>{' '}
                <span className="font-medium text-green-700">₹{earnings.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {onViewDetail && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-1"
              onClick={() => onViewDetail(trip.id)}
            >
              {t('logistics.viewDetails')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
