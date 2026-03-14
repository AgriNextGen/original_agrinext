import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';

export default function Payouts() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: () => rpcJson('admin.list_payout_jobs_v1', { p_limit: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });

  async function markInitiated(id: string) {
    try {
      await rpcJson('admin.mark_payout_initiated_v1', { p_payout_job_id: id, p_reference_id: `manual:${Date.now()}` });
      invalidate();
    } catch (e) { if (import.meta.env.DEV) console.error(e); }
  }
  async function markSuccess(id: string) {
    try {
      await rpcJson('admin.mark_payout_success_v1', { p_payout_job_id: id, p_reference_id: `manual:${Date.now()}` });
      invalidate();
    } catch (e) { if (import.meta.env.DEV) console.error(e); }
  }
  async function markFailed(id: string) {
    try {
      await rpcJson('admin.mark_payout_failed_v1', { p_payout_job_id: id, p_error: 'manual failure' });
      invalidate();
    } catch (e) { if (import.meta.env.DEV) console.error(e); }
  }

  if (isLoading) {
    return (
      <DashboardLayout title={t('admin.payouts.title')}>
        <PageShell title={t('admin.payouts.title')} subtitle={t('admin.payouts.subtitle')}>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('admin.payouts.title')}>
      <PageShell title={t('admin.payouts.title')} subtitle={t('admin.payouts.subtitle')}>
        <div className="space-y-3">
          {payouts.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t('admin.refunds.order')}: {p.order_id}</div>
                  <div className="text-sm text-muted-foreground">{t('admin.payouts.farmer')}: {p.farmer_id} • {t('admin.payouts.amount')}: ₹{p.amount}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => markInitiated(p.id)}>Mark Initiated</Button>
                  <Button onClick={() => markSuccess(p.id)}>Mark Success</Button>
                  <Button variant="outline" onClick={() => markFailed(p.id)}>Mark Failed</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

