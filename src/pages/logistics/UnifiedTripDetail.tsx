import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Truck,
  RotateCcw,
  MapPin,
  Calendar,
  Package,
  DollarSign,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { ROUTES } from '@/lib/routes';
import { useUnifiedTripDetail, useVehicleCapacity } from '@/hooks/useUnifiedLogistics';
import StatusBadge from '@/components/logistics/StatusBadge';
import TripLegTimeline from '@/components/logistics/TripLegTimeline';
import CapacityMeter from '@/components/logistics/CapacityMeter';
import EmptyState from '@/components/shared/EmptyState';
import { format, parseISO } from 'date-fns';

const UnifiedTripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading, error } = useUnifiedTripDetail(id);
  const { data: capacityBlock } = useVehicleCapacity(id);

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.tripDetails')}>
        <PageShell title={t('logistics.tripDetails')}>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title={t('logistics.tripDetails')}>
        <PageShell title={t('logistics.tripDetails')}>
          <EmptyState icon={Truck} title={t('logistics.tripNotFound')} />
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.goBack')}
          </Button>
        </PageShell>
      </DashboardLayout>
    );
  }

  const { trip, legs, bookings } = data;
  const DirectionIcon = trip.trip_direction === 'return' ? RotateCcw : Truck;

  const est = trip.estimated_earnings_inr ?? 0;
  const act = trip.actual_earnings_inr ?? 0;

  return (
    <DashboardLayout title={t('logistics.tripDetails')}>
      <PageShell title={t('logistics.tripDetails')}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('common.goBack')}
        </Button>

        {/* Trip Metadata */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DirectionIcon className="h-5 w-5" />
                {trip.trip_direction === 'return' ? t('logistics.returnTrip') :
                 trip.trip_direction === 'mixed' ? t('logistics.mixedTrip') :
                 t('logistics.forwardTrip')}
              </CardTitle>
              <StatusBadge status={trip.trip_status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">{t('logistics.origin')}</p>
                  <p className="font-medium">{trip.start_location ?? t('common.notAvailable')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">{t('logistics.destination')}</p>
                  <p className="font-medium">{trip.end_location ?? t('common.notAvailable')}</p>
                </div>
              </div>
              {trip.planned_start_at && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">{t('logistics.plannedStart')}</p>
                    <p className="font-medium">{format(parseISO(trip.planned_start_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
              )}
              {trip.planned_end_at && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">{t('logistics.plannedEnd')}</p>
                    <p className="font-medium">{format(parseISO(trip.planned_end_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
              )}
              {(est > 0 || act > 0) && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">{t('logistics.earnings')}</p>
                    <p className="font-medium text-green-700">
                      {act > 0 ? `₹${act.toLocaleString('en-IN')}` : `₹${est.toLocaleString('en-IN')} (${t('logistics.estimated')})`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('logistics.vehicleCapacity')}</CardTitle>
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
          </CardContent>
        </Card>

        {/* Trip Legs */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('logistics.tripLegs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <TripLegTimeline legs={legs} />
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              {t('logistics.bookings')} ({bookings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('logistics.noBookings')}</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm">
                      <p className="font-medium">{t('logistics.booking')}: {b.id.slice(0, 8)}...</p>
                      <p className="text-muted-foreground">
                        {b.weight_allocated_kg ? `${b.weight_allocated_kg} kg` : t('common.notAvailable')}
                        {b.confirmed_at && ` · ${t('logistics.confirmedAt')} ${format(parseISO(b.confirmed_at), 'MMM d')}`}
                      </p>
                    </div>
                    <StatusBadge status={b.booking_status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>
    </DashboardLayout>
  );
};

export default UnifiedTripDetail;
