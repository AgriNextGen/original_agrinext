---
author:
- Version 2.1 (Investment-Grade, India→Global)
date: Generated on 2026-02-19
title: AgriNext Gen --- Enterprise Security, Privacy & Compliance
  Blueprint (Cursor-Optimized)
---

# ENTERPRISE_SECURITY_MODEL_V2_1.md

**Purpose:** This document is the *single source of truth* for security,
privacy, and compliance design decisions in AgriNext Gen. Cursor/agents
must treat this as authoritative when generating schema, RLS, edge
functions, storage policies, and app logic.

**Scope:** Supabase (Postgres + Auth + Storage + Edge Functions) + React
PWA.\
**Targets:** India (DPDP) now; Global (GDPR readiness) later.\
**Regulated-Capable:** Government data, Aadhaar/KYC capability, payments
capability, warehouse inventory, and live GPS tracking.

------------------------------------------------------------------------

## 0) Non‑Negotiables (Engineering Guardrails)

1.  **No trust in frontend.** Authorization is enforced by Postgres
    RLS + RPC + Edge Functions.
2.  **No service_role key in clients.** Ever. Only in Edge Functions or
    secure CI/CD.
3.  **RLS on every table with user or operational data.** No exceptions.
4.  **Tier‑4 data is isolated.** Regulated/critical data is not
    queryable via normal client patterns.
5.  **Every sensitive action is audit logged.** Audit logs are
    append-only (no UPDATE/DELETE).
6.  **State machines are enforced server-side.** Trips/orders/warehouse
    updates must use RPC.
7.  **Migration safety.** Only additive, versioned migrations; no
    destructive changes in production.

------------------------------------------------------------------------

## 1) Security Objectives & Success Criteria

### 1.1 Objectives

-   Prevent unauthorized data access across roles
    (Farmer/Agent/Logistics/Buyer/Admin).
-   Prevent data tampering (trip proof fraud, crop status manipulation,
    stock manipulation).
-   Enable regulated data capability (KYC/Aadhaar references, govt
    datasets, payments).
-   Provide provable accountability (audit trails + immutable logs).
-   Provide expansion readiness (multi-region, data residency
    awareness).

### 1.2 Success Criteria (Release Gates)

A build is not "release-ready" unless: - 100% user-facing tables have
RLS enabled and policies exist. - Storage buckets are private and
enforced with policies + signed URLs. - Edge functions: verify JWT =
true by default; exceptions must have signature validation. - Admin
access is explicitly scoped and fully audited. - Tier-4 isolation is
implemented (schema separation + restricted access patterns). - Rate
limiting exists for auth and high-frequency endpoints (GPS/events).

------------------------------------------------------------------------

## 2) Data Classification & Handling Rules (DPDP + Enterprise)

### 2.1 Data Tiers

**Tier 1 (Public):** mandi prices, district lists, non-personal
aggregated data\
**Tier 2 (Operational):** trips, warehouse ops, tasks, listings
metadata\
**Tier 3 (Sensitive Personal):** phone numbers, precise farm geo,
earnings, IDs\
**Tier 4 (Regulated/Critical):** KYC verification artifacts, Aadhaar
references (tokenized), payment events/tokens, govt datasets

### 2.2 Handling Rules by Tier

  ---------------------------------------------------------------------------------
  Tier    Storage     Access        Encryption     Logging        Client Access
  ------- ----------- ------------- -------------- -------------- -----------------
  1       public      broad         optional       minimal        allowed
          schema                                                  

  2       public      role-scoped   optional       standard       allowed w/ RLS
          schema                                                  

  3       public      strict        recommended    required       allowed w/ strict
          schema                                                  RLS

  4       secure      extremely     **required**   **required +   **NO direct
          schema      strict                       immutable**    client reads**
                                                                  (RPC/Edge only)
  ---------------------------------------------------------------------------------

### 2.3 PII Minimization

-   Store only what's needed for product operation.
-   For analytics exports: remove phone, remove precise geo, aggregate
    to district/taluk, and hash stable identifiers.

------------------------------------------------------------------------

## 3) System Segmentation (Single Project, Multi‑Schema Enterprise Design)

### 3.1 Schemas

-   **public** → core operational tables
-   **secure** → Tier‑4 (KYC/payment/govt sensitive references),
    accessible only via RPC/Edge
-   **audit** → immutable audit logs + security events
-   **analytics** → aggregated/anonymized rollups (optional)

### 3.2 Cross-Schema Rules

-   Clients query **public** via RLS only.
-   Anything touching **secure** must be performed via **SECURITY
    DEFINER** RPC that validates role + intent.
-   **audit** is append-only: inserts only.
-   No ad-hoc joins from public → secure in client queries.

------------------------------------------------------------------------

## 4) Authentication (Phone‑First) & Session Security

### 4.1 Auth Methods

Primary: **Phone + password** (or Phone OTP later)\
Optional: Google OAuth (role must still be assigned server-side)

### 4.2 Auth Configuration Requirements

-   **Disable email confirmations** for phone-first flows.
-   Enforce strong password policy (min length + common password
    rejection if feasible).
-   Use short session lifetimes if handling Tier-4 operations
    (adjustable).
-   Implement device/session management (logout all sessions admin tool
    later).

### 4.3 Signup & Role Assignment

Single source of truth:

    public.user_roles(user_id, role, region_scope, created_at)

Role is not trusted from UI. Assignment must be: - (a) server trigger
(on auth.users) OR - (b) secured RPC callable only with strict rules
Avoid race conditions by choosing one authoritative mechanism.

------------------------------------------------------------------------

## 5) Authorization (RBAC) + RLS (Row-Level Security)

### 5.1 Roles

-   farmer
-   agent
-   logistics
-   buyer
-   admin
-   super_admin (future govt integrations / root ops)

### 5.2 Core RLS Helpers (Required)

Create helper functions (stable, used across policies): -
`public.current_role()` → returns role for `auth.uid()` -
`public.is_admin()` → role in ('admin','super_admin') -
`public.is_agent_assigned(farmer_id uuid)` → checks
`agent_farmer_assignments`

> All helpers must be SQL/STABLE where possible and avoid legacy role
> tables.

### 5.3 Standard Policy Templates

**Self row (profiles):** - SELECT/UPDATE only where
`user_id = auth.uid()` OR admin

**Farmer-owned resources (farmlands/crops/listings):** - Farmer: own
rows - Agent: rows of assigned farmers (read/write only where needed) -
Admin: full

**Logistics resources (trips/vehicles):** - Logistics: own transporter
rows; assigned trips only - Admin: full - Farmers: only their request
context (read-only) if needed

**Buyer resources (market_orders):** - Buyer: own orders - Farmer:
orders referencing their listings - Admin: full

### 5.4 "No Direct Write" Tables

Certain tables must be write-protected from direct client writes: - trip
status events (insert only via RPC) - payment events (secure schema; RPC
only) - kyc records (secure schema; RPC only) - audit logs (insert only;
no update/delete)

### 5.5 RLS Coverage Checklist (Must Pass)

For every table in public schema: - RLS enabled - SELECT policy exists -
INSERT policy exists (if inserts allowed) - UPDATE policy exists (if
updates allowed) - DELETE policy exists (only if truly necessary; prefer
soft delete with audit)

------------------------------------------------------------------------

## 6) State Machines (Fraud-Resistant Server Enforcement)

### 6.1 Trip State Machine

All transitions must happen via RPC (atomic + audited). Example
states: - REQUESTED → ASSIGNED → EN_ROUTE → PICKED_UP → IN_TRANSIT →
DELIVERED → CLOSED Rules: - Proof required for PICKED_UP and DELIVERED
(photo + geo + timestamp) - Transitions validated against current
state - Each transition inserts into `transport_status_events`
(append-only)

### 6.2 Order State Machine

Similar RPC-enforced transitions for `market_orders`: - PLACED →
CONFIRMED → PACKED → SHIPPED → DELIVERED → COMPLETED / CANCELLED Every
change audited.

### 6.3 Warehouse Stock Mutations

Stock increments/decrements must use RPC with: - operator assignment
check - negative stock prevention - ledger-style event logging

------------------------------------------------------------------------

## 7) Government Data Capability (Audit & Access Control)

Government-linked data must have: - strict RBAC (admin/super_admin only
or scoped roles) - access logs (read access should be logged for
high-risk datasets) - export logs (who exported, what, when,
justification field) - immutable evidence trail in
`audit.security_events`

------------------------------------------------------------------------

## 8) Aadhaar/KYC Capability (Tier‑4 Secure Design)

### 8.1 Absolute Rules

-   Never store raw Aadhaar number.
-   Store only tokenized reference IDs from a KYC provider.
-   Sensitive documents stored in restricted bucket `kyc-documents`.
-   Access to KYC docs is time-bounded via signed URLs.
-   Every KYC access is logged in audit schema.

### 8.2 Secure Schema Tables (Example)

    secure.kyc_records(
      id uuid pk,
      user_id uuid,
      provider text,
      provider_reference_id text,
      verification_status text,
      provider_response_hash text,
      created_at timestamptz
    )

------------------------------------------------------------------------

## 9) Payments Capability (Tier‑4 Secure Design)

### 9.1 Rules

-   No card data storage.
-   Store provider transaction IDs and tokens only.
-   Use immutable event table + (later) double-entry ledger.

### 9.2 Secure Schema Tables (Example)

    secure.payment_events(
      id uuid pk,
      user_id uuid,
      provider text,
      provider_transaction_id text,
      amount numeric,
      currency text,
      status text,
      created_at timestamptz
    )

------------------------------------------------------------------------

## 10) Live GPS Tracking (High‑Volume + Security)

### 10.1 Data Model

    public.trip_location_events(
      id uuid pk,
      trip_id uuid,
      lat double precision,
      lng double precision,
      speed double precision,
      heading double precision,
      recorded_at timestamptz,
      created_at timestamptz
    )

### 10.2 Controls

-   Rate limiting per trip/device
-   Partition by time (monthly) for scale
-   Retention policy (TTL) for raw points (e.g., 90 days)
-   Aggregated tracks stored for longer (compressed polyline / daily
    summary)
-   Spoof detection signals (sudden jumps, impossible speed)

------------------------------------------------------------------------

## 11) Storage Security (Buckets + Policies)

### 11.1 Buckets

-   crop-photos (Tier 3)
-   trip-proofs (Tier 3)
-   voice-notes (Tier 3)
-   soil-reports (Tier 3)
-   kyc-documents (Tier 4)
-   warehouse-documents (Tier 2/3)

### 11.2 Rules

-   No public buckets.
-   Access via signed URLs only.
-   Validate uploads in Edge Function where possible (MIME/type/size).
-   Store metadata in DB with ownership columns and RLS.
-   Log downloads of Tier‑4 docs.

------------------------------------------------------------------------

## 12) Edge Functions Security Standard

### 12.1 Defaults

-   `verify_jwt = true` for all functions
-   Exceptions only for:
    -   health check
    -   external webhooks with signature verification (HMAC) + allowlist

### 12.2 Mandatory Checks in Each Function

1.  Extract `auth.uid()` (from JWT)
2.  Fetch role from `public.user_roles`
3.  Validate ownership/assignment in DB
4.  Prefer RPC for multi-table writes
5.  Insert audit log for sensitive operations
6.  Return standardized error format (no leaking internals)

### 12.3 Rate Limiting

Implement rate limiting in Edge Functions for: - login/signup
endpoints - GPS ingestion - upload URL generation Store counters in
`public.rate_limits` or use provider mechanisms.

------------------------------------------------------------------------

## 13) Logging & Monitoring (Investment Readiness)

### 13.1 Audit Schema (Immutable)

    audit.audit_logs(
      id uuid pk,
      actor_id uuid,
      actor_role text,
      action_type text,
      entity_type text,
      entity_id uuid,
      metadata jsonb,
      ip_address text,
      user_agent text,
      created_at timestamptz
    )

**Append-only:** no UPDATE/DELETE policies.

### 13.2 Security Events (Dedicated)

    audit.security_events(
      id uuid pk,
      severity text,
      event_type text,
      actor_id uuid,
      metadata jsonb,
      created_at timestamptz
    )

### 13.3 Operational Monitoring (Minimum)

-   Error tracking (frontend + edge functions)
-   DB slow query monitoring
-   Storage access anomaly alerts
-   Auth failure rate alerts

------------------------------------------------------------------------

## 14) Secrets & Key Management

-   Secrets only in Supabase secrets / CI secure store.
-   Rotate keys on suspected compromise.
-   Separate keys per env (dev/staging/prod).
-   No secrets in `.env` committed; `.env.example` only.

------------------------------------------------------------------------

## 15) Secure SDLC (Investor-Friendly)

### 15.1 Dependencies

-   Lockfile committed.
-   Weekly dependency audit (automated).
-   Avoid unmaintained auth/crypto libs.

### 15.2 Testing Requirements

-   RLS tests (positive + negative)
-   RPC state machine tests
-   Edge function auth tests
-   Upload policy tests (bucket permissions)

### 15.3 Release Checklist (Hard Gate)

-   RLS coverage verified
-   Admin actions audited
-   Tier‑4 isolation validated
-   Signed URLs validated
-   Rate limits active for sensitive endpoints
-   No debug logs containing PII

------------------------------------------------------------------------

## 16) Incident Response (Operational Runbook)

1.  Identify scope (tables, buckets, functions)
2.  Rotate keys (anon/service role if exposed)
3.  Revoke sessions (force logout)
4.  Disable affected functions
5.  Patch & deploy
6.  Post-incident report stored in `audit.security_events`
7.  Notify stakeholders per policy

------------------------------------------------------------------------

## 17) Cursor Implementation Contract (How Agents Must Build)

For any new feature, Cursor must output: 1. DB impact
(tables/columns/indexes) 2. RLS impact (policies + helper functions) 3.
Edge impact (functions/RPC) 4. Storage impact (bucket/policy) 5. Audit
impact (what logs will be written) 6. Tests (minimum smoke tests)

------------------------------------------------------------------------

END OF DOCUMENT
