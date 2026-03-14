import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import KpiCard from '@/components/dashboard/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, RotateCcw, Banknote } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type FinanceSummary = {
  paid_gmv: number;
  paid_orders_count: number;
  refund_count: number;
  refund_amount: number;
  payout_pending_kyc: number;
  payout_queued: number;
  payout_success: number;
};

export default function AdminFinance() {
  const { t } = useLanguage();
  const { data, isLoading: loading } = useQuery<FinanceSummary>({
    queryKey: ['admin', 'finance-summary'],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('admin-finance-summary');
      if (error) throw error;
      return result;
    },
  });

  return (
    <DashboardLayout title={t('admin.finance.title')}>
      <PageShell title={t('admin.finance.title')} subtitle={t('admin.finance.subtitle')}>
        <DataState loading={loading} empty={!loading && !data} emptyTitle={t('admin.finance.title')} emptyMessage={t('admin.finance.subtitle')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label={t('admin.finance.revenue')}
              value={`₹${Number(data?.paid_gmv || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              priority="success"
            />
            <KpiCard
              label={t('admin.refunds.title')}
              value={`₹${Number(data?.refund_amount || 0).toLocaleString('en-IN')}`}
              icon={RotateCcw}
              priority="warning"
            />
            <KpiCard
              label={t('admin.finance.payouts')}
              value={`${data?.payout_success ?? 0} ${t('admin.finance.completed')}`}
              icon={Banknote}
              priority="info"
            />
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
}

