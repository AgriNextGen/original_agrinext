import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleRow || roleRow.role !== "logistics") {
      return new Response(JSON.stringify({ error: "Forbidden: logistics role required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { transport_request_id, vehicle_id } = body;

    if (!transport_request_id) {
      return new Response(JSON.stringify({ error: "transport_request_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("accept_transport_load_v1", {
      p_transport_request_id: transport_request_id,
      p_vehicle_id: vehicle_id || null,
    });

    if (rpcError) {
      const msg = rpcError.message;
      if (msg.includes("ALREADY_ASSIGNED")) {
        return new Response(JSON.stringify({ error: "ALREADY_ASSIGNED: This load has already been accepted" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (msg.includes("not found")) {
        return new Response(JSON.stringify({ error: "Transport request not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw rpcError;
    }

    return new Response(JSON.stringify({ trip: { id: rpcResult?.trip_id }, new_status: rpcResult?.new_status ?? "assigned" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("accept-load error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
