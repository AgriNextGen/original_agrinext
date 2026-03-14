import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, RotateCcw, Plus } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorDashboardStats, useVendorActiveShipments } from '@/hooks/useVendorDashboard';
import { ShipmentCard } from '@/components/shared/ShipmentCard';
import EmptyState from '@/components/shared/EmptyState';
import { ROUTES } from '@/lib/routes';
import { Loader2 } from 'lucide-react';

const VendorDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useVendorDashboardStats();
  const { data: activeShipments, isLoading: shipmentsLoading } = useVendorActiveShipments();

  const kpis = [
    { label: t('vendor.dashboard.activeShipments'), value: stats?.active ?? 0, icon: Package, color: 'text-blue-600' },
    { label: t('vendor.dashboard.awaitingPickup'), value: stats?.awaitingPickup ?? 0, icon: Truck, color: 'text-amber-600' },
    { label: t('vendor.dashboard.inTransit'), value: stats?.inTransit ?? 0, icon: Truck, color: 'text-cyan-600' },
    { label: t('vendor.dashboard.delivered'), value: stats?.delivered ?? 0, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <DashboardLayout title={t('vendor.dashboard.title')}>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">{t('vendor.dashboard.title')}</h1>
            <p className="text-muted-foreground">{t('vendor.dashboard.welcome')}</p>
          </div>
          <Button
            variant="hero"
            onClick={() => navigate(ROUTES.VENDOR.CREATE_SHIPMENT)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('nav.createShipment')}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : kpi.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('vendor.dashboard.activeShipments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {shipmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !activeShipments?.length ? (
              <EmptyState
                icon={Package}
                title={t('vendor.dashboard.noActiveShipments')}
                description={t('vendor.dashboard.noActiveShipmentsDesc')}
                actionLabel={t('nav.createShipment')}
                onAction={() => navigate(ROUTES.VENDOR.CREATE_SHIPMENT)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeShipments.slice(0, 6).map((shipment) => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                    detailPath={`/vendor/shipments/${shipment.id}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorDashboard;
