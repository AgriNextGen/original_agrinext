import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useEffect, useState } from 'react';
import { rpcJson } from '@/lib/readApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Payouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const data = await rpcJson('admin.list_payout_jobs_v1', { p_limit: 200 });
        setPayouts(data || []);
      } catch (e) { console.error('list payouts', e); }
    })();
  }, []);

  async function markInitiated(id: string) {
    try {
      await rpcJson('admin.mark_payout_initiated_v1', { p_payout_job_id: id, p_reference_id: `manual:${Date.now()}` });
    } catch (e) { console.error(e); }
  }
  async function markSuccess(id: string) {
    try {
      await rpcJson('admin.mark_payout_success_v1', { p_payout_job_id: id, p_reference_id: `manual:${Date.now()}` });
    } catch (e) { console.error(e); }
  }
  async function markFailed(id: string) {
    try {
      await rpcJson('admin.mark_payout_failed_v1', { p_payout_job_id: id, p_error: 'manual failure' });
    } catch (e) { console.error(e); }
  }

  return (
    <DashboardLayout title="Payouts">
      <PageShell title="Payout Jobs" subtitle="Manage queued payouts">
        <div className="space-y-3">
          {payouts.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Order: {p.order_id}</div>
                  <div className="text-sm text-muted-foreground">Farmer: {p.farmer_id} • Amount: ₹{p.amount}</div>
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

