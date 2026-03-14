import { Loader2, RotateCcw, Truck, Package } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useVendorReverseOpportunities } from '@/hooks/useVendorDashboard';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  identified: 'bg-blue-100 text-blue-800',
  offered: 'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const ReverseLogistics = () => {
  const { t } = useLanguage();
  const { data: opportunities, isLoading } = useVendorReverseOpportunities();

  return (
    <DashboardLayout title={t('vendor.reverseLogistics.title')}>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">{t('vendor.reverseLogistics.title')}</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !opportunities?.length ? (
          <EmptyState
            icon={Package}
            title={t('vendor.reverseLogistics.noOpportunities')}
            description={t('vendor.reverseLogistics.noOpportunitiesDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((candidate) => (
              <Card key={candidate.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {t('vendor.reverseLogistics.opportunity')}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_COLORS[candidate.status] ?? STATUS_COLORS.identified
                      )}
                    >
                      {candidate.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t('vendor.reverseLogistics.availableCapacity')}</span>
                      <span className="font-medium">{candidate.available_capacity_kg ?? '—'} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-medium">{candidate.candidate_score}</span>
                    </div>
                    {candidate.expires_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Expires</span>
                        <span className="text-xs">{new Date(candidate.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>Trip: {candidate.unified_trip_id.slice(0, 8)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReverseLogistics;
