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
    const { trip_id, new_status, note, proof_paths, issue_code, issue_notes, actual_weight_kg } = body;

    if (!trip_id || !new_status) {
      return new Response(JSON.stringify({ error: "trip_id and new_status required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: roleRow }, { data: trip, error: tripErr }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).single(),
      supabase.from("trips").select("id, transporter_id, status, transport_request_id").eq("id", trip_id).single(),
    ]);
    if (tripErr || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const isTransporter = trip.transporter_id === user.id;
    const isAdmin = roleRow?.role === "admin";
    if (!isTransporter && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: transporter or admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allowed = ALLOWED_TRANSITIONS[trip.status as string];
    if (!allowed || !allowed.includes(new_status)) {
      return new Response(
        JSON.stringify({ error: `Invalid transition from ${trip.status} to ${new_status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new_status === "picked_up" && !proof_paths?.length) {
      return new Response(
        JSON.stringify({ error: "Proof required for picked_up status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (new_status === "delivered" && !proof_paths?.length) {
      return new Response(
        JSON.stringify({ error: "Proof required for delivered status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: new_status, updated_at: now };

    if (new_status === "picked_up" && proof_paths?.length) {
      updates.pickup_proofs = proof_paths;
      updates.picked_up_at = now;
    } else if (new_status === "delivered" && proof_paths?.length) {
      updates.delivery_proofs = proof_paths;
      updates.delivered_at = now;
    } else if (STATUS_TIMESTAMPS[new_status]) {
      updates[STATUS_TIMESTAMPS[new_status]] = now;
    }

    if (actual_weight_kg != null) updates.actual_weight_kg = actual_weight_kg;
    if (issue_code) updates.issue_code = issue_code;
    if (issue_notes) updates.issue_notes = issue_notes;

    const { error: updateErr } = await supabase.from("trips").update(updates).eq("id", trip_id);
    if (updateErr) throw updateErr;

    await supabase.from("transport_status_events").insert({
      transport_request_id: trip.transport_request_id,
      trip_id,
      actor_id: user.id,
      actor_role: "transporter",
      old_status: trip.status,
      new_status,
      note: note || null,
    });

    if (new_status === "delivered") {
      await supabase.from("transport_requests").update({ status: "delivered", completed_at: now }).eq("id", trip.transport_request_id);
    } else if (new_status === "cancelled") {
      await supabase.from("transport_requests").update({ status: "cancelled" }).eq("id", trip.transport_request_id);
    } else if (new_status === "en_route") {
      await supabase.from("transport_requests").update({ status: "en_route" }).eq("id", trip.transport_request_id);
    } else if (new_status === "picked_up") {
      await supabase.from("transport_requests").update({ status: "picked_up" }).eq("id", trip.transport_request_id);
    }

    const NOTIFY_STATUSES = ["en_route", "picked_up", "delivered", "issue"];
    if (NOTIFY_STATUSES.includes(new_status)) {
      const { data: req } = await supabase.from("transport_requests").select("farmer_id").eq("id", trip.transport_request_id).single();
      if (req?.farmer_id) {
        const messages: Record<string, { title: string; message: string; type: string }> = {
          en_route: { title: "Transporter on the way", message: "Transporter is on the way to your pickup location.", type: "pickup" },
          picked_up: { title: "Produce picked up", message: "Your produce has been picked up.", type: "pickup" },
          delivered: { title: "Delivery completed", message: "Your delivery has been completed.", type: "pickup" },
          issue: { title: "Delivery issue reported", message: "An issue was reported with your delivery.", type: "info" },
        };
        const { title, message, type } = messages[new_status] || { title: "Trip update", message: `Trip status: ${new_status}`, type: "info" };
        await supabase.from("notifications").insert({
          user_id: req.farmer_id,
          title,
          message,
          is_read: false,
          type,
        });
      }
    }

    return new Response(JSON.stringify({ new_status }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("update-trip-status error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
