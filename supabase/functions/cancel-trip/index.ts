// supabase/functions/cancel-trip/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ success:false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ success:false, error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { trip_id, reason } = body;
    if (!trip_id || !reason) return new Response(JSON.stringify({ success:false, error: "trip_id and reason required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data, error } = await supabase.rpc("cancel_trip_v1", {
      p_trip_id: trip_id,
      p_reason: reason
    });

    if (error) return new Response(JSON.stringify({ success:false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ success: true, request_id: data?.request_id || null }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("cancel-trip error:", err);
    return new Response(JSON.stringify({ success:false, error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

