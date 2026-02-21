import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function DevConsole() {
  const [actingSessionId, setActingSessionId] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState("");
  const [role, setRole] = useState("farmer");

  const createSession = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-create-acting-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acting_as_user_id: targetUser, acting_as_role: role, note: "dev console" }),
    });
    const j = await res.json();
    if (res.ok) {
      setActingSessionId(j.acting_session_id);
    } else {
      alert(j.error?.message || "Failed");
    }
  };

  const revokeSession = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.access_token || !actingSessionId) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dev-revoke-acting-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ acting_session_id: actingSessionId }),
    });
    const j = await res.json();
    if (res.ok) {
      setActingSessionId(null);
      alert("Revoked");
    } else {
      alert(j.error?.message || "Failed");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">Developer Console</h2>
      <div className="mb-3">
        <label className="block text-sm mb-1">Target user ID</label>
        <input value={targetUser} onChange={(e) => setTargetUser(e.target.value)} className="w-full p-2 border rounded" />
      </div>
      <div className="mb-3">
        <label className="block text-sm mb-1">Role to act as</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded">
          <option value="farmer">farmer</option>
          <option value="agent">agent</option>
          <option value="buyer">buyer</option>
          <option value="logistics">logistics</option>
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={createSession}>Create Acting Session</Button>
        <Button variant="outline" onClick={revokeSession} disabled={!actingSessionId}>Revoke</Button>
      </div>
      {actingSessionId && <div className="mt-4 p-2 bg-muted rounded">Acting session: {actingSessionId}</div>}
    </div>
  );
}

