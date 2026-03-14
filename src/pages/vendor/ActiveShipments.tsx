import { Loader2, Package } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorActiveShipments } from '@/hooks/useVendorDashboard';
import { ShipmentCard } from '@/components/shared/ShipmentCard';
import EmptyState from '@/components/shared/EmptyState';

const ActiveShipments = () => {
  const { t } = useLanguage();
  const { data: shipments, isLoading } = useVendorActiveShipments();

  return (
    <DashboardLayout title={t('vendor.activeShipments.title')}>
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-display font-bold">{t('vendor.activeShipments.title')}</h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !shipments?.length ? (
          <EmptyState
            icon={Package}
            title={t('vendor.activeShipments.noShipments')}
            description={t('vendor.activeShipments.noShipmentsDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                detailPath={`/vendor/shipments/${shipment.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ActiveShipments;
