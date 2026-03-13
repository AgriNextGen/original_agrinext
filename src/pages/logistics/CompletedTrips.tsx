import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import KpiCard from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, MapPin, Calendar, Package } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { useTrips } from '@/hooks/useTrips';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';

const CompletedTrips = () => {
  const { t } = useLanguage();
  const { data: trips, isLoading } = useTrips(['delivered', 'completed']);

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.completedTrips')}>
        <PageShell title={t('logistics.completedTrips')}>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('logistics.completedTrips')}>
      <PageShell title={t('logistics.completedTrips')} subtitle={`${trips?.length || 0} ${t('logistics.tripsCompletedSuccessfully')}`}>
      {/* Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t('logistics.deliveryHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!trips || trips.length === 0 ? (
            <EmptyState icon={Package} title={t('logistics.noCompletedTrips')} description={t('logistics.deliveryHistoryHint')} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('logistics.farmer')}</TableHead>
                    <TableHead>{t('logistics.crop')}</TableHead>
                    <TableHead>{t('logistics.quantity')}</TableHead>
                    <TableHead>{t('logistics.pickupLocation')}</TableHead>
                    <TableHead>{t('common.completed')}</TableHead>
                    <TableHead>{t('logistics.totalDistanceKm')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell>
                        <p className="font-medium">{trip.farmer?.full_name || t('common.unknown')}</p>
                        <p className="text-xs text-muted-foreground">
                          {[trip.farmer?.village, trip.farmer?.district].filter(Boolean).join(', ')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{trip.crop?.crop_name || t('common.notAvailable')}</p>
                        {trip.crop?.variety && (
                          <p className="text-xs text-muted-foreground">{trip.crop.variety}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {trip.transport_request?.quantity ?? '—'} {trip.transport_request?.quantity_unit || 'quintals'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{trip.transport_request?.pickup_village || trip.transport_request?.pickup_location || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {trip.delivered_at ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(parseISO(trip.delivered_at), 'MMM d, yyyy')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(trip as any).distance_km ? (
                          <span>{(trip as any).distance_km} km</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {trips && trips.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label={t('logistics.totalDeliveries')} value={trips.length} icon={CheckCircle2} priority="success" />
          <KpiCard label={t('logistics.totalQuintals')} value={trips.reduce((acc, trip) => acc + (trip.transport_request?.quantity || 0), 0)} icon={Package} priority="primary" />
          <KpiCard label={t('logistics.totalDistanceKm')} value={trips.reduce((acc, trip) => acc + ((trip as any).distance_km || 0), 0)} icon={MapPin} priority="info" />
          <KpiCard label={t('logistics.farmersServed')} value={new Set(trips.map((trip) => trip.transport_request?.farmer_id).filter(Boolean)).size} icon={Package} priority="warning" />
        </div>
      )}
      </PageShell>
    </DashboardLayout>
  );
};

export default CompletedTrips;
