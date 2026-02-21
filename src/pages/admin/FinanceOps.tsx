import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpsInbox } from '@/hooks/useOpsInbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const FINANCE_TABS = [
  { value: '', label: 'All' },
  { value: 'payment_mismatch', label: 'Payment mismatches' },
  { value: 'stale_payment', label: 'Stale payments' },
  { value: 'webhook_failed', label: 'Webhook failures' },
  { value: 'refund_pending_review', label: 'Refunds' },
  { value: 'payout_pending_kyc', label: 'Pending KYC' },
  { value: 'payout_eligible_queue', label: 'Queued payouts' },
  { value: 'payout_failed', label: 'Payout failed' },
  { value: 'high_risk_payment_activity', label: 'High risk' }
];

export default function FinanceOps() {
  const [activeTab, setActiveTab] = useState('');
  const filters = useMemo(() => (activeTab ? { item_type: activeTab } : {}), [activeTab]);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useOpsInbox(filters);
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <DashboardLayout title="Finance Ops">
      <PageShell title="Finance Ops" subtitle="Payments & KYC operational inbox">
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              {FINANCE_TABS.map((t) => (<TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>))}
            </TabsList>
          </Tabs>

          <div>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="py-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
            {!isLoading && items.map((it: any) => (
              <Card key={it.id} className="mb-2">
                <CardContent>
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm font-semibold">{it.item_type.replace(/_/g,' ')}</div>
                      <div className="text-xs text-muted-foreground">{it.summary}</div>
                    </div>
                    <div className="text-right text-xs">
                      <div>{it.entity_type}/{it.entity_id?.slice?.(0,8)}</div>
                      <div className="text-muted-foreground">{new Date(it.updated_at).toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hasNextPage && <div className="text-center"><Button variant="outline" onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Loading...' : 'Load more'}</Button></div>}
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

