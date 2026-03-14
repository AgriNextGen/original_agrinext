import { Package, MapPin, DollarSign, RotateCcw, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RecommendationScoreBadge } from './RecommendationScoreBadge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import type { LoadRecommendation } from '@/services/logistics/types';

interface LoadRecommendationCardProps {
  recommendation: LoadRecommendation;
  rank: number;
  onAccept?: (poolId: string) => void;
  className?: string;
}

export function LoadRecommendationCard({
  recommendation: rec,
  rank,
  onAccept,
  className,
}: LoadRecommendationCardProps) {
  const { t } = useLanguage();

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
              rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              #{rank}
            </div>
            <div>
              <p className="text-sm font-medium">
                {rec.total_weight_kg} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {rec.member_count} shipment{rec.member_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <RecommendationScoreBadge score={rec.recommendation_score} />
        </div>

        <div className="space-y-1.5 text-sm">
          {rec.pickup_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <span className="truncate">{rec.pickup_location}</span>
            </div>
          )}
          {rec.drop_location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="truncate">{rec.drop_location}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            <span>{Math.round(rec.capacity_fit_score)}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>{rec.estimated_earnings_inr != null ? `₹${Math.round(rec.estimated_earnings_inr)}` : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            <span>{Math.round(rec.reverse_load_score)}</span>
          </div>
        </div>

        {onAccept && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => onAccept(rec.load_pool_id)}
          >
            <Package className="h-3.5 w-3.5 mr-1" />
            {t('logistics.recommendations.viewPool')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
