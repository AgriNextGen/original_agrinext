# Prioritized Findings (Implemented + Remaining)

## Critical

### F-001: `finance-reconcile` internal endpoint lacked access control

- Evidence: prior handler used service role without JWT or worker-secret checks.
- Impact: public callers could enqueue privileged reconciliation jobs.
- Status: Fixed in `supabase/functions/finance-reconcile/index.ts` (POST-only + `x-worker-secret` + structured errors).

### F-002: Duplicate Edge Function handlers in single files

- Evidence: duplicate `Deno.serve(...)` blocks in:
  - `supabase/functions/create-payment-order/index.ts`
  - `supabase/functions/payment-webhook/index.ts`
  - `supabase/functions/job-worker/index.ts`
- Impact: deployment/runtime ambiguity, stale logic shadowing, non-deterministic behavior.
- Status: Fixed; single handler retained per file and enforced by repo check script.

## High

### F-003: Dev tooling endpoints lacked allowlist/admin enforcement (role override)

- Evidence: `dev-get-active-role` / `dev-switch-role` previously required auth + feature flag but not allowlist/admin.
- Impact: any authenticated user in enabled env could potentially access developer UX overrides.
- Status: Fixed via allowlist/admin checks in both endpoints.

### F-004: `/dev-console` route exposed in all builds

- Evidence: route was present unconditionally in `src/App.tsx`.
- Impact: accidental production discovery of dev tool UI.
- Status: Fixed with non-production + feature-flag gating and admin-only `ProtectedRoute`.

### F-005: Implicit Edge Function JWT verification settings

- Evidence: no explicit `[functions.*] verify_jwt` entries in `supabase/config.toml`.
- Impact: local/deployed mismatch risk and auth posture drift.
- Status: Fixed with explicit matrix + coverage check script.

## Medium

### F-006: Missing shared helper imports for payment/admin functions

- Evidence: `_shared/env.ts` imports existed, helper file absent from active `supabase/functions/_shared`.
- Impact: deployment/runtime failure.
- Status: Fixed by restoring `_shared/env.ts` (plus `cors.ts`, `errors.ts` for consistency).

### F-007: Client-side dev secret usage pattern (`VITE_DEV_TOOLS_SECRET`)

- Evidence: browser code added `x-dev-secret` header from client env.
- Impact: false sense of secrecy; client-bundled values are not secret.
- Status: Mitigated by removing browser header injection and documenting deprecation.

## Additional Hardening Completed (SQL Phase)

### F-008: Job queue worker RPCs callable by `authenticated`

- Evidence: `worker_fetch_and_lock_jobs_v1` / `job_update_after_attempt_v1` were granted to `authenticated`.
- Impact: authenticated users could interfere with queue processing / job state.
- Status: Mitigated with additive migration restricting grants to `service_role` and adding explicit body guards.

### F-009: Webhook apply RPCs granted to `public`

- Evidence: `public.payment_apply_webhook_event_v1` and `secure.apply_gateway_state_v1` had `GRANT EXECUTE ... TO public`.
- Impact: high-risk invocation surface for payment state mutation paths.
- Status: Mitigated with additive migration tightening grants and requiring `service_role` or admin in function bodies.

### F-010: Overly broad `enqueue_job_v1` authenticated access

- Evidence: any authenticated caller could enqueue arbitrary job types.
- Impact: privileged job injection / abuse path.
- Status: Mitigated with additive migration allowing user-originated safe jobs only (`ai_search_intent_v1`, `ai_ticket_triage_v1`) and requiring admin/service role otherwise.

## Remaining / Follow-up

1. Broader SQL audit and targeted additive migrations for SECURITY DEFINER + grant hygiene across all migrations.
2. Deployment verification of actual live `verify_jwt` settings and function source parity with repo.
3. Optional stronger internal endpoint CORS minimization across all non-browser functions.
