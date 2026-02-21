import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useEffect, useState } from 'react';

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
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/.netlify/functions/admin-finance-summary');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('finance fetch', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout title="Finance">
      <PageShell title="Finance" subtitle="Payments & settlement summary">
        <div className="space-y-4">
          {loading && <div>Loading...</div>}
          {!loading && data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded">
                <h4 className="text-sm text-muted-foreground">Paid GMV (last 30d)</h4>
                <div className="text-2xl font-semibold">₹{Number(data.paid_gmv || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">{data.paid_orders_count} paid orders</div>
              </div>
              <div className="p-4 border rounded">
                <h4 className="text-sm text-muted-foreground">Refunds</h4>
                <div className="text-2xl font-semibold">₹{Number(data.refund_amount || 0).toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">{data.refund_count} refunds</div>
              </div>
              <div className="p-4 border rounded">
                <h4 className="text-sm text-muted-foreground">Payouts</h4>
                <div className="text-lg">Pending KYC: {data.payout_pending_kyc}</div>
                <div className="text-lg">Queued: {data.payout_queued}</div>
                <div className="text-lg">Success: {data.payout_success}</div>
              </div>
            </div>
          )}
          {!loading && !data && <div>No data</div>}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

