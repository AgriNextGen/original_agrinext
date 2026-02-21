import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const roleRoutes: Record<string, string> = {
  farmer: "/farmer/dashboard",
  buyer: "/marketplace/dashboard",
  agent: "/agent/dashboard",
  logistics: "/logistics/dashboard",
  admin: "/admin/dashboard",
};

export default function CallbackHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session?.user) {
          navigate("/login");
          return;
        }

        const userId = session.user.id;
        // Check user_roles
        const { data: roleRow, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (roleErr) {
          console.error("role check error", roleErr);
        }

        if (!roleRow || !roleRow.role) {
          // No role — redirect to onboarding role select
          navigate("/onboard/role-select");
          return;
        }

        // Has role — go to appropriate dashboard
        navigate(roleRoutes[roleRow.role] || "/");
      } catch (err) {
        console.error("OAuth callback handling error", err);
        navigate("/login");
      }
    })();
  }, [navigate]);

  return null;
}

