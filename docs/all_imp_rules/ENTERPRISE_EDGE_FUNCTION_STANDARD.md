\% AgriNext Gen --- Enterprise Edge Functions Standard (Production
Grade, Cursor-Optimized) % Version 1.0 % Generated on 2026-02-19

# ENTERPRISE_EDGE_FUNCTION_STANDARD.md

Status: Production-Grade\
Runtime: Supabase Edge Functions (Deno)\
Applies to: dev / staging / prod\
Depends on: ENTERPRISE_SECURITY_MODEL_V2_1.md,
ENTERPRISE_DATA_ARCHITECTURE.md, ENTERPRISE_RLS_POLICY_MATRIX.md

**Purpose:** Establish a strict, reusable, secure standard for ALL Edge
Functions so Cursor can generate correct implementations without
introducing security debt.

------------------------------------------------------------------------

## 0) Non-Negotiables (Hard Rules)

1.  **verify_jwt = true** by default for every function.
2.  **No service_role key** in any client (web/mobile). service_role is
    only available inside edge runtime via secrets.
3.  **Role must be verified server-side** using `public.user_roles` for
    every sensitive operation.
4.  **Input must be validated** (schema validation) before any DB
    writes.
5.  **Multi-table writes must use RPC** (transactional), not multiple
    client `.from()` calls.
6.  **Every sensitive action must write audit logs** (append-only).
7.  **Errors must be standardized** and must not leak internals (no raw
    stack traces to clients).
8.  **CORS must be explicit** and locked down to allowed origins in
    prod.
9.  **Rate limiting required** for auth endpoints and high-frequency
    ingestion (GPS/events).
10. **Idempotency** required for payment/webhooks and any
    "accept/confirm" endpoint.

------------------------------------------------------------------------

## 1) Function Types & Security Posture

Edge functions fall into 4 categories. Each category has mandatory
controls.

### Type A --- User Action (JWT Required)

Examples: - accept-load - update-trip-status - agent-update-crop-status
Required: - verify_jwt = true - role check - ownership check - audit log
write - RPC for multi-writes

### Type B --- Ingestion (JWT Required + Rate Limited)

Examples: - trip-location-ingest - bulk-photo-upload-init Required: -
verify_jwt = true - rate limiting (per user/trip/device) - payload size
limits - partition-friendly writes - audit on anomalies (optional)

### Type C --- Webhook (JWT Off but Signature Required)

Examples: - payment provider webhook - SMS provider delivery receipts
Required: - verify_jwt = false - signature verification (HMAC / public
key) - strict allowlist (IP/provider) - idempotency keys - audit log of
webhook receipt + processing result

### Type D --- Health/Public Utility (JWT Off)

Examples: - health Required: - verify_jwt = false - no secrets
returned - no DB access required (preferred)

------------------------------------------------------------------------

## 2) Standard Project Layout (Functions)

Recommended structure inside `supabase/functions/<fn_name>/`:

    supabase/functions/<fn_name>/
      index.ts                 # entrypoint
      deps.ts                  # third-party imports pinned
      lib/
        auth.ts                # role + session helpers
        db.ts                  # supabase clients
        validate.ts            # zod or manual validation
        cors.ts                # cors headers
        rateLimit.ts           # rate limiting helper
        audit.ts               # audit insert helper
        errors.ts              # standardized error response
        idempotency.ts         # idempotency helpers
        log.ts                 # structured logging

Cursor should generate shared libs into `supabase/functions/_shared/`
when possible.

------------------------------------------------------------------------

## 3) Supabase Clients (Anon vs Service Role)

### 3.1 Clients

-   **User-scoped client** (uses JWT from request) → respects RLS.
-   **Service role client** → bypasses RLS, must be used only when
    unavoidable (secure schema, admin operations, batch ops).

### 3.2 Rule of Thumb

-   If the operation touches **public** schema and RLS is correct → use
    user-scoped.
-   If the operation touches **secure** schema (Tier-4) → use RPC with
    SECURITY DEFINER and/or service role (edge only).
-   Do NOT use service role for simple reads that can be protected by
    RLS.

------------------------------------------------------------------------

## 4) Standard Request Lifecycle (Every Function)

All Type A/B/C functions must follow:

1.  **CORS preflight handling**
2.  **Method allowlist**
3.  **Auth extraction** (if JWT required)
4.  **Role verification**
5.  **Input validation**
6.  **Authorization checks** (ownership/assignment)
7.  **Business logic** (prefer RPC for multi-writes)
8.  **Audit logging**
9.  **Standard response**

------------------------------------------------------------------------

## 5) Standard Response Contract (Frontend-Friendly)

### 5.1 Success

    {
      "ok": true,
      "data": <payload>,
      "request_id": "<uuid>"
    }

### 5.2 Error

    {
      "ok": false,
      "error": {
        "code": "ROLE_FORBIDDEN" | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL",
        "message": "Human readable message",
        "details": { ...optional }
      },
      "request_id": "<uuid>"
    }

**Never** return raw Postgres errors verbatim to clients in production.

------------------------------------------------------------------------

## 6) CORS Standard

### 6.1 Allowed Origins

-   dev: localhost + preview domains
-   prod: your official domain(s) only

### 6.2 Headers

-   Allow: `Content-Type, Authorization, X-Request-Id, Idempotency-Key`
-   Methods: only those required (usually POST)

------------------------------------------------------------------------

## 7) Auth & Role Verification Standard

### 7.1 Extract user

-   Parse JWT claims (Supabase provides)
-   Always derive `user_id = auth.uid()` from token

### 7.2 Fetch role

Query `public.user_roles`: - must exist - must match allowed roles for
endpoint

### 7.3 Role Enforcement

If role mismatch → return `ROLE_FORBIDDEN`.

------------------------------------------------------------------------

## 8) Authorization Checks (Ownership / Assignment)

### 8.1 Ownership

-   Verify entity belongs to user via FK:
    -   `farmer_id = user_id`
    -   `transporter_id = user_id`
    -   `buyer_id = user_id`

### 8.2 Agent Assignment

Agent may access farmer data only if: -
`agent_farmer_assignments.agent_id = user_id` AND
`farmer_id = <target_farmer_id>`

### 8.3 Admin Override

Admin override allowed ONLY for: - support operations - data health -
compliance exports (logged)

Admin operations must always write audit logs with reason metadata.

------------------------------------------------------------------------

## 9) Input Validation Standard (Zod Recommended)

Every function must validate payload: - required fields - types - length
limits - enum checks - file type allowlist (if applicable)

Reject invalid payloads with `VALIDATION_ERROR`.

------------------------------------------------------------------------

## 10) Rate Limiting (Mandatory for Auth + GPS)

### 10.1 When

-   login/signup
-   otp/send
-   gps ingest
-   upload init endpoints
-   any endpoint with "spam" potential

### 10.2 Strategy

Store counters in `public.rate_limits`: - key = (`scope`, `subject_id`,
`window_start`) - count - max - expires_at

Rate limit dimensions: - per user_id - per IP (best effort) - per
trip_id (GPS)

Return `RATE_LIMITED` with retry seconds.

------------------------------------------------------------------------

## 11) Idempotency (Mandatory for Webhooks + Accept/Confirm)

### 11.1 When

-   payment provider webhooks
-   accept-load
-   order confirm
-   warehouse stock adjustments (if triggered by external system)

### 11.2 Mechanism

Require header: - `Idempotency-Key`

Store in `public.idempotency_keys`: - key - endpoint - user_id (nullable
for webhooks) - request_hash - response_json - created_at - expires_at

If same key + same request_hash → return stored response (safe retry).
If same key + different hash → return `CONFLICT`.

------------------------------------------------------------------------

## 12) Audit Logging Injection

Edge function must insert into `audit.audit_logs` for: - state changes
(trip/order/warehouse) - admin actions - access to Tier-4 operations -
data exports

Minimum fields: - actor_id, actor_role - action_type, entity_type,
entity_id - metadata: request_id, ip, user_agent, important params

Audit logs are append-only.

------------------------------------------------------------------------

## 13) Standard Logging (Structured, No PII Leakage)

### 13.1 Log levels

-   INFO: request start/end, timings
-   WARN: validation fails, rate limit hits, suspicious activity
-   ERROR: unexpected failures (internal)

### 13.2 Do not log

-   phone numbers (raw)
-   Aadhaar numbers (ever)
-   payment tokens
-   full GPS streams (log aggregates only)

Use `request_id` for tracing.

------------------------------------------------------------------------

## 14) Secure Schema Access Pattern (Tier-4)

### 14.1 Rule

No direct table access from client. Only via: - SECURITY DEFINER RPC +
strict checks - edge function calling RPC

### 14.2 Example Flow (KYC)

1)  Edge receives request (admin/system)
2)  Validates role = admin/super_admin
3)  Calls `secure.create_or_update_kyc_record()` RPC
4)  Writes audit log

------------------------------------------------------------------------

## 15) File Upload Pattern (Safe + Private)

### 15.1 Pattern

-   Client requests signed upload URL from Edge function
-   Edge validates role + ownership + file type + size
-   Edge returns signed URL (short TTL)
-   Client uploads directly to Storage
-   Client writes metadata row (or Edge writes metadata via RPC)

### 15.2 Why

Avoids public buckets and prevents unauthorized upload paths.

------------------------------------------------------------------------

## 16) Webhook Security Pattern

For any webhook endpoint: - verify signature (HMAC with provider
secret) - allowlist provider IPs if possible - require idempotency -
process in transaction (RPC) - write audit log

Never trust webhook payload without signature verification.

------------------------------------------------------------------------

## 17) Deployment Standards

### 17.1 config.toml

Each function must be declared with correct `verify_jwt`. No mismatches
between local and deployed config.

### 17.2 Secrets

Use: - `supabase secrets set` Never commit secrets into repo.

### 17.3 Versioning

Function changes should be tracked with: - changelog entry - schema
changes via migrations

------------------------------------------------------------------------

## 18) Testing Standards (Minimum)

For each function, tests should cover: - unauthenticated request
rejected - wrong role rejected - invalid payload rejected - ownership
violation rejected - successful path returns ok:true - idempotency retry
returns same response - rate limit triggers as expected

Where possible, run smoke tests in staging after deploy.

------------------------------------------------------------------------

## 19) Production Templates (Cursor MUST Follow)

### 19.1 Minimal Function Skeleton (Pseudo-Template)

1)  Create `request_id`
2)  Handle OPTIONS (CORS)
3)  Ensure method is POST
4)  Verify JWT
5)  Fetch role from user_roles
6)  Validate body
7)  Run ownership check
8)  Call RPC (transaction)
9)  Insert audit log
10) Return standardized response

### 19.2 Standard Error Codes

-   AUTH_REQUIRED
-   ROLE_FORBIDDEN
-   VALIDATION_ERROR
-   NOT_FOUND
-   CONFLICT
-   RATE_LIMITED
-   INTERNAL

------------------------------------------------------------------------

## 20) Cursor Contract (What must be output for any new Edge Function)

When generating an Edge Function, Cursor must specify: - Function type
(A/B/C/D) - verify_jwt setting - allowed roles - RLS/RPC dependency -
storage bucket impact (if any) - rate limiting settings (if any) -
idempotency requirement (if any) - audit log events produced - tests to
add

------------------------------------------------------------------------

END OF DOCUMENT
