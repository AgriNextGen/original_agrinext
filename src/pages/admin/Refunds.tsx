import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rpcJson } from '@/lib/readApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Refunds() {
  const queryClient = useQueryClient();
  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ['admin', 'refunds'],
    queryFn: () => rpcJson('admin.list_refund_requests_v1', { p_limit: 200 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });

  async function approve(id: string) {
    try {
      await rpcJson('admin.approve_refund_v1', { p_refund_id: id });
      invalidate();
    } catch (e) { if (import.meta.env.DEV) console.error(e); }
  }

  async function reject(id: string) {
    try {
      await rpcJson('admin.reject_refund_v1', { p_refund_id: id, p_reason: 'Rejected by ops' });
      invalidate();
    } catch (e) { if (import.meta.env.DEV) console.error(e); }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Refunds">
        <PageShell title="Refund Requests" subtitle="Approve or reject refund requests">
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </PageShell>
      </DashboardLayout>
    );
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

