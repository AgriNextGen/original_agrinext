/**
 * @function logistics-orchestrator
 * @description Internal-only Edge Function for the unified logistics domain.
 *   Provides REST endpoints for shipment requests, load pools, unified trips,
 *   bookings, reverse load candidates, and route cluster detection.
 *
 * @auth Internal only — requires either:
 *   - x-worker-secret header matching WORKER_SECRET env var, OR
 *   - Valid JWT from an admin user
 *
 * @routes
 *   POST   /shipments                              — Create shipment request
 *   GET    /shipments/:id                           — Get shipment with items and bookings
 *   POST   /shipments/:id/items                     — Add items to an existing shipment
 *   POST   /load-pools                              — Create load pool
 *   POST   /load-pools/:id/add                      — Add shipment to pool
 *   POST   /trips                                   — Create unified trip
 *   GET    /trips/:id                               — Get unified trip with legs and bookings
 *   POST   /bookings                                — Book shipment to trip
 *   GET    /reverse-candidates/:id                  — Find reverse load candidates for a trip
 *   POST   /route-clusters/detect                   — Detect or create route cluster
 *   GET    /internal/logistics/load-pools            — Admin: list load pools with stats
 *   GET    /internal/logistics/trips                 — Admin: list unified trips with stats
 *   GET    /internal/logistics/matching-events       — Admin: recent matching events
 *   POST   /internal/logistics/run-matching          — Admin: trigger a matching cycle
 *   GET    /internal/logistics/dashboard             — Admin: orchestration dashboard summary
 *   GET    /internal/reverse-loads                   — Admin: list reverse load candidates
 *   POST   /internal/reverse-loads/:id/offer         — Admin: offer candidate to transporter
 *   POST   /internal/reverse-loads/:id/accept        — Admin: accept and book reverse load
 *   POST   /internal/reverse-loads/:id/decline       — Admin: decline candidate
 *   GET    /internal/reverse-loads/opportunities     — Transport: available reverse loads
 *   POST   /internal/reverse-loads/scan              — Admin: trigger reverse logistics scan
 *   POST   /internal/reverse-loads/expire            — Admin: expire stale candidates
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/errors.ts";
import { getRequestIdFromHeaders, logStructured } from "../_shared/request_context.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKER_SECRET = Deno.env.get("WORKER_SECRET") ?? "";

const headers = { ...corsHeaders, "Content-Type": "application/json" };

function jsonOk(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status, headers });
}

function isAuthorized(req: Request): boolean {
  const secret = req.headers.get("x-worker-secret");
  if (secret && WORKER_SECRET && secret === WORKER_SECRET) return true;
  return false;
}

async function isAdminJwt(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data: { user }, error } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return false;

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    return role?.role === "admin";
  } catch {
    return false;
  }
}

function parsePathSegments(url: URL): string[] {
  const path = url.pathname
    .replace(/^\/functions\/v1\/logistics-orchestrator\/?/, "")
    .replace(/^\//, "")
    .replace(/\/$/, "");
  return path.split("/").filter(Boolean);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = getRequestIdFromHeaders(req.headers);

  if (!isAuthorized(req) && !(await isAdminJwt(req))) {
    return errorResponse("UNAUTHORIZED", "Internal endpoint: requires x-worker-secret or admin JWT", 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);
  const segments = parsePathSegments(url);

  try {
    // POST /shipments
    if (req.method === "POST" && segments[0] === "shipments" && segments.length === 1) {
      const body = await req.json();
      logStructured({ event: "create_shipment", request_id: reqId });

      const { data, error } = await admin.rpc("create_shipment_request_v1", { p_params: body });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // GET /shipments/:id
    if (req.method === "GET" && segments[0] === "shipments" && segments.length === 2) {
      const shipmentId = segments[1];

      const { data, error } = await admin.rpc("get_shipment_detail_v1", {
        p_shipment_id: shipmentId,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("SHIPMENT_NOT_FOUND")) return errorResponse("NOT_FOUND", "Shipment not found", 404);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data);
    }

    // POST /shipments/:id/items
    if (req.method === "POST" && segments[0] === "shipments" && segments.length === 3 && segments[2] === "items") {
      const shipmentId = segments[1];
      const body = await req.json();
      logStructured({ event: "add_shipment_items", shipment_id: shipmentId, request_id: reqId });

      const itemsArray = Array.isArray(body) ? body : [body];
      const { data, error } = await admin.rpc("add_shipment_items_v1", {
        p_shipment_id: shipmentId,
        p_items: itemsArray,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("SHIPMENT_NOT_FOUND")) return errorResponse("NOT_FOUND", "Shipment not found", 404);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data, 201);
    }

    // POST /load-pools
    if (req.method === "POST" && segments[0] === "load-pools" && segments.length === 1) {
      const body = await req.json();
      logStructured({ event: "create_load_pool", request_id: reqId });

      const { data, error } = await admin.rpc("create_load_pool_v1", {
        p_route_cluster_id: body.route_cluster_id,
        p_capacity_target_kg: body.capacity_target_kg,
        p_dispatch_window: body.dispatch_window ?? null,
      });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // POST /load-pools/:id/add
    if (req.method === "POST" && segments[0] === "load-pools" && segments.length === 3 && segments[2] === "add") {
      const body = await req.json();
      logStructured({ event: "add_to_pool", pool_id: segments[1], request_id: reqId });

      const { data, error } = await admin.rpc("add_shipment_to_pool_v1", {
        p_shipment_request_id: body.shipment_request_id,
        p_load_pool_id: segments[1],
      });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // POST /trips
    if (req.method === "POST" && segments[0] === "trips" && segments.length === 1) {
      const body = await req.json();
      logStructured({ event: "create_unified_trip", request_id: reqId });

      const { data, error } = await admin.rpc("create_unified_trip_v1", { p_params: body });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // GET /trips/:id
    if (req.method === "GET" && segments[0] === "trips" && segments.length === 2) {
      const tripId = segments[1];
      logStructured({ event: "get_unified_trip", trip_id: tripId, request_id: reqId });

      const { data, error } = await admin.rpc("get_unified_trip_detail_v1", {
        p_trip_id: tripId,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("TRIP_NOT_FOUND")) return errorResponse("NOT_FOUND", "Trip not found", 404);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data);
    }

    // POST /bookings
    if (req.method === "POST" && segments[0] === "bookings" && segments.length === 1) {
      const body = await req.json();
      logStructured({ event: "book_shipment", request_id: reqId });

      const { data, error } = await admin.rpc("book_shipment_to_trip_v1", {
        p_shipment_request_id: body.shipment_request_id,
        p_unified_trip_id: body.unified_trip_id,
      });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // GET /reverse-candidates/:tripId
    if (req.method === "GET" && segments[0] === "reverse-candidates" && segments.length === 2) {
      const tripId = segments[1];
      logStructured({ event: "find_reverse_candidates", trip_id: tripId, request_id: reqId });

      const { data, error } = await admin.rpc("find_reverse_load_candidates_v1", {
        p_unified_trip_id: tripId,
      });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // POST /route-clusters/detect
    if (req.method === "POST" && segments[0] === "route-clusters" && segments[1] === "detect") {
      const body = await req.json();
      logStructured({ event: "detect_route_cluster", request_id: reqId });

      const { data, error } = await admin.rpc("detect_route_cluster_v1", {
        p_origin_district_id: body.origin_district_id,
        p_dest_district_id: body.dest_district_id,
      });
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // ================================================================
    // Phase 2: Admin Monitoring & Orchestration Routes
    // All /internal/* routes require admin JWT (already validated above)
    // ================================================================

    // GET /internal/logistics/load-pools — list load pools with stats
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "load-pools") {
      logStructured({ event: "admin_list_load_pools", request_id: reqId });

      const statusFilter = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("load_pools")
        .select("id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, dispatch_window_start, dispatch_window_end, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) return errorResponse("QUERY_ERROR", error.message, 400);
      return jsonOk({ load_pools: data ?? [], count: (data ?? []).length });
    }

    // GET /internal/logistics/trips — list unified trips with stats
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "trips") {
      logStructured({ event: "admin_list_trips", request_id: reqId });

      const statusFilter = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("unified_trips")
        .select("id, vehicle_id, driver_id, transporter_id, trip_status, trip_direction, start_location, end_location, capacity_total_kg, capacity_used_kg, planned_start_at, actual_start_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter) {
        query = query.eq("trip_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) return errorResponse("QUERY_ERROR", error.message, 400);
      return jsonOk({ trips: data ?? [], count: (data ?? []).length });
    }

    // GET /internal/logistics/matching-events — recent matching events
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "matching-events") {
      logStructured({ event: "admin_list_matching_events", request_id: reqId });

      const eventType = url.searchParams.get("event_type");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("logistics_events")
        .select("id, event_type, entity_type, entity_id, payload, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (eventType) {
        query = query.eq("event_type", eventType);
      }

      const { data, error } = await query;
      if (error) return errorResponse("QUERY_ERROR", error.message, 400);
      return jsonOk({ events: data ?? [], count: (data ?? []).length });
    }

    // POST /internal/logistics/run-matching — trigger a full matching cycle
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "run-matching") {
      logStructured({ event: "admin_trigger_matching", request_id: reqId });

      const { data, error } = await admin.rpc("run_matching_cycle_v1");
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // GET /internal/logistics/dashboard — orchestration dashboard summary
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "dashboard") {
      logStructured({ event: "admin_orchestration_dashboard", request_id: reqId });

      const { data, error } = await admin.rpc("get_orchestration_dashboard_v1");
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // ================================================================
    // Phase 3: Reverse Logistics Routes
    // ================================================================

    // POST /internal/reverse-loads/scan — trigger reverse logistics scan
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments[2] === "scan" && segments.length === 3) {
      logStructured({ event: "admin_reverse_scan", request_id: reqId });

      const { data, error } = await admin.rpc("scan_reverse_opportunities_v1");
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // POST /internal/reverse-loads/expire — expire stale candidates
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments[2] === "expire" && segments.length === 3) {
      logStructured({ event: "admin_reverse_expire", request_id: reqId });

      const { data, error } = await admin.rpc("expire_reverse_candidates_v1");
      if (error) return errorResponse("RPC_ERROR", error.message, 400);
      return jsonOk(data);
    }

    // GET /internal/reverse-loads/opportunities — transport partner view
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments[2] === "opportunities" && segments.length === 3) {
      logStructured({ event: "transport_reverse_opportunities", request_id: reqId });

      const statusFilter = url.searchParams.get("status");
      const routeCluster = url.searchParams.get("route_cluster_id");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("reverse_load_candidates")
        .select("id, unified_trip_id, route_cluster_id, origin_district_id, dest_district_id, available_capacity_kg, available_capacity_cbm, candidate_score, status, shipment_request_id, expires_at, created_at, updated_at")
        .in("status", statusFilter ? [statusFilter] : ["identified", "offered"])
        .order("candidate_score", { ascending: false })
        .limit(limit);

      if (routeCluster) {
        query = query.eq("route_cluster_id", routeCluster);
      }

      const { data, error } = await query;
      if (error) return errorResponse("QUERY_ERROR", error.message, 400);
      return jsonOk({ opportunities: data ?? [], count: (data ?? []).length });
    }

    // POST /internal/reverse-loads/:id/offer — offer candidate to transporter
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments.length === 4 && segments[3] === "offer") {
      const candidateId = segments[2];
      logStructured({ event: "admin_reverse_offer", candidate_id: candidateId, request_id: reqId });

      const { data, error } = await admin.rpc("offer_reverse_candidate_v1", {
        p_candidate_id: candidateId,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("CANDIDATE_NOT_FOUND")) return errorResponse("NOT_FOUND", "Candidate not found", 404);
        if (msg.includes("CANDIDATE_EXPIRED")) return errorResponse("EXPIRED", "Candidate has expired", 410);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data);
    }

    // POST /internal/reverse-loads/:id/accept — accept and book reverse load
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments.length === 4 && segments[3] === "accept") {
      const candidateId = segments[2];
      logStructured({ event: "admin_reverse_accept", candidate_id: candidateId, request_id: reqId });

      const { data, error } = await admin.rpc("accept_reverse_candidate_v1", {
        p_candidate_id: candidateId,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("CANDIDATE_NOT_FOUND")) return errorResponse("NOT_FOUND", "Candidate not found", 404);
        if (msg.includes("CANDIDATE_EXPIRED")) return errorResponse("EXPIRED", "Candidate has expired", 410);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data);
    }

    // POST /internal/reverse-loads/:id/decline — decline candidate
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments.length === 4 && segments[3] === "decline") {
      const candidateId = segments[2];
      logStructured({ event: "admin_reverse_decline", candidate_id: candidateId, request_id: reqId });

      const { data, error } = await admin.rpc("decline_reverse_candidate_v1", {
        p_candidate_id: candidateId,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("CANDIDATE_NOT_FOUND")) return errorResponse("NOT_FOUND", "Candidate not found", 404);
        return errorResponse("RPC_ERROR", msg, 400);
      }
      return jsonOk(data);
    }

    // GET /internal/reverse-loads — list reverse load candidates
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "reverse-loads" && segments.length === 2) {
      logStructured({ event: "admin_list_reverse_loads", request_id: reqId });

      const statusFilter = url.searchParams.get("status");
      const routeCluster = url.searchParams.get("route_cluster_id");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("reverse_load_candidates")
        .select("id, unified_trip_id, route_cluster_id, origin_district_id, dest_district_id, available_capacity_kg, available_capacity_cbm, candidate_score, status, shipment_request_id, expires_at, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      if (routeCluster) {
        query = query.eq("route_cluster_id", routeCluster);
      }

      const { data, error } = await query;
      if (error) return errorResponse("QUERY_ERROR", error.message, 400);
      return jsonOk({ reverse_loads: data ?? [], count: (data ?? []).length });
    }

    // ================================================================
    // Phase 6: Vehicle Recommendation Routes
    // ================================================================

    // GET /internal/logistics/recommend-vehicles/:poolId
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommend-vehicles" && segments.length === 4) {
      const poolId = segments[3];
      logStructured({ event: "recommend_vehicles_for_pool", pool_id: poolId, request_id: reqId });

      const { data: pool, error: poolErr } = await admin
        .from("load_pools")
        .select("id, total_weight_kg, total_volume_cbm, origin_district_id, dest_district_id, route_cluster_id, status")
        .eq("id", poolId)
        .maybeSingle();

      if (poolErr || !pool) {
        return errorResponse("NOT_FOUND", "Load pool not found", 404);
      }

      const vehicles = await admin
        .from("vehicles")
        .select("id, transporter_id, vehicle_type, capacity_kg, registration_number")
        .gte("capacity_kg", (pool as Record<string, unknown>).total_weight_kg as number)
        .order("capacity_kg", { ascending: true })
        .limit(20);

      if (vehicles.error) return errorResponse("QUERY_ERROR", vehicles.error.message, 400);

      const existing = await admin
        .from("vehicle_recommendations")
        .select("*")
        .eq("load_pool_id", poolId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("recommendation_score", { ascending: false });

      return jsonOk({
        pool,
        recommendations: existing.data ?? [],
        available_vehicles: vehicles.data ?? [],
      });
    }

    // GET /internal/logistics/recommend-loads/:vehicleId
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommend-loads" && segments.length === 4) {
      const vehicleId = segments[3];
      logStructured({ event: "recommend_loads_for_vehicle", vehicle_id: vehicleId, request_id: reqId });

      const { data: vehicle, error: vehErr } = await admin
        .from("vehicles")
        .select("id, transporter_id, capacity_kg, vehicle_type")
        .eq("id", vehicleId)
        .maybeSingle();

      if (vehErr || !vehicle) {
        return errorResponse("NOT_FOUND", "Vehicle not found", 404);
      }

      const veh = vehicle as Record<string, unknown>;

      const { data: pools, error: poolErr } = await admin
        .from("load_pools")
        .select("id, route_cluster_id, origin_district_id, dest_district_id, total_weight_kg, total_volume_cbm, capacity_target_kg, status, created_at")
        .in("status", ["open", "filling", "full"])
        .lte("total_weight_kg", veh.capacity_kg as number)
        .order("total_weight_kg", { ascending: false })
        .limit(20);

      if (poolErr) return errorResponse("QUERY_ERROR", poolErr.message, 400);

      return jsonOk({
        vehicle,
        recommended_pools: pools ?? [],
      });
    }

    // GET /internal/logistics/recommendations
    if (req.method === "GET" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommendations" && segments.length === 3) {
      logStructured({ event: "list_recommendations", request_id: reqId });

      const statusFilter = url.searchParams.get("status") ?? "pending";
      const transporterId = url.searchParams.get("transporter_id");
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

      let query = admin
        .from("vehicle_recommendations")
        .select("*")
        .eq("status", statusFilter)
        .order("recommendation_score", { ascending: false })
        .limit(limit);

      if (statusFilter === "pending") {
        query = query.gt("expires_at", new Date().toISOString());
      }
      if (transporterId) {
        query = query.eq("transporter_id", transporterId);
      }

      const { data, error: qErr } = await query;
      if (qErr) return errorResponse("QUERY_ERROR", qErr.message, 400);
      return jsonOk({ recommendations: data ?? [], count: (data ?? []).length });
    }

    // POST /internal/logistics/recommendations/:id/accept
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommendations" && segments.length === 4 && segments[3] === "accept") {
      return errorResponse("BAD_REQUEST", "Recommendation ID must be provided in the path: /recommendations/{id}/accept", 400);
    }
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommendations" && segments.length === 5 && segments[4] === "accept") {
      const recId = segments[3];
      logStructured({ event: "accept_recommendation", recommendation_id: recId, request_id: reqId });

      const { data: rec, error: recErr } = await admin
        .from("vehicle_recommendations")
        .select("*")
        .eq("id", recId)
        .eq("status", "pending")
        .maybeSingle();

      if (recErr || !rec) {
        return errorResponse("NOT_FOUND", "Recommendation not found or already processed", 404);
      }

      const row = rec as Record<string, unknown>;
      if (new Date(row.expires_at as string) < new Date()) {
        await admin
          .from("vehicle_recommendations")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", recId);
        return errorResponse("EXPIRED", "Recommendation has expired", 410);
      }

      await admin
        .from("vehicle_recommendations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", recId);

      await admin
        .from("vehicle_recommendations")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("load_pool_id", row.load_pool_id as string)
        .eq("status", "pending")
        .neq("id", recId);

      return jsonOk({
        recommendation_id: recId,
        status: "accepted",
        pool_id: row.load_pool_id,
        vehicle_id: row.vehicle_id,
      });
    }

    // POST /internal/logistics/recommendations/:id/reject
    if (req.method === "POST" && segments[0] === "internal" && segments[1] === "logistics" && segments[2] === "recommendations" && segments.length === 5 && segments[4] === "reject") {
      const recId = segments[3];
      logStructured({ event: "reject_recommendation", recommendation_id: recId, request_id: reqId });

      const { error: rejErr } = await admin
        .from("vehicle_recommendations")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", recId)
        .eq("status", "pending");

      if (rejErr) return errorResponse("UPDATE_ERROR", rejErr.message, 400);
      return jsonOk({ recommendation_id: recId, status: "rejected" });
    }

    return errorResponse("NOT_FOUND", `No route matched: ${req.method} /${segments.join("/")}`, 404);
  } catch (err) {
    logStructured({ event: "logistics_orchestrator_error", error: String(err), request_id: reqId });
    return errorResponse("INTERNAL", "Internal server error", 500);
  }
});
