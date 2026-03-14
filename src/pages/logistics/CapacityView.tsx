import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import DataState from '@/components/ui/DataState';
import KpiCard from '@/components/dashboard/KpiCard';
import { Truck, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import { useAllTripsCapacity } from '@/hooks/useUnifiedLogistics';
import CapacityMeter from '@/components/logistics/CapacityMeter';
import StatusBadge from '@/components/logistics/StatusBadge';

const CapacityView = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: tripsCapacity, isLoading, error } = useAllTripsCapacity();

  const totalCapacity = (tripsCapacity ?? []).reduce(
    (acc, tc) => acc + (tc.trip.capacity_total_kg ?? 0), 0
  );
  const totalUsed = (tripsCapacity ?? []).reduce(
    (acc, tc) => acc + (tc.trip.capacity_used_kg ?? 0), 0
  );
  const totalRemaining = totalCapacity - totalUsed;
  const avgUtilization = totalCapacity > 0
    ? Math.round((totalUsed / totalCapacity) * 100) : 0;

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.vehicleUtilization')}>
        <PageShell title={t('logistics.vehicleUtilization')}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
            {[1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.vehicleUtilization')}>
      <PageShell
        title={t('logistics.vehicleUtilization')}
        subtitle={`${tripsCapacity?.length ?? 0} ${t('logistics.activeTripsWithCapacity')}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label={t('logistics.totalCapacity')}
            value={`${totalCapacity} kg`}
            icon={Truck}
            priority="info"
          />
          <KpiCard
            label={t('logistics.capacityUsed')}
            value={`${totalUsed} kg`}
            icon={Package}
            priority="primary"
          />
          <KpiCard
            label={t('logistics.capacityRemaining')}
            value={`${totalRemaining} kg`}
            icon={Package}
            priority="success"
          />
          <KpiCard
            label={t('logistics.avgUtilization')}
            value={`${avgUtilization}%`}
            icon={Truck}
            priority={avgUtilization > 80 ? 'warning' : 'info'}
          />
        </div>

        <DataState
          empty={!tripsCapacity || tripsCapacity.length === 0}
          error={error instanceof Error ? error.message : null}
          emptyTitle={t('logistics.noActiveTripsCapacity')}
          emptyMessage={t('logistics.noActiveTripsCapacityHint')}
          retry={() => window.location.reload()}
        >
          <div className="space-y-4">
            {(tripsCapacity ?? []).map(({ trip, capacityBlock }) => (
              <Card key={trip.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {trip.start_location ?? t('common.unknown')} → {trip.end_location ?? t('common.unknown')}
                    </CardTitle>
                    <StatusBadge status={trip.trip_status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <CapacityMeter
                    totalKg={trip.capacity_total_kg}
                    usedKg={trip.capacity_used_kg}
                  />
                  {capacityBlock && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('logistics.capacityBlockRemaining')}: {capacityBlock.remaining_weight_kg} kg
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate(ROUTES.LOGISTICS.UNIFIED_TRIP_DETAIL(trip.id))}
                  >
                    {t('logistics.viewDetails')} <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default CapacityView;
