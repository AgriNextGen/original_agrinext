import { Loader2, Sparkles } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { usePendingRecommendations, useAcceptRecommendation, useRejectRecommendation } from '@/hooks/useVehicleRecommendations';
import { VehicleRecommendationCard } from '@/components/logistics/VehicleRecommendationCard';
import EmptyState from '@/components/shared/EmptyState';

const Recommendations = () => {
  const { t } = useLanguage();
  const { data: recommendations, isLoading } = usePendingRecommendations();
  const acceptMutation = useAcceptRecommendation();
  const rejectMutation = useRejectRecommendation();

  const grouped = new Map<string, typeof recommendations>();
  (recommendations ?? []).forEach((rec) => {
    const poolId = rec.load_pool_id;
    const group = grouped.get(poolId) ?? [];
    group.push(rec);
    grouped.set(poolId, group);
  });

  return (
    <DashboardLayout title={t('logistics.recommendations.title')}>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">{t('logistics.recommendations.title')}</h1>
            <p className="text-muted-foreground">{t('logistics.recommendations.description')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : grouped.size === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={t('logistics.recommendations.noRecommendations')}
            description={t('logistics.recommendations.noRecommendationsDesc')}
          />
        ) : (
          Array.from(grouped.entries()).map(([poolId, recs]) => (
            <Card key={poolId}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {t('logistics.recommendations.poolLabel')} {poolId.slice(0, 8)}
                  <span className="text-xs text-muted-foreground font-normal">
                    {recs.length} {t('logistics.recommendations.vehiclesRanked')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recs.map((rec, i) => (
                    <VehicleRecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      rank={i + 1}
                      onAccept={(id) => acceptMutation.mutate(id)}
                      onReject={(id) => rejectMutation.mutate(id)}
                      isAccepting={acceptMutation.isPending}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default Recommendations;
