import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import AssignModal from '@/components/admin/AssignModal';

const PAGE_SIZE = 20;

export default function DisputesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [assignModal, setAssignModal] = useState<{ open: boolean; disputeId: string | null }>({ open: false, disputeId: null });
  const { toast } = useToast();

  const { data: admins = [] } = useQuery({
    queryKey: ['admin', 'admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_users').select('id, user_id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ['admin', 'disputes', statusFilter, categoryFilter, entityFilter, page],
    queryFn: async () => {
      let query = supabase.from('disputes').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      if (categoryFilter) query = query.eq('category', categoryFilter);
      if (entityFilter) query = query.eq('entity_type', entityFilter);
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidateDisputes = () => queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });

  const assign = async (id: string, adminUserId: string) => {
    if (!adminUserId) return;
    try {
      const { error } = await (supabase as any).schema('admin').rpc('assign_dispute_v1', { p_dispute_id: id, p_admin_id: adminUserId });
      if (error) throw error;
      toast({ title: t('admin.disputes.assigned') });
      invalidateDisputes();
    } catch (e: any) {
      if (import.meta.env.DEV) console.error(e);
      toast({ title: t('admin.disputes.failedAssign'), description: e?.message || String(e) });
    }
  };

  const resolve = async (id: string) => {
    const res = prompt('Enter resolution (refund,no_refund,partial_refund,replacement,payout_hold,warning,ban):', 'no_refund');
    if (!res) return;
    try {
      const { error } = await (supabase as any).schema('admin').rpc('set_dispute_status_v1', { p_dispute_id: id, p_status: 'resolved', p_resolution: res, p_note: null });
      if (error) throw error;
      toast({ title: t('admin.disputes.resolved') });
      invalidateDisputes();
    } catch (e: any) {
      if (import.meta.env.DEV) console.error(e);
      toast({ title: t('admin.disputes.failedResolve'), description: e?.message || String(e) });
    }
  };

  return (
    <DashboardLayout>
      <PageShell title={t('admin.disputes.title')} subtitle={t('admin.disputes.subtitle')}>
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <select className="border p-2 rounded" value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value || null)}>
              <option value=''>All statuses</option>
              <option value='open'>open</option>
              <option value='under_review'>under_review</option>
              <option value='resolved'>resolved</option>
              <option value='rejected'>rejected</option>
              <option value='closed'>closed</option>
            </select>
            <select className="border p-2 rounded" value={categoryFilter ?? ''} onChange={(e) => setCategoryFilter(e.target.value || null)}>
              <option value=''>All categories</option>
              <option value='quality'>quality</option>
              <option value='delivery'>delivery</option>
              <option value='fraud'>fraud</option>
              <option value='refund'>refund</option>
              <option value='payout'>payout</option>
              <option value='behavior'>behavior</option>
              <option value='other'>other</option>
            </select>
            <select className="border p-2 rounded" value={entityFilter ?? ''} onChange={(e) => setEntityFilter(e.target.value || null)}>
              <option value=''>All entities</option>
              <option value='order'>order</option>
              <option value='trip'>trip</option>
              <option value='payment'>payment</option>
            </select>
            <div className="flex-1" />
            <Button onClick={() => invalidateDisputes()}>{t('admin.systemHealth.refresh')}</Button>
          </div>

          <DataState loading={loading} empty={!loading && items.length === 0} emptyTitle={t('admin.disputes.noDisputes')} emptyMessage={t('admin.disputes.noDisputes')}>
          <div className="grid gap-3">
            {items.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.category}</span>
                      <Badge className="text-xs">{d.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 text-sm text-muted-foreground">Entity: {d.entity_type} {d.entity_id}</div>
                  <div className="mb-3">{d.description}</div>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="outline" onClick={() => setAssignModal({ open: true, disputeId: d.id })}>{t('admin.disputes.assign')}</Button>
                    <Button size="sm" variant="default" onClick={() => resolve(d.id)}>{t('admin.disputes.resolve')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(d.id)}>Copy ID</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div />
            <div className="flex gap-2">
              <Button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
          </DataState>
        </div>

        <AssignModal
          open={assignModal.open}
          disputeId={assignModal.disputeId}
          onClose={() => setAssignModal({ open: false, disputeId: null })}
          onAssigned={invalidateDisputes}
        />
      </PageShell>
    </DashboardLayout>
  );
}
// Assign modal usage
export function DisputesPageWithAssignWrapper() {
  const [modalState, setModalState] = useState({ open: false, disputeId: null as string | null });
  return <>
    <AssignModal open={modalState.open} disputeId={modalState.disputeId} onClose={() => setModalState({ open: false, disputeId: null })} onAssigned={() => { window.location.reload(); }} />
  </>;
}

