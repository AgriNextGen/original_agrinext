import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const RoleSelect = () => {
  const [role, setRole] = useState<string>("farmer");
  const navigate = useNavigate();

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
      // redirect to dashboard
      navigate(role === "farmer" ? "/farmer/dashboard" : role === "buyer" ? "/marketplace/dashboard" : role === "agent" ? "/agent/dashboard" : "/");
    } else {
      alert(j.error?.message || "Failed to complete onboarding");
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
      </select>
      <Button onClick={complete}>Continue</Button>
    </div>
  );
};

export default RoleSelect;

