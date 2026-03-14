import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const RoleSelect = () => {
  const [role, setRole] = useState<string>("farmer");
  const navigate = useNavigate();

  const dashboardRoutes: Record<string, string> = {
    farmer: "/farmer/dashboard",
    buyer: "/marketplace/dashboard",
    agent: "/agent/dashboard",
    logistics: "/logistics/dashboard",
    vendor: "/vendor/dashboard",
  };

  const complete = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-role-onboard`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const j = await res.json();
    if (res.ok) {
      navigate(dashboardRoutes[role] || "/");
    } else {
      toast.error(j?.error?.message || "Failed to complete onboarding");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Choose your role</h2>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded mb-4">
        <option value="farmer">Farmer</option>
        <option value="agent">Agent</option>
        <option value="buyer">Buyer</option>
        <option value="logistics">Transporter</option>
        <option value="vendor">Vendor</option>
      </select>
      <Button onClick={complete}>Continue</Button>
    </div>
  );
};

export default RoleSelect;

