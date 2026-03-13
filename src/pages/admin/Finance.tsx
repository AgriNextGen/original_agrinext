import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import KpiCard from '@/components/dashboard/KpiCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, RotateCcw, Banknote } from 'lucide-react';

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
  const { data, isLoading: loading } = useQuery<FinanceSummary>({
    queryKey: ['admin', 'finance-summary'],
    queryFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('admin-finance-summary');
      if (error) throw error;
      return result;
    },
  });

  return (
    <DashboardLayout title="Finance">
      <PageShell title="Finance" subtitle="Payments & settlement summary">
        <DataState loading={loading} empty={!loading && !data} emptyTitle="No data" emptyMessage="Finance summary is not yet available.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Paid GMV (last 30d)"
              value={`₹${Number(data?.paid_gmv || 0).toLocaleString('en-IN')}`}
              icon={DollarSign}
              priority="success"
            />
            <KpiCard
              label="Refunds"
              value={`₹${Number(data?.refund_amount || 0).toLocaleString('en-IN')}`}
              icon={RotateCcw}
              priority="warning"
            />
            <KpiCard
              label="Payouts"
              value={`${data?.payout_success ?? 0} success`}
              icon={Banknote}
              priority="info"
            />
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
}

