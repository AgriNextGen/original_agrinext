import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { useEffect, useState } from 'react';

export default function AdminJobs() {
  const [summary, setSummary] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.netlify/functions/admin-jobs-summary', { credentials: 'include' });
        const json = await res.json();
        setSummary(json.summary || {});
        setJobs(json.jobs || []);
      } catch (e) {
        console.error('fetch jobs summary', e);
      }
    })();
  }, []);

  return (
    <DashboardLayout title="Jobs">
      <PageShell title="Jobs" subtitle="Background job queue">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded">
              <div className="text-xs text-muted-foreground">Queued</div>
              <div className="text-xl font-semibold">{summary?.queued || 0}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-xs text-muted-foreground">Running</div>
              <div className="text-xl font-semibold">{summary?.running || 0}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-xl font-semibold">{summary?.failed || 0}</div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-xs text-muted-foreground">Dead</div>
              <div className="text-xl font-semibold">{summary?.dead || 0}</div>
            </div>
          </div>

          <div>
            <table className="w-full">
              <thead>
                <tr>
                  <th>ID</th><th>Type</th><th>Status</th><th>Attempts</th><th>Run At</th><th>Priority</th><th>Error</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id}>
                    <td className="text-xs">{j.id}</td>
                    <td>{j.job_type}</td>
                    <td>{j.status}</td>
                    <td>{j.attempts}/{j.max_attempts}</td>
                    <td>{new Date(j.run_at).toLocaleString()}</td>
                    <td>{j.priority}</td>
                    <td><pre className="text-xs">{j.last_error}</pre></td>
                    <td>
                      <button className="px-2 py-1 border rounded" onClick={async () => {
                        try {
                          await fetch('/.netlify/functions/admin-enqueue', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ job_type: j.job_type, payload: j.payload })
                          });
                          alert('retry enqueued');
                        } catch (e) {
                          alert('failed to enqueue');
                        }
                      }}>Retry</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

