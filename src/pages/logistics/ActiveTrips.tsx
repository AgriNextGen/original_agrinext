import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  MapPin, 
  Calendar, 
  Phone,
  Package,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { useActiveUnifiedTrips } from '@/hooks/useUnifiedLogistics';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { useLanguage } from '@/hooks/useLanguage';
import { TRANSPORT_STATUS_COLORS } from '@/lib/constants';
import TripCard from '@/components/logistics/TripCard';

const ActiveTrips = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: trips, isLoading } = useTrips(['accepted', 'pickup_done', 'in_transit']);
  const { data: unifiedTrips } = useActiveUnifiedTrips();

  const openGoogleMaps = (location: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.activeTrips')}>
        <PageShell title={t('logistics.activeTrips')}>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.activeTrips')}>
      <PageShell
        title={t('logistics.activeTrips')}
        subtitle={`${trips?.length || 0} ${t('logistics.tripsInProgress')}`}
      >

      {/* Trips List */}
      <DataState
        empty={!trips || trips.length === 0}
        emptyTitle={t('logistics.noActiveTrips')}
        emptyMessage={t('logistics.acceptToStart')}
      >
        <div className="space-y-4">
          {(trips ?? []).map((trip) => {
            const request = trip.transport_request;
            
            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Trip Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                          {trip.crop?.crop_name || t('logistics.unknownCrop')}
                          {trip.crop?.variety && (
                            <span className="text-muted-foreground font-normal ml-2">
                              ({trip.crop.variety})
                            </span>
                          )}
                        </h3>
                        <Badge className={TRANSPORT_STATUS_COLORS[trip.status] ?? 'bg-gray-100 text-gray-800'}>
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">{t('logistics.farmer')}</p>
                          <p className="font-medium">{trip.farmer?.full_name || t('common.unknown')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('logistics.quantity')}</p>
                          <p className="font-medium">{request?.quantity} {request?.quantity_unit || t('common.quintals')}</p>
                        </div>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">{t('logistics.pickupLocation')}</p>
                            <p className="font-medium">{request?.pickup_village || request?.pickup_location}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-muted-foreground">{t('logistics.preferredDate')}</p>
                            <p className="font-medium">
                              {request?.preferred_date 
                                ? format(parseISO(request.preferred_date), 'MMM d, yyyy')
                                : t('common.flexible')}
                              {request?.preferred_time && ` @ ${request.preferred_time}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {request?.notes && (
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <p className="text-muted-foreground">{t('logistics.notes')}: {request.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-[180px]">
                      <Button 
                        onClick={() => navigate(ROUTES.LOGISTICS.TRIP_DETAIL(trip.id))}
                        className="w-full"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        {t('logistics.openTrip')}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openGoogleMaps(request?.pickup_village || request?.pickup_location || '')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('logistics.openInMaps')}
                      </Button>

                      {trip.farmer?.phone && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`tel:${trip.farmer?.phone}`)}
                          className="w-full"
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          {t('logistics.callFarmer')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DataState>
      {!trips || trips.length === 0 ? (
        <div className="pt-2">
          <Button onClick={() => navigate(ROUTES.LOGISTICS.AVAILABLE_LOADS)}>{t('logistics.browseAvailableLoads')}</Button>
        </div>
      ) : null}

      {unifiedTrips && unifiedTrips.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {t('logistics.unifiedActiveTrips')}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.LOGISTICS.FORWARD_TRIPS)}>
              {t('common.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {unifiedTrips.slice(0, 5).map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onViewDetail={(id) => navigate(ROUTES.LOGISTICS.UNIFIED_TRIP_DETAIL(id))}
              />
            ))}
          </div>
        </div>
      )}
      </PageShell>
    </DashboardLayout>
  );
};

export default ActiveTrips;
