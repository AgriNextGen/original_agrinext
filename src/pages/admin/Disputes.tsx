import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import AssignModal from '@/components/admin/AssignModal';
import { rpcJson } from '@/lib/readApi';

const PAGE_SIZE = 20;

export default function DisputesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<{ open: boolean; disputeId: string | null }>({ open: false, disputeId: null });
  const { toast } = useToast();

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase.from('admin_users').select('id, user_id, name').order('name');
      if (error) throw error;
      setAdmins(data || []);
    } catch (e: any) {
      console.error('load admins err', e);
    }
  };

  const load = async (p = 0) => {
    setLoading(true);
    try {
      let query = supabase.from('disputes').select('*').order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      if (categoryFilter) query = query.eq('category', categoryFilter);
      if (entityFilter) query = query.eq('entity_type', entityFilter);
      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;
      setItems(data || []);
      setPage(p);
    } catch (e: any) {
      console.error('load disputes err', e);
      toast({ title: 'Failed to load disputes', description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdmins(); load(0); }, []);

  useEffect(() => { load(0); }, [statusFilter, categoryFilter, entityFilter]);

  const assign = async (id: string, adminUserId: string) => {
    if (!adminUserId) return;
    try {
      const { error } = await supabase.rpc('admin.assign_dispute_v1', { p_dispute_id: id, p_admin_id: adminUserId });
      if (error) throw error;
      toast({ title: 'Assigned' });
      load(page);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to assign', description: e?.message || String(e) });
    }
  };

  const resolve = async (id: string) => {
    const res = prompt('Enter resolution (refund,no_refund,partial_refund,replacement,payout_hold,warning,ban):', 'no_refund');
    if (!res) return;
    try {
      const { error } = await supabase.rpc('admin.set_dispute_status_v1', { p_dispute_id: id, p_status: 'resolved', p_resolution: res, p_note: null });
      if (error) throw error;
      toast({ title: 'Resolved' });
      load(page);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to resolve', description: e?.message || String(e) });
    }
  };

  return (
    <DashboardLayout>
      <PageShell title="Disputes" subtitle="Manage disputes and hold payouts">
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
            <Button onClick={() => load(0)}>Refresh</Button>
          </div>

          {loading && <div>Loading...</div>}
          {!loading && items.length === 0 && <Card><CardContent>No disputes found</CardContent></Card>}
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
                    <Button size="sm" variant="outline" onClick={() => setAssignModal({ open: true, disputeId: d.id })}>Assign</Button>
                    <Button size="sm" variant="default" onClick={() => resolve(d.id)}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(d.id)}>Copy ID</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div />
            <div className="flex gap-2">
              <Button disabled={page === 0} onClick={() => load(page - 1)}>Previous</Button>
              <Button onClick={() => load(page + 1)}>Next</Button>
            </div>
          </div>
        </div>
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

