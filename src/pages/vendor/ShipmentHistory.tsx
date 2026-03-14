import { Loader2, MapPin, ArrowRight, Calendar, Package } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorShipmentHistory } from '@/hooks/useVendorDashboard';
import { ShipmentStatusBadge } from '@/components/shared/ShipmentStatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { Link } from 'react-router-dom';

const ShipmentHistory = () => {
  const { t } = useLanguage();
  const { data: shipments, isLoading } = useVendorShipmentHistory();

  return (
    <DashboardLayout title={t('vendor.shipmentHistory.title')}>
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-display font-bold">{t('vendor.shipmentHistory.title')}</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !shipments?.length ? (
          <EmptyState
            icon={Package}
            title={t('vendor.shipmentHistory.noHistory')}
            description={t('vendor.shipmentHistory.noHistoryDesc')}
          />
        ) : (
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <Link key={shipment.id} to={`/vendor/shipments/${shipment.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{shipment.id.slice(0, 8)}</span>
                          <ShipmentStatusBadge status={shipment.status} />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-green-600" />
                          <span>{shipment.pickup_location ?? '—'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{shipment.drop_location ?? '—'}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(shipment.updated_at).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1">{shipment.weight_estimate_kg ?? 0} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShipmentHistory;
