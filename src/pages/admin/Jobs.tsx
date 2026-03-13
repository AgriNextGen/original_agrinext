import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import KpiCard from '@/components/dashboard/KpiCard';
import EmptyState from '@/components/shared/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Inbox, Clock, Play, AlertTriangle, Skull } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminJobsSummary, useRetryJob } from '@/hooks/useAdminJobs';

export default function AdminJobs() {
  const { t } = useLanguage();
  const { data, isLoading } = useAdminJobsSummary();
  const retryJob = useRetryJob();
  const summary = data?.summary ?? {};
  const jobs: any[] = data?.jobs ?? [];

  if (isLoading) {
    return (
      <DashboardLayout title={t('admin.jobs.title')}>
        <PageShell title={t('admin.jobs.title')} subtitle={t('admin.jobs.subtitle')}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </PageShell>
      </DashboardLayout>
    );
  }

  const handleRetry = (jobType: string, payload: any) => {
    retryJob.mutate({ jobType, payload }, {
      onSuccess: () => toast.success(t('admin.jobs.retryEnqueued')),
      onError: () => toast.error(t('admin.jobs.retryFailed')),
    });
  };

  return (
    <DashboardLayout title={t('admin.jobs.title')}>
      <PageShell title={t('admin.jobs.title')} subtitle={t('admin.jobs.subtitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label={t('admin.jobs.queued')} value={summary?.queued || 0} icon={Clock} priority="info" />
            <KpiCard label={t('admin.jobs.running')} value={summary?.running || 0} icon={Play} priority="primary" />
            <KpiCard label={t('admin.jobs.failed')} value={summary?.failed || 0} icon={AlertTriangle} priority="warning" />
            <KpiCard label={t('admin.jobs.dead')} value={summary?.dead || 0} icon={Skull} priority="neutral" />
          </div>

          {jobs.length === 0 ? (
            <EmptyState icon={Inbox} title={t('admin.jobs.noJobs')} description={t('admin.jobs.queueEmpty')} />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.jobs.id')}</TableHead>
                      <TableHead>{t('admin.jobs.type')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>{t('admin.jobs.attempts')}</TableHead>
                      <TableHead>{t('admin.jobs.runAt')}</TableHead>
                      <TableHead>{t('admin.jobs.priority')}</TableHead>
                      <TableHead>{t('admin.jobs.error')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j: any) => (
                      <TableRow key={j.id}>
                        <TableCell className="text-xs font-mono">{j.id}</TableCell>
                        <TableCell>{j.job_type}</TableCell>
                        <TableCell>{j.status}</TableCell>
                        <TableCell>{j.attempts}/{j.max_attempts}</TableCell>
                        <TableCell>{new Date(j.run_at).toLocaleString()}</TableCell>
                        <TableCell>{j.priority}</TableCell>
                        <TableCell><pre className="text-xs max-w-[200px] truncate">{j.last_error}</pre></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleRetry(j.job_type, j.payload)}>
                            {t('admin.jobs.retry')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
