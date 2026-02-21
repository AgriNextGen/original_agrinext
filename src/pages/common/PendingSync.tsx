import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { offlineDB } from '@/offline/idb';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function PendingSync() {
  const [actions, setActions] = useState<any[]>([]);

  const load = async () => {
    const items = await offlineDB.actions.orderBy('createdAt').reverse().toArray();
    setActions(items);
  };

  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    await offlineDB.actions.update(id, { nextRunAt: Date.now(), status: 'queued' });
    load();
    // process will be triggered by network module when online
  };

  const remove = async (id: string) => {
    await offlineDB.actions.delete(id);
    load();
  };

  return (
    <DashboardLayout>
      <PageShell title="Pending Sync" subtitle="Queued actions and uploads">
        <div className="space-y-4">
          {actions.map(a => (
            <div key={a.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{a.name} — {a.type}</div>
                <div className="text-sm text-muted-foreground">Status: {a.status} • Retries: {a.retryCount}</div>
                {a.lastError && <div className="text-xs text-red-600">Error: {a.lastError}</div>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => retry(a.id)}>Retry</Button>
                <Button variant="destructive" onClick={() => remove(a.id)}>Remove</Button>
              </div>
            </div>
          ))}
          {actions.length === 0 && <div className="text-muted-foreground">No pending actions</div>}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

