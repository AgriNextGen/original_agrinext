# API_CONTRACTS.md

Status: Production-Grade — v2.0\
Updated: 2026-03-14\
Applies to: Frontend (React PWA) ↔ Supabase (Postgres/RPC/RLS/Storage) ↔ Edge Functions\
Depends on: ENTERPRISE_SECURITY_MODEL_V2_1.md, ENTERPRISE_DATA_ARCHITECTURE.md, ENTERPRISE_RLS_POLICY_MATRIX.md, ENTERPRISE_EDGE_FUNCTION_STANDARD.md

**Purpose:** Define stable, versioned API contracts so AI agents (Cursor, Claude, GPT, Copilot) can generate consistent frontend hooks, edge functions, RPCs, and tests without drift.

---

## 0) Design Rules (Non-Negotiable)

1. **Single contract shape** for all responses (success + error) — see Section 2.
2. **Role enforcement is server-side** (Edge Functions/RPC + RLS).
3. **Multi-table mutations must be RPC** (transactional).
4. **Tier-4 access must be Edge/RPC only** (no direct client reads of `secure` schema).
5. **Idempotency required** for accept/confirm/payment/webhooks.
6. **Audit logs emitted** for sensitive actions.
7. **Version endpoints** to prevent breaking clients.
8. **APIs must be role-agnostic** whenever possible — use unified endpoints with RLS for access control.
9. **Logistics APIs must use the unified shipment system** — all actors use the same infrastructure.

---

## 1) API Surface Overview

AgriNext Gen uses three API mechanisms:

### 1.1 Direct Postgres via Supabase client (RLS protected)

Allowed for:
- Simple reads/writes on public tables where RLS fully enforces access
- Non-critical single-table inserts (e.g., creating a farmland, adding crop photo metadata)

Not allowed for:
- State transitions
- Multi-table writes
- Tier-4 data
- Anything requiring strong atomicity

### 1.2 RPC Functions (Postgres functions)

Used for:
- Atomic workflows
- State machines (trips, orders)
- Access-controlled data shaping (denormalized views)

### 1.3 Edge Functions (Deno)

Used for:
- Operations requiring secrets (payments, external APIs)
- Role validation + orchestration around RPC
- Rate limiting and idempotency
- Signed upload URL generation
- Webhooks
- Internal logistics orchestration

---

## 2) Standard Response Contract

**ALL Edge Functions MUST use this shape. No exceptions.**

### 2.1 Success

```json
{
  "success": true,
  "data": { ... }
}
```

### 2.2 Error

```json
{
  "success": false,
  "error": {
    "code": "UPPERCASE_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### 2.3 Standard Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL` | 500 | Server error |

### 2.4 Request Headers (Standard)

- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`
- `X-Request-Id: <uuid>` (optional, generated client-side)
- `Idempotency-Key: <string>` (required for idempotent endpoints)

### 2.5 Shared Response Helpers

All Edge Functions should import from `_shared/errors.ts`:

```typescript
import { successResponse, errorResponse } from "../_shared/errors.ts";

return successResponse({ user_id: "abc" });
return successResponse({ user_id: "abc" }, 201);
return errorResponse("VALIDATION_ERROR", "Phone is required", 400);
return errorResponse("NOT_FOUND", "Trip not found", 404);
```

---

## 3) Endpoint Versioning Strategy

Edge functions are versioned by path:
- `/functions/v1/<name>` (default current)
- `/functions/v2/<name>` (breaking changes)

RPC functions are versioned by name suffix:
- `accept_transport_load_v1` → `accept_transport_load_v2`

Frontend must pin to a version.

---

## 4) Authentication & Session APIs

### 4.1 Phone Signup (Edge) — v1

**Endpoint:** `POST /functions/v1/signup-by-phone`\
**JWT:** verify_jwt = false (public)\
**Rate Limit:** per phone + IP

**Request**

```json
{
  "phone": "+91XXXXXXXXXX",
  "password": "string (min 8 chars)",
  "full_name": "string",
  "role": "farmer|agent|logistics|buyer|admin",
  "email": "optional@email.com",
  "profile_metadata": { "village": "...", "district": "..." }
}
```

**Response (success)**

```json
{
  "success": true,
  "data": {
    "user_id": "<uuid>",
    "role": "farmer",
    "phone": "+91XXXXXXXXXX",
    "auth_email": "91XXXXXXXXXX@agrinext.local",
    "dashboard_route": "/farmer/dashboard",
    "access_token": "<jwt>",
    "refresh_token": "<token>",
    "expires_in": 3600
  }
}
```

**Error codes:** VALIDATION_ERROR, PHONE_ALREADY_EXISTS, EMAIL_ALREADY_EXISTS, ROLE_CLOSED, SIGNUP_DISABLED, RATE_LIMITED, INTERNAL

### 4.2 Phone Login (Edge) — v1

**Endpoint:** `POST /functions/v1/login-by-phone`\
**JWT:** verify_jwt = false (public)\
**Rate Limit:** per phone + IP, lockout after N failures

**Request**

```json
{
  "phone": "+91XXXXXXXXXX",
  "password": "string"
}
```

**Response (success)**

```json
{
  "success": true,
  "data": {
    "access_token": "<jwt>",
    "refresh_token": "<token>",
    "expires_in": 3600
  }
}
```

**Error codes:** VALIDATION_ERROR, INVALID_CREDENTIALS, ACCOUNT_LOCKED, RATE_LIMITED, INTERNAL

### 4.3 Role Onboarding (Edge) — v1

**Endpoint:** `POST /functions/v1/complete-role-onboard`\
**JWT:** required

**Request**

```json
{ "role": "farmer|agent|logistics|buyer" }
```

**Response (success)**

```json
{
  "success": true,
  "data": { "role": "farmer", "dashboard_route": "/farmer/dashboard" }
}
```

### 4.4 Logout (Client)

Use `supabase.auth.signOut()` on client. No server endpoint.

---

## 5) Core Domain APIs

### 5A) Farmer Domain

#### 5A.1 Profile CRUD (Direct + RLS)

**Table:** `public.profiles`\
Client allowed: SELECT own, UPDATE own fields.

#### 5A.2 Farmland CRUD (Direct + RLS)

**Table:** `public.farmlands`\
Farmer inserts/updates own farmland. Agent may update assigned farmer farmland via RLS.

#### 5A.3 Crop CRUD (Direct + RLS)

**Table:** `public.crops` (linked to `farmlands` via `land_id`)\
Farmer inserts/updates own crops. Agent may update assigned farmer crops.

**Known nullable columns** (always null-check):
- `health_status` → default `'normal'`
- `growth_stage` → default `'seedling'`

#### 5A.4 Agent Crop Status Update — v1 (Edge + RPC, planned)

**Endpoint:** `POST /functions/v1/agent-update-crop-status` (not yet implemented)\
**JWT:** required, roles: agent, admin\
**Audit:** yes

Currently agents update crops via direct table access + RLS. Edge function enforcement is planned.

---

### 5B) Logistics Domain

#### Legacy System (Current Frontend)

The frontend currently uses these legacy tables and RPCs:

| Operation | Mechanism | Table/RPC |
|-----------|-----------|-----------|
| Create transport request | Direct INSERT | `transport_requests` |
| Accept load | RPC | `accept_transport_load_v2` |
| Update trip status | RPC | `update_trip_status_v1` |
| Get trips | RPC | `get_trips_with_context_v2` |
| Get trip detail | RPC | `get_trip_detail_with_context_v1` |
| Cancel transport request | RPC | `cancel_transport_request_v1` |

#### Unified Logistics System (Target State)

The `logistics-orchestrator` Edge Function provides the unified logistics API. It is currently internal-only (requires `x-worker-secret` or admin JWT).

**Bridge RPCs** exist to migrate legacy data:
- `bridge_transport_request_to_shipment_v1(p_transport_request_id)`
- `bridge_trip_to_unified_trip_v1(p_trip_id)`

##### POST /shipments — Create Shipment Request

**Endpoint:** `POST /functions/v1/logistics-orchestrator/shipments`\
**Auth:** x-worker-secret or admin JWT

**Request**

```json
{
  "request_source_type": "farmer|buyer|vendor|admin",
  "source_actor_id": "<uuid>",
  "shipment_type": "farm_produce|input_supply|return_goods",
  "pickup_location": "string",
  "drop_location": "string",
  "weight_estimate_kg": 1200,
  "pickup_time_window": "2026-03-15T08:00:00Z"
}
```

**Response**

```json
{ "success": true, "data": { "shipment_id": "<uuid>" } }
```

##### GET /shipments/{id} — Get Shipment

**Endpoint:** `GET /functions/v1/logistics-orchestrator/shipments/:id`

Returns shipment with items and bookings.

##### POST /shipments/{id}/items — Add Shipment Items

**Endpoint:** `POST /functions/v1/logistics-orchestrator/shipments/:id/items`

**Request** (single item or array)

```json
{
  "product_name": "Tomato",
  "quantity": 500,
  "unit": "kg"
}
```

##### POST /trips — Create Unified Trip

**Endpoint:** `POST /functions/v1/logistics-orchestrator/trips`

**Request**

```json
{
  "vehicle_id": "<uuid>",
  "driver_id": "<uuid>",
  "start_location": "string",
  "end_location": "string"
}
```

##### GET /trips/{id} — Get Unified Trip

**Endpoint:** `GET /functions/v1/logistics-orchestrator/trips/:id`

Returns trip with legs and bookings.

##### POST /bookings — Assign Shipment to Trip

**Endpoint:** `POST /functions/v1/logistics-orchestrator/bookings`

**Request**

```json
{
  "shipment_request_id": "<uuid>",
  "unified_trip_id": "<uuid>"
}
```

##### GET /reverse-candidates/{tripId} — Reverse Load Opportunities

**Endpoint:** `GET /functions/v1/logistics-orchestrator/reverse-candidates/:tripId`

Returns reverse load candidates for a trip's return route.

##### POST /route-clusters/detect — Detect Route Cluster

**Endpoint:** `POST /functions/v1/logistics-orchestrator/route-clusters/detect`

**Request**

```json
{
  "origin_district_id": "<uuid>",
  "dest_district_id": "<uuid>"
}
```

##### POST /load-pools — Create Load Pool

**Endpoint:** `POST /functions/v1/logistics-orchestrator/load-pools`

##### POST /load-pools/{id}/add — Add Shipment to Pool

**Endpoint:** `POST /functions/v1/logistics-orchestrator/load-pools/:id/add`

#### Migration Path: Legacy → Unified

1. Bridge RPCs convert existing `transport_requests` → `shipment_requests` and `trips` → `unified_trips`
2. Frontend migration: replace direct `transport_requests` INSERT with `logistics-orchestrator/shipments` calls
3. Replace `accept_transport_load_v2` with `logistics-orchestrator/bookings`
4. Replace `get_trip_detail_with_context_v1` with `logistics-orchestrator/trips/:id`
5. Open `logistics-orchestrator` to JWT-authenticated users (not just admin/worker)

---

### 5C) Marketplace Domain

#### 5C.1 Browse Listings (Direct + RLS)

**Table:** `public.listings`\
Buyer: SELECT where listing is APPROVED. Farmer: SELECT own. Agent: SELECT assigned farmer listings.

#### 5C.2 Place Order — v1 (RPC)

**RPC:** `place_order_v1`\
**Table:** `public.market_orders`

**Inputs:** listing_id, buyer_id, quantity, note\
**Outputs:** order_id, status

#### 5C.3 Update Order Status — v1 (RPC)

**RPC:** `farmer_confirm_order_v1`, `farmer_reject_order_v1`, `update_order_status_v1`\
Rules: farmer can update only orders linked to their listings. State machine enforced.

---

### 5D) Agent Domain

Agent work is modeled via tasks and visits, not a single "verification" endpoint.

**Tables:** `agent_tasks`, `agent_visits`, `agent_data`, `agent_farmer_assignments`

**RPCs:**
- `agent_dashboard_v1` — agent dashboard stats
- `list_agent_tasks_compact_v1` — paginated task list

Agent crop verification is currently done via direct table access. A dedicated Edge Function (`agent-update-crop-status`) is planned.

---

### 5E) Vendor Domain (Planned)

Vendor dashboard is not yet implemented. When built:
- Vendor registration will use `complete-role-onboard` with role `vendor`
- Vendor delivery requests will use the unified shipment system (`POST /shipments` with `request_source_type: "vendor"`)

---

### 5F) Transport Partner Domain

#### Vehicle Registration (Direct + RLS)

**Table:** `public.vehicles`\
Transporter inserts own vehicles via direct Supabase client.

---

### 5G) Admin Domain

#### Dashboard Metrics — v1 (RPC)

**RPC:** `admin_dashboard_v1(p_days)` — returns platform-wide metrics\
**RPC:** `logistics_dashboard_v1` — logistics-specific stats

#### Admin Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `admin-enqueue` | JWT (admin) | Enqueue background jobs |
| `admin-jobs-summary` | JWT (admin) | Job queue statistics |
| `admin-finance-summary` | JWT (admin) | Financial summary |

All return `{ success: true, data: {...} }`.

---

## 6) Tier-4 Secure Domain (KYC + Payments)

### 6.1 Create Payment Order (Edge)

**Endpoint:** `POST /functions/v1/create-payment-order`\
**JWT:** required

**Request**

```json
{ "order_id": "<uuid>", "provider": "razorpay" }
```

**Response**

```json
{
  "success": true,
  "data": {
    "key_id": "<razorpay_key>",
    "payment_order_id": "<provider_order_id>",
    "amount": 250000,
    "currency": "INR",
    "order_id": "<uuid>"
  }
}
```

### 6.2 Payment Webhook (Edge)

**Endpoint:** `POST /functions/v1/payment-webhook`\
**Auth:** HMAC-SHA256 signature (no JWT)\
**Idempotency:** per event_id

### 6.3 KYC Start (Planned)

**Endpoint:** `POST /functions/v1/kyc-start` (not yet implemented)

---

## 7) Storage Upload Contracts

### 7.1 Get Signed Upload URL — v1

**Endpoint:** `POST /functions/v1/storage-sign-upload-v1`\
**JWT:** required

**Request**

```json
{
  "bucket": "crop-media|trip-proofs|kyc-docs",
  "content_type": "image/jpeg",
  "size_bytes": 12345,
  "entity": { "type": "crop|trip|kyc", "id": "<uuid>" }
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "file_id": "<uuid>",
    "bucket": "crop-media",
    "path": "crop/<entity_id>/<uuid>.jpg",
    "token": "<signed_upload_url>"
  }
}
```

### 7.2 Confirm Upload — v1

**Endpoint:** `POST /functions/v1/storage-confirm-upload-v1`\
Marks file status as `ready`.

### 7.3 Signed Read URL — v1

**Endpoint:** `POST /functions/v1/storage-sign-read-v1`\
Returns a time-limited signed URL for reading a private file.

### 7.4 Delete File — v1

**Endpoint:** `POST /functions/v1/storage-delete-v1`\
Deletes file from storage and marks `files` record as deleted.

---

## 8) Internal/Worker APIs

These endpoints are NOT called by the frontend. They use `x-worker-secret` for auth.

| Function | Purpose |
|----------|---------|
| `job-worker` | Background job processor |
| `finance-cron` | Scheduled finance/trust/analytics job enqueuer |
| `finance-reconcile` | Manual payment reconciliation trigger |
| `finance-admin-api` | Finance admin actions (refunds, payouts) |

All return `{ success: true, data: {...} }`.

---

## 9) Dev-Only APIs

These endpoints require `DEV_TOOLS_ENABLED=true` and `x-dev-secret` header. **Never call from production UI.**

| Function | Method | Purpose |
|----------|--------|---------|
| `dev-switch-role` | POST | Switch acting role |
| `dev-get-active-role` | GET | Query active role |
| `dev-create-acting-session` | POST | Create acting session |
| `dev-revoke-acting-session` | POST | Revoke acting session |

All return `{ success: true, data: {...} }`.

---

## 10) Table Name Reference

Mapping from conceptual domain names to actual database tables:

| Domain Concept | Actual Table | Notes |
|---------------|-------------|-------|
| Farms | `farmlands` | Farmer land parcels |
| Farm crops | `crops` | Linked via `land_id` FK |
| Produce listings | `listings` | Marketplace produce listings |
| Buyer orders | `market_orders` | Via `place_order_v1` RPC |
| Shipments | `shipment_requests` | Unified logistics |
| Shipment items | `shipment_items` | Line items in a shipment |
| Trips (legacy) | `trips` | Legacy transport trips |
| Trips (unified) | `unified_trips` | New unified trip model |
| Trip legs | `trip_legs` | Multi-stop trip segments |
| Bookings | `shipment_bookings` | Shipment-to-trip assignment |
| Load pools | `load_pools` + `load_pool_members` | Grouped shipments |
| Reverse loads | `reverse_load_candidates` | Return-trip opportunities |
| Route clusters | `route_clusters` | Geographic route groupings |
| Vehicles | `vehicles` | Transporter vehicle registry |
| Agent verifications | `agent_tasks` + `agent_visits` | Agent field work |
| Users | `profiles` + `user_roles` | User identity and roles |

---

## 11) Error Handling Details

### 11.1 Validation Errors

Return code `VALIDATION_ERROR` with a human-readable message describing the invalid field.

### 11.2 Conflict Errors

Return code `CONFLICT`. Examples: accept load already taken, idempotency key mismatch.

### 11.3 Not Found

Do not reveal existence across roles. Prefer generic `NOT_FOUND` when unauthorized.

---

## 12) Deprecation Policy

When changing a contract:
1. Keep v1 for 90 days
2. Publish v2 alongside
3. Update client to v2
4. Then remove v1

---

## 13) Cursor Contract (Must Output For New APIs)

For any new endpoint/RPC, AI agents must output:

1. Endpoint name + version
2. API mechanism type (Direct/RPC/Edge)
3. `verify_jwt` setting
4. Allowed roles
5. Request schema
6. Response schema (using canonical format)
7. Idempotency rule
8. Rate limit rule
9. Audit event definition
10. DB/RLS/RPC dependencies
11. Tests to add

---

## 14) API Development Rules for AI Agents

1. Never create duplicate logistics APIs — use the unified shipment system.
2. Always use `shipment_requests` as the logistics entry point for all actors.
3. Maintain backward compatibility with legacy `transport_requests` during migration.
4. Always validate actor roles server-side.
5. Use service layer (RPC) for business logic — keep Edge Functions thin.
6. All responses MUST use `{ success: true, data }` / `{ success: false, error: { code, message } }`.
7. Never create role-specific endpoint names (e.g., `/farmer-transport-request`).

---

END OF API CONTRACTS
