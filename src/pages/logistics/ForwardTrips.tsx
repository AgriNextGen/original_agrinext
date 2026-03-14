import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import DataState from '@/components/ui/DataState';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import { useUnifiedTrips } from '@/hooks/useUnifiedLogistics';
import TripCard from '@/components/logistics/TripCard';

const ForwardTrips = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: trips, isLoading, error } = useUnifiedTrips({ direction: 'forward' });

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.forwardTrips')}>
        <PageShell title={t('logistics.forwardTrips')}>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.forwardTrips')}>
      <PageShell
        title={t('logistics.forwardTrips')}
        subtitle={`${trips?.length ?? 0} ${t('logistics.forwardTripsAvailable')}`}
      >
        <DataState
          empty={!trips || trips.length === 0}
          error={error instanceof Error ? error.message : null}
          emptyTitle={t('logistics.noForwardTrips')}
          emptyMessage={t('logistics.noForwardTripsHint')}
          retry={() => window.location.reload()}
        >
          <div className="space-y-4">
            {(trips ?? []).map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onViewDetail={(id) => navigate(ROUTES.LOGISTICS.UNIFIED_TRIP_DETAIL(id))}
              />
            ))}
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default ForwardTrips;
