import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HealthKPI } from "@/components/admin/HealthKPI";
import { AlertRow } from "@/components/admin/AlertRow";

export default function SystemHealthPage() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.rpc("admin.system_health_snapshot_v1");
      setSnapshot(data);
      const { data: a } = await supabase.from("audit.alerts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50);
      setAlerts(a || []);
    } catch (e) {
      console.error("system health load", e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Health</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <HealthKPI label="Login Success (1h)" value={snapshot?.login_success_count} />
        <HealthKPI label="Login Failures (1h)" value={snapshot?.login_failure_count} />
        <HealthKPI label="Webhook Failures (1h)" value={snapshot?.webhook_failure_count} />
        <HealthKPI label="Job Failures (1h)" value={snapshot?.job_failure_count} />
        <HealthKPI label="Dead Jobs (1h)" value={snapshot?.dead_jobs_count} />
        <HealthKPI label="Payout Queue" value={snapshot?.payout_queue_count} />
      </div>

      <div className="mb-4">
        <h3 className="text-xl font-semibold">Open Alerts</h3>
        <div className="border rounded bg-white">
          {alerts.length === 0 ? <div className="p-4 text-gray-500">No open alerts</div> :
            alerts.map(a => <AlertRow key={a.id} alert={a} onChange={load} />)}
        </div>
      </div>

      <div>
        <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
      </div>
    </div>
  );
}

