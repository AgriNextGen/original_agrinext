import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Package, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import StatusBadge from './StatusBadge';
import type { ReverseLoadCandidate } from '@/services/logistics/types';

interface ReverseLoadCardProps {
  candidate: ReverseLoadCandidate;
  onAccept?: (candidateId: string) => void;
  onDecline?: (candidateId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  className?: string;
}

export default function ReverseLoadCard({
  candidate,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  className,
}: ReverseLoadCardProps) {
  const { t } = useLanguage();

  const canAct = candidate.status === 'identified' || candidate.status === 'offered';

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">{t('logistics.reverseLoadOpportunity')}</span>
            </div>
            <StatusBadge status={candidate.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">{t('logistics.availableCapacity')}:</span>{' '}
              <span className="font-medium">{candidate.available_capacity_kg ?? '—'} kg</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t('logistics.matchScore')}:</span>{' '}
              <span className="font-medium">{candidate.candidate_score}</span>
            </div>
            {candidate.expires_at && (
              <div className="col-span-2 text-xs text-muted-foreground">
                {t('logistics.expiresAt')}: {new Date(candidate.expires_at).toLocaleString()}
              </div>
            )}
          </div>

          {canAct && (
            <div className="flex gap-2 mt-1">
              {onAccept && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => onAccept(candidate.id)}
                  disabled={isAccepting || isDeclining}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {isAccepting ? t('common.loading') : t('logistics.acceptReverseLoad')}
                </Button>
              )}
              {onDecline && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDecline(candidate.id)}
                  disabled={isAccepting || isDeclining}
                >
                  {isDeclining ? t('common.loading') : t('logistics.declineReverseLoad')}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
