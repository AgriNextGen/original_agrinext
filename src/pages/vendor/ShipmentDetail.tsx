import { useParams, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, MapPin, Package, Calendar, Truck } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorShipmentDetail } from '@/hooks/useVendorDashboard';
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge';
import { ShipmentItemsList } from '@/components/shared/ShipmentItemsList';
import { ShipmentTimeline } from '@/components/shared/ShipmentTimeline';
import EmptyState from '@/components/shared/EmptyState';
import { ROUTES } from '@/lib/routes';

const ShipmentDetail = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { data: shipment, isLoading, error } = useVendorShipmentDetail(id ?? '');

  if (isLoading) {
    return (
      <DashboardLayout title={t('vendor.shipmentDetail.title')}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !shipment) {
    return (
      <DashboardLayout title={t('vendor.shipmentDetail.title')}>
        <div className="p-4 md:p-6">
          <EmptyState
            icon={Package}
            title={t('vendor.shipmentDetail.notFound')}
            description={t('vendor.shipmentDetail.notFoundDesc')}
            actionLabel={t('common.back')}
            onAction={() => window.history.back()}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('vendor.shipmentDetail.title')}>
      <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to={ROUTES.VENDOR.ACTIVE_SHIPMENTS}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold">
                {t('vendor.shipmentDetail.title')}
              </h1>
              <ShipmentStatusBadge status={shipment.status} />
            </div>
            <p className="text-sm text-muted-foreground">{shipment.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('vendor.shipmentDetail.metadata')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('vendor.createShipment.shipmentType')}</p>
                    <p className="text-sm font-medium capitalize">{shipment.shipment_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('vendor.createShipment.shipmentWeight')}</p>
                    <p className="text-sm font-medium">{shipment.weight_estimate_kg ?? '—'} kg</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vendor.createShipment.originLocation')}</p>
                      <p className="text-sm">{shipment.pickup_location ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('vendor.createShipment.destinationLocation')}</p>
                      <p className="text-sm">{shipment.drop_location ?? '—'}</p>
                    </div>
                  </div>
                </div>
                {shipment.pickup_time_window_start && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Pickup: {new Date(shipment.pickup_time_window_start).toLocaleString()}</span>
                  </div>
                )}
                {shipment.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('vendor.createShipment.shipmentDescription')}</p>
                    <p className="text-sm">{shipment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('vendor.shipmentDetail.items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ShipmentItemsList items={shipment.items ?? []} />
              </CardContent>
            </Card>

            {shipment.bookings?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('vendor.shipmentDetail.booking')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shipment.bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Truck className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {booking.booking_status.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Trip: {booking.unified_trip_id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p>{booking.weight_allocated_kg ?? '—'} kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('vendor.shipmentDetail.statusTimeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ShipmentTimeline currentStatus={shipment.status} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ShipmentDetail;
