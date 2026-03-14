import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HealthKPI } from "@/components/admin/HealthKPI";
import { AlertRow } from "@/components/admin/AlertRow";
import DashboardLayout from "@/layouts/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useLanguage } from '@/hooks/useLanguage';

export default function SystemHealthPage() {
  const { t } = useLanguage();
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: async () => {
      const [snapRes, alertsRes] = await Promise.all([
        (supabase as any).schema("admin").rpc("system_health_snapshot_v1"),
        (supabase as any).schema("audit").from("alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      ]);
      return { snapshot: snapRes.data, alerts: alertsRes.data ?? [] };
    },
  });
  const snapshot = data?.snapshot;
  const alerts = data?.alerts ?? [];

  return (
    <DashboardLayout title={t('admin.systemHealth.title')}>
      <PageShell
        title={t('admin.systemHealth.title')}
        subtitle={t('admin.systemHealth.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('admin.systemHealth.refreshing') : t('admin.systemHealth.refresh')}
          </Button>
        }
      >
        {loading && !snapshot ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <HealthKPI label={t('admin.systemHealth.loginSuccess')} value={snapshot?.login_success_count} />
            <HealthKPI label={t('admin.systemHealth.loginFailures')} value={snapshot?.login_failure_count} />
            <HealthKPI label={t('admin.systemHealth.webhookFailures')} value={snapshot?.webhook_failure_count} />
            <HealthKPI label={t('admin.systemHealth.jobFailures')} value={snapshot?.job_failure_count} />
            <HealthKPI label={t('admin.systemHealth.deadJobs')} value={snapshot?.dead_jobs_count} />
            <HealthKPI label={t('admin.systemHealth.payoutQueue')} value={snapshot?.payout_queue_count} />
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">{t('admin.systemHealth.openAlerts')}</h3>
          <div className="border rounded-lg bg-card">
            {alerts.length === 0 ? <div className="p-4 text-muted-foreground">{t('admin.systemHealth.noAlerts')}</div> :
              alerts.map(a => <AlertRow key={a.id} alert={a} onChange={() => refetch()} />)}
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

