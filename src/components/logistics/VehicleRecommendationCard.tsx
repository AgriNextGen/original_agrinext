import { Truck, MapPin, DollarSign, Shield, RotateCcw, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RecommendationScoreBadge } from './RecommendationScoreBadge';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import type { VehicleRecommendationRow } from '@/services/logistics/types';

interface VehicleRecommendationCardProps {
  recommendation: VehicleRecommendationRow;
  rank: number;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  isAccepting?: boolean;
  className?: string;
}

function ScoreFactor({ label, score, icon: Icon }: { label: string; score: number; icon: typeof Truck }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Progress value={score} className="h-1.5 w-16" />
        <span className="font-medium w-7 text-right">{Math.round(score)}</span>
      </div>
    </div>
  );
}

export function VehicleRecommendationCard({
  recommendation: rec,
  rank,
  onAccept,
  onReject,
  isAccepting,
  className,
}: VehicleRecommendationCardProps) {
  const { t } = useLanguage();

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-md',
      rank === 1 && 'ring-2 ring-primary/20',
      className,
    )}>
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
              <p className="text-sm font-medium">{rec.vehicle_id?.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">
                {rec.vehicle_capacity_kg ?? 0} kg capacity
              </p>
            </div>
          </div>
          <RecommendationScoreBadge score={rec.recommendation_score} />
        </div>

        <div className="space-y-1.5">
          <ScoreFactor label={t('logistics.recommendations.capacityFit')} score={rec.capacity_fit_score} icon={Truck} />
          <ScoreFactor label={t('logistics.recommendations.routeMatch')} score={rec.route_match_score} icon={MapPin} />
          <ScoreFactor label={t('logistics.recommendations.price')} score={rec.price_score} icon={DollarSign} />
          <ScoreFactor label={t('logistics.recommendations.reliability')} score={rec.reliability_score} icon={Shield} />
          <ScoreFactor label={t('logistics.recommendations.reverseLoad')} score={rec.reverse_load_score} icon={RotateCcw} />
        </div>

        {rec.distance_to_pickup_km != null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
            <MapPin className="h-3 w-3" />
            <span>{rec.distance_to_pickup_km} km to pickup</span>
          </div>
        )}

        {(onAccept || onReject) && (
          <div className="flex gap-2 pt-1">
            {onAccept && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => onAccept(rec.id)}
                disabled={isAccepting}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {t('logistics.recommendations.accept')}
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onReject(rec.id)}
                disabled={isAccepting}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {t('logistics.recommendations.reject')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
