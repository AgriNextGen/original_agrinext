import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const STATUS_TIMESTAMPS: Record<string, string> = {
  en_route: "en_route_at",
  arrived: "arrived_at",
  picked_up: "picked_up_at",
  in_transit: "in_transit_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};
// Allowed transitions: assigned->en_route|cancelled; en_route->arrived|cancelled; arrived->picked_up|cancelled;
// picked_up->in_transit|delivered|cancelled|issue; in_transit->delivered|cancelled|issue
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  assigned: ["en_route", "cancelled"],
  en_route: ["arrived", "cancelled"],
  arrived: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "delivered", "cancelled", "issue"],
  in_transit: ["delivered", "cancelled", "issue"],
  issue: ["in_transit", "delivered", "cancelled"],
};

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

    const body = await req.json().catch(() => ({}));
    const { trip_id, new_status, note, proof_url, metadata } = body;
    if (!trip_id || !new_status) {
      return new Response(JSON.stringify({ error: "trip_id and new_status required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc("update_trip_status_v1", {
      p_trip_id: trip_id,
      p_new_status: new_status,
      p_proof_url: proof_url || null,
      p_metadata: metadata || {},
    });

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(rpcResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("update-trip-status error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
