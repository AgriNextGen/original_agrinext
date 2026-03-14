import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
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
import { DollarSign, Truck, RotateCcw } from 'lucide-react';
import DataState from '@/components/ui/DataState';
import { useLanguage } from '@/hooks/useLanguage';
import { useTransportEarnings } from '@/hooks/useUnifiedLogistics';
import EarningsSummaryCard from '@/components/logistics/EarningsSummaryCard';
import StatusBadge from '@/components/logistics/StatusBadge';

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const EarningsView = () => {
  const { t } = useLanguage();
  const { data: earnings, isLoading, error } = useTransportEarnings();

  if (isLoading) {
    return (
      <DashboardLayout title={t('logistics.earnings')}>
        <PageShell title={t('logistics.earningsSummary')}>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  const hasData = earnings && earnings.tripCount > 0;
  const hasEarnings = earnings && earnings.combinedEarnings > 0;

  return (
    <DashboardLayout title={t('logistics.earnings')}>
      <PageShell
        title={t('logistics.earningsSummary')}
        subtitle={hasData ? `${earnings.tripCount} ${t('logistics.tripsTracked')}` : undefined}
      >
        <DataState
          empty={!hasData}
          error={error instanceof Error ? error.message : null}
          emptyTitle={t('logistics.noEarningsYet')}
          emptyMessage={t('logistics.noEarningsHint')}
          retry={() => window.location.reload()}
        >
          {earnings && (
            <>
              <EarningsSummaryCard
                forwardEarnings={earnings.forwardEarnings}
                reverseEarnings={earnings.reverseEarnings}
                combinedEarnings={earnings.combinedEarnings}
                tripCount={earnings.tripCount}
                className="mb-6"
              />

              {!hasEarnings && (
                <Card className="mb-6">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    {t('logistics.earningsPlaceholderNote')}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('logistics.tripWiseBreakdown')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('logistics.tripDirection')}</TableHead>
                          <TableHead>{t('logistics.route')}</TableHead>
                          <TableHead>{t('common.status')}</TableHead>
                          <TableHead>{t('logistics.estimatedEarnings')}</TableHead>
                          <TableHead>{t('logistics.actualEarnings')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {earnings.trips.map((trip) => (
                          <TableRow key={trip.id}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {trip.direction === 'return' ? (
                                  <RotateCcw className="h-3.5 w-3.5 text-orange-600" />
                                ) : (
                                  <Truck className="h-3.5 w-3.5 text-blue-600" />
                                )}
                                <span className="text-sm capitalize">{trip.direction}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {trip.start_location ?? '—'} → {trip.end_location ?? '—'}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={trip.status} />
                            </TableCell>
                            <TableCell className="text-sm">
                              {trip.estimated > 0 ? formatINR(trip.estimated) : '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-green-700">
                              {trip.actual > 0 ? formatINR(trip.actual) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
};

export default EarningsView;
