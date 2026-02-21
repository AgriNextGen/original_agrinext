import React from "react";
import { supabase } from "@/integrations/supabase/client";

export const AlertRow: React.FC<{ alert: any; onChange?: () => void }> = ({ alert, onChange }) => {
  const ack = async () => {
    await supabase.rpc("admin.alerts_ack_v1", { p_alert_id: alert.id, p_ack_by: null }).catch(() => {});
    onChange?.();
  };
  const resolve = async () => {
    await supabase.rpc("admin.alerts_resolve_v1", { p_alert_id: alert.id }).catch(() => {});
    onChange?.();
  };

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div>
        <div className="font-medium">{alert.rule_name}</div>
        <div className="text-sm text-gray-600">{alert.metadata?.metric ? `${alert.metadata.metric} = ${alert.metadata.value}` : JSON.stringify(alert.metadata)}</div>
        <div className="text-xs text-gray-400">Severity: {alert.severity} · Created: {new Date(alert.created_at).toLocaleString()}</div>
      </div>
      <div className="flex gap-2">
        <button className="px-2 py-1 bg-yellow-500 text-white rounded" onClick={ack}>Acknowledge</button>
        <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={resolve}>Resolve</button>
      </div>
    </div>
  );
};

