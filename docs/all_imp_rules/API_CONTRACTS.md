\% AgriNext Gen --- Enterprise API Contracts (Production Grade,
Cursor-Optimized) % Version 1.0 % Generated on 2026-02-19

# API_CONTRACTS.md

Status: Production-Grade\
Applies to: Frontend (React PWA) ↔ Supabase (Postgres/RPC/RLS/Storage) ↔
Edge Functions\
Depends on: ENTERPRISE_SECURITY_MODEL_V2_1.md,
ENTERPRISE_DATA_ARCHITECTURE.md, ENTERPRISE_RLS_POLICY_MATRIX.md,
ENTERPRISE_EDGE_FUNCTION_STANDARD.md

**Purpose:** Define stable, versioned API contracts so Cursor can
generate consistent frontend hooks, edge functions, RPCs, and tests
without drift.

------------------------------------------------------------------------

## 0) Design Rules (Non-Negotiable)

1.  **Single contract shape** for responses (success + error).
2.  **Role enforcement is server-side** (edge/RPC + RLS).
3.  **Multi-table mutations must be RPC** (transactional).
4.  **Tier-4 access must be edge/RPC only** (no direct client reads of
    secure schema).
5.  **Idempotency required** for accept/confirm/payment/webhooks.
6.  **Audit logs emitted** for sensitive actions.
7.  **Version endpoints** to prevent breaking clients.

------------------------------------------------------------------------

## 1) API Surface Overview

AgriNext Gen uses three API mechanisms:

### 1.1 Direct Postgres via Supabase client (RLS protected)

Allowed for: - Simple reads/writes on public tables where RLS fully
enforces access - Non-critical single-table inserts (e.g., creating a
farmland, adding crop photo metadata)

Not allowed for: - State transitions - Multi-table writes - Tier-4
data - Anything requiring strong atomicity

### 1.2 RPC Functions (Postgres functions)

Used for: - Atomic workflows - State machines (trips, orders, warehouse
stock events) - Access-controlled data shaping (denormalized views)

### 1.3 Edge Functions (Deno)

Used for: - Operations requiring secrets (SMS, payments, govt APIs) -
Role validation + orchestration around RPC - Rate limiting and
idempotency - Signed upload URL generation - Webhooks

------------------------------------------------------------------------

## 2) Standard Response Contract

### 2.1 Success

    {
      "ok": true,
      "data": <payload>,
      "request_id": "<uuid>",
      "meta": {
        "version": "v1"
      }
    }

### 2.2 Error

    {
      "ok": false,
      "error": {
        "code": "AUTH_REQUIRED" | "ROLE_FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" |
                "CONFLICT" | "RATE_LIMITED" | "INTERNAL",
        "message": "Human-readable message",
        "details": { ...optional }
      },
      "request_id": "<uuid>",
      "meta": {
        "version": "v1"
      }
    }

### 2.3 Request Headers (Standard)

-   `Authorization: Bearer <access_token>`
-   `Content-Type: application/json`
-   `X-Request-Id: <uuid>` (optional, generated client-side)
-   `Idempotency-Key: <string>` (required for idempotent endpoints)

------------------------------------------------------------------------

## 3) Endpoint Versioning Strategy

All edge functions are versioned by path:

-   `/functions/v1/<name>` (default current)
-   `/functions/v2/<name>` (breaking changes)

RPC functions are versioned by name when needed: -
`accept_transport_load_v1` - `accept_transport_load_v2`

Frontend must pin to a version.

------------------------------------------------------------------------

## 4) Authentication & Session APIs

### 4.1 Phone Login (Edge) --- v1

**Endpoint:** `POST /functions/v1/login-by-phone`\
**JWT:** verify_jwt = false (auth bootstrap)\
**Rate Limit:** required (per phone + IP)

**Request**

    {
      "phone": "+91XXXXXXXXXX",
      "password": "<string>",
      "role": "farmer|agent|logistics|buyer|admin"
    }

**Response (success)**

    {
      "ok": true,
      "data": {
        "access_token": "<jwt>",
        "refresh_token": "<token>",
        "expires_in": 3600,
        "user_id": "<uuid>",
        "role": "<role>"
      },
      "request_id": "<uuid>",
      "meta": { "version": "v1" }
    }

Errors: - AUTH_REQUIRED (missing fields) - VALIDATION_ERROR (invalid
phone format) - ROLE_FORBIDDEN (role mismatch) - RATE_LIMITED - INTERNAL

**Notes** - role must be validated against public.user_roles - do not
leak whether user exists (avoid account enumeration)

------------------------------------------------------------------------

### 4.2 Logout (Client)

Use `supabase.auth.signOut()` on client. No server endpoint.

------------------------------------------------------------------------

## 5) Core Domain APIs (RPC + Edge)

This section defines primary workflows by domain.

------------------------------------------------------------------------

# 5A) Farmer Domain

## 5A.1 Create/Update Farmer Profile (Direct + RLS)

Table: `public.profiles`

Client allowed: - SELECT own - UPDATE own fields

Sensitive fields update (phone) may require edge function later.

------------------------------------------------------------------------

## 5A.2 Farmland CRUD (Direct + RLS)

Table: `public.farmlands`

Allowed operations: - Farmer inserts own farmland - Farmer updates own
farmland - Agent may update assigned farmer farmland if authorized by
RLS

Request/Response: standard Supabase client patterns (no edge required).

------------------------------------------------------------------------

## 5A.3 Crop Status Update (Agent) --- v1 (Edge + RPC recommended)

Because this is sensitive (tampering risk), enforce via edge or RPC.

**Endpoint:** `POST /functions/v1/agent-update-crop-status`\
**JWT:** required\
**Allowed Roles:** agent, admin\
**Audit:** yes

**Request**

    {
      "crop_id": "<uuid>",
      "new_status": "SOWN|GROWING|READY|HARVESTED",
      "note": "<optional string>",
      "evidence_media_ids": ["<uuid>", "..."]
    }

**Rules** - agent must be assigned to crop's farmer
(agent_farmer_assignments) - status transition must follow allowed state
changes

**Response**

    { "ok": true, "data": { "crop_id": "<uuid>", "status": "<new_status>" }, "request_id": "...", "meta": { "version": "v1" } }

------------------------------------------------------------------------

# 5B) Logistics Domain

## 5B.1 Create Transport Request (Farmer) (Direct + RLS)

Table: `public.transport_requests` Farmer can create a request for own
crop/listing.

------------------------------------------------------------------------

## 5B.2 Accept Load (Logistics) --- v1 (Edge + RPC)

**Endpoint:** `POST /functions/v1/accept-load`\
**JWT:** required\
**Allowed Roles:** logistics, admin\
**Idempotency:** required\
**Audit:** yes

**Request**

    {
      "transport_request_id": "<uuid>",
      "vehicle_id": "<uuid>"
    }

**Server Behavior** - calls RPC `accept_transport_load_v1` - creates
trip + status event + notification atomically - returns trip_id and
assignment summary

**Response**

    {
      "ok": true,
      "data": {
        "trip_id": "<uuid>",
        "transport_request_id": "<uuid>",
        "status": "ASSIGNED"
      },
      "request_id": "<uuid>",
      "meta": { "version": "v1" }
    }

Errors: - CONFLICT (already accepted) - ROLE_FORBIDDEN - NOT_FOUND -
VALIDATION_ERROR

------------------------------------------------------------------------

## 5B.3 Update Trip Status --- v1 (Edge + RPC)

**Endpoint:** `POST /functions/v1/update-trip-status`\
**JWT:** required\
**Allowed Roles:** logistics, admin\
**Audit:** yes

**Request**

    {
      "trip_id": "<uuid>",
      "new_status": "EN_ROUTE|PICKED_UP|IN_TRANSIT|DELIVERED",
      "proof": {
        "media_id": "<uuid>",
        "lat": 12.3,
        "lng": 76.6,
        "timestamp": "2026-02-19T10:00:00Z"
      }
    }

Rules: - PICKED_UP and DELIVERED require proof - status transitions must
be valid from current state - inserts `transport_status_events`
append-only

------------------------------------------------------------------------

## 5B.4 GPS Ingest --- v1 (Edge only)

**Endpoint:** `POST /functions/v1/trip-location-ingest`\
**JWT:** required\
**Allowed Roles:** logistics\
**Rate Limit:** required\
**Audit:** anomaly-only

**Request**

    {
      "trip_id": "<uuid>",
      "points": [
        { "lat": 12.3, "lng": 76.6, "speed": 40, "heading": 120, "recorded_at": "..." },
        ...
      ]
    }

Response: - accepted count - dropped count - server timestamp

------------------------------------------------------------------------

# 5C) Marketplace Domain

## 5C.1 Browse Listings (Buyer) (Direct + RLS)

Table: `public.listings`

Buyer: - SELECT where listing is APPROVED and not deleted

Farmer: - SELECT own listings

Agent: - SELECT assigned farmer listings

------------------------------------------------------------------------

## 5C.2 Place Order (Buyer) --- v1 (RPC recommended)

Because order placement impacts multiple tables (inventory,
notifications), use RPC.

**RPC:** `place_market_order_v1`\
Inputs: - listing_id, quantity, buyer_notes

Outputs: - order_id, status

------------------------------------------------------------------------

## 5C.3 Update Order Status (Farmer) --- v1 (RPC)

**RPC:** `farmer_update_order_status_v1` Inputs: - order_id, new_status
Rules: - farmer can update only orders linked to their listings -
transitions validated (state machine) - audit log written

------------------------------------------------------------------------

# 5D) Warehouse Domain

## 5D.1 Stock Adjust (Operator/Admin) --- v1 (Edge + RPC)

**Endpoint:** `POST /functions/v1/warehouse-adjust-stock`\
JWT required, role = admin or warehouse_operator (future role).\
Idempotency required.

**Request**

    {
      "warehouse_id": "<uuid>",
      "crop_id": "<uuid>",
      "delta_qty": 100,
      "reason": "INTAKE|DISPATCH|DAMAGE|AUDIT_CORRECTION"
    }

Server: - calls RPC `warehouse_adjust_stock_v1` - inserts
`warehouse_stock_events` - prevents negative stock - audit log written

------------------------------------------------------------------------

# 5E) Tier-4 Secure Domain (KYC + Payments)

## 5E.1 KYC Start --- v1 (Edge + RPC)

**Endpoint:** `POST /functions/v1/kyc-start`\
Roles: admin/system (later user-initiated with strict scope)

Returns: - provider session URL or token - reference_id (tokenized)

------------------------------------------------------------------------

## 5E.2 Payment Webhook --- v1 (Edge webhook)

**Endpoint:** `POST /functions/v1/payments-webhook`\
JWT off, signature required, idempotency required. Writes to: -
secure.payment_events - audit.security_events

------------------------------------------------------------------------

## 6) Storage Upload Contracts

Uploads must follow signed URL pattern.

### 6.1 Get Signed Upload URL --- v1

**Endpoint:** `POST /functions/v1/storage-sign-upload`\
JWT required. Request:

    {
      "bucket": "crop-photos|trip-proofs|voice-notes|soil-reports|kyc-documents",
      "path_hint": "optional",
      "content_type": "image/jpeg",
      "size_bytes": 12345,
      "entity": { "type": "crop|trip|kyc", "id": "<uuid>" }
    }

Response: - signed_url - path - expires_at

Must validate: - bucket allowed for role - entity ownership - file type
allowlist - size limit

------------------------------------------------------------------------

## 7) Error Handling Details

### 7.1 Validation Errors

Return: - code=VALIDATION_ERROR - details with field-level errors

### 7.2 Conflict Errors

Return: - code=CONFLICT Examples: - accept load already taken -
idempotency key mismatch

### 7.3 Not Found

Do not reveal existence across roles. Prefer generic NOT_FOUND when
unauthorized.

------------------------------------------------------------------------

## 8) Audit Requirements Per Endpoint

Every endpoint/RPC must declare: - action_type - entity_type -
entity_id - metadata fields

Minimum audited endpoints: - accept-load - update-trip-status -
agent-update-crop-status - warehouse-adjust-stock - any Tier-4 calls -
any admin data export

------------------------------------------------------------------------

## 9) Frontend Integration Standards

Frontend must implement: - typed request/response wrappers - request_id
propagation - idempotency-key generation for idempotent calls - retry
strategy: - safe retries only for idempotent endpoints

Hooks naming: - useAcceptLoad() - useUpdateTripStatus() -
useTripLocationIngest() - useSignedUploadUrl()

------------------------------------------------------------------------

## 10) Deprecation Policy

When changing a contract: - keep v1 for 90 days - publish v2 alongside -
update client to v2 - then remove v1

------------------------------------------------------------------------

## 11) Cursor Contract (Must Output For New APIs)

For any new endpoint/RPC, Cursor must output: 1. Endpoint name + version
2. Type (A/B/C/D) 3. verify_jwt setting 4. allowed roles 5. request
schema 6. response schema 7. idempotency rule 8. rate limit rule 9.
audit event definition 10. DB/RLS/RPC dependencies 11. tests to add

------------------------------------------------------------------------

END OF API CONTRACTS
