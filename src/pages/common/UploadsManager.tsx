import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { offlineDB } from '@/offline/idb';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function UploadsManager() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const list = await offlineDB.uploads.orderBy('createdAt').reverse().toArray();
    setItems(list);
  };

  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    await offlineDB.uploads.update(id, { nextRunAt: Date.now(), status: 'queued' });
    load();
  };

  const remove = async (id: string) => {
    await offlineDB.uploads.delete(id);
    load();
  };

  return (
    <DashboardLayout>
      <PageShell title="Uploads Manager" subtitle="Queued uploads">
        <div className="space-y-4">
          {items.map(u => (
            <div key={u.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{u.fileName} ({Math.round((u.size||0)/1024)} KB)</div>
                <div className="text-sm text-muted-foreground">Status: {u.status} • Retries: {u.retryCount}</div>
                {u.lastError && <div className="text-xs text-red-600">Error: {u.lastError}</div>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => retry(u.id)}>Retry</Button>
                <Button variant="destructive" onClick={() => remove(u.id)}>Remove</Button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-muted-foreground">No queued uploads</div>}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

