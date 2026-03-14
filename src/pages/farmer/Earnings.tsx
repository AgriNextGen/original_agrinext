import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowDownRight,
  Package,
  Clock,
  CheckCircle,
  Plus,
  IndianRupee
} from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import KpiCard from '@/components/dashboard/KpiCard';
import EmptyState from '@/components/shared/EmptyState';
import { useFarmerEarnings, useFarmerTransactions } from '@/hooks/useFarmerEarnings';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDistanceToNow } from 'date-fns';

const FarmerEarnings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: earnings, isLoading: earningsLoading } = useFarmerEarnings();
  const { data: transactions, isLoading: transactionsLoading } = useFarmerTransactions(10);

  const isLoading = earningsLoading || transactionsLoading;

  const hasNoData = !isLoading && earnings?.completedOrders === 0 && earnings?.pendingOrders === 0;

  if (isLoading) {
    return (
      <DashboardLayout title={t('farmer.earnings.title')}>
        <PageShell title={t('farmer.earnings.title')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </PageShell>
      </DashboardLayout>
    );
  }

  if (hasNoData) {
    return (
      <DashboardLayout title={t('farmer.earnings.title')}>
        <PageShell title={t('farmer.earnings.title')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KpiCard label={t('farmer.earnings.totalSales')} value="₹0" icon={IndianRupee} priority="neutral" />
            <KpiCard label={t('farmer.earnings.pendingPayments')} value="₹0" icon={Clock} priority="neutral" />
            <KpiCard label={t('farmer.earnings.completedOrders')} value="0" icon={CheckCircle} priority="neutral" />
          </div>

          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={DollarSign}
                title={t('farmer.earnings.noEarningsYet')}
                description={t('farmer.earnings.noEarningsDescription')}
                actionLabel={t('farmer.earnings.createAListing')}
                onAction={() => navigate('/farmer/listings')}
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t('farmer.earnings.howEarningsWork')}</h3>
                  <p className="text-muted-foreground text-sm">
                    {t('farmer.earnings.howEarningsWorkBody')}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Button size="sm" onClick={() => navigate('/farmer/listings')}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('farmer.earnings.createListing')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/farmer/crops')}>
                      {t('farmer.earnings.manageCrops')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('farmer.earnings.title')}>
      <PageShell title={t('farmer.earnings.title')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            label={t('farmer.earnings.totalSales')}
            value={`₹${(earnings?.totalSales || 0).toLocaleString('en-IN')}`}
            icon={IndianRupee}
            priority={earnings?.totalSales && earnings.totalSales > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            label={t('farmer.earnings.pendingPayments')}
            value={`₹${(earnings?.pendingPayments || 0).toLocaleString('en-IN')}`}
            icon={Clock}
            priority="warning"
          />
          <KpiCard
            label={t('farmer.earnings.completedOrders')}
            value={(earnings?.completedOrders || 0).toString()}
            icon={CheckCircle}
            priority={earnings?.completedOrders && earnings.completedOrders > 0 ? 'success' : 'neutral'}
          />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">{t('farmer.earnings.recentTransactions')}</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary/80"
              onClick={() => navigate('/farmer/orders')}
            >
              {t('farmer.earnings.viewAllOrders')}
            </Button>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">{t('farmer.earnings.noTransactionsYet')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <ArrowDownRight className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transaction.date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        +₹{transaction.amount.toLocaleString('en-IN')}
                      </p>
                      <Badge 
                        variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {earnings && (earnings.totalSales > 0 || earnings.pendingPayments > 0) && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <IndianRupee className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('farmer.earnings.payoutNote')}
              </p>
            </CardContent>
          </Card>
        )}
      </PageShell>
    </DashboardLayout>
  );
};

export default FarmerEarnings;
