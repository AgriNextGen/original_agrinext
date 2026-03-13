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

export default function SystemHealthPage() {
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: async () => {
      const [snapRes, alertsRes] = await Promise.all([
        supabase.rpc("admin.system_health_snapshot_v1"),
        supabase.from("audit.alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
      ]);
      return { snapshot: snapRes.data, alerts: alertsRes.data ?? [] };
    },
  });
  const snapshot = data?.snapshot;
  const alerts = data?.alerts ?? [];

  return (
    <DashboardLayout title="System Health">
      <PageShell
        title="System Health"
        subtitle="Real-time platform health monitoring"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing..." : "Refresh"}
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
            <HealthKPI label="Login Success (1h)" value={snapshot?.login_success_count} />
            <HealthKPI label="Login Failures (1h)" value={snapshot?.login_failure_count} />
            <HealthKPI label="Webhook Failures (1h)" value={snapshot?.webhook_failure_count} />
            <HealthKPI label="Job Failures (1h)" value={snapshot?.job_failure_count} />
            <HealthKPI label="Dead Jobs (1h)" value={snapshot?.dead_jobs_count} />
            <HealthKPI label="Payout Queue" value={snapshot?.payout_queue_count} />
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-xl font-semibold mb-2">Open Alerts</h3>
          <div className="border rounded-lg bg-card">
            {alerts.length === 0 ? <div className="p-4 text-muted-foreground">No open alerts</div> :
              alerts.map(a => <AlertRow key={a.id} alert={a} onChange={() => refetch()} />)}
          </div>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

