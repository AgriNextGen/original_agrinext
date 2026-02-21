import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useEffect, useState } from 'react';
import { rpcJson } from '@/lib/readApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Refunds() {
  const [refunds, setRefunds] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const data = await rpcJson('admin.list_refund_requests_v1', { p_limit: 200 });
        setRefunds(data || []);
      } catch (e) {
        console.error('list refunds', e);
      }
    })();
  }, []);

  async function approve(id: string) {
    try {
      await rpcJson('admin.approve_refund_v1', { p_refund_id: id });
      setRefunds((s) => s.filter((r) => r.id !== id));
    } catch (e) { console.error(e); }
  }

  async function reject(id: string) {
    try {
      await rpcJson('admin.reject_refund_v1', { p_refund_id: id, p_reason: 'Rejected by ops' });
      setRefunds((s) => s.filter((r) => r.id !== id));
    } catch (e) { console.error(e); }
  }

  return (
    <DashboardLayout title="Refunds">
      <PageShell title="Refund Requests" subtitle="Approve or reject refund requests">
        <div className="space-y-3">
          {refunds.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Order: {r.order_id}</div>
                  <div className="text-sm text-muted-foreground">Amount: ₹{r.amount} • Status: {r.status}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => approve(r.id)}>Approve</Button>
                  <Button variant="outline" onClick={() => reject(r.id)}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

