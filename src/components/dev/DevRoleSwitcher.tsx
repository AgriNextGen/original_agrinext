import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const roles = ["farmer", "agent", "logistics", "buyer", "admin"];

export default function DevRoleSwitcher() {
  const { user, realRole, activeRole, isDevOverride, devExpiresAt, switchActiveRole } = useAuth();
  const [selection, setSelection] = useState<string>(activeRole ?? realRole ?? "");

  if (import.meta.env.MODE === "production") return null;
  if (import.meta.env.VITE_DEV_TOOLS_ENABLED !== "true") return null;
  if (!user) return null;

  const handleSwitch = async () => {
    const role = selection === "" ? null : selection;
    await switchActiveRole(role);
  };

  const handleReset = async () => {
    await switchActiveRole(null);
    setSelection(realRole ?? "");
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-muted-foreground">
        DEV: <span className="font-medium capitalize">{selection || "none"}</span>
      </div>
      <select
        value={selection}
        onChange={(e) => setSelection(e.target.value)}
        className="rounded-md px-2 py-1 text-sm bg-card border border-border"
      >
        <option value="">-- real --</option>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button onClick={handleSwitch} className="px-2 py-1 rounded-md bg-primary text-white text-sm">
        Switch
      </button>
      <button onClick={handleReset} className="px-2 py-1 rounded-md bg-neutral-100 text-sm">
        Reset
      </button>
      {isDevOverride && devExpiresAt && <div className="text-xs text-muted-foreground">Expires {new Date(devExpiresAt).toLocaleTimeString()}</div>}
    </div>
  );
}

