# AgriNext Threat Model (Repo-Grounded)

## Scope

- Frontend app (`src/*`) with Supabase Auth and role-based routes
- Supabase Edge Functions (`supabase/functions/*`)
- Supabase SQL migrations / RPCs (`supabase/migrations/*`)
- Supabase config (`supabase/config.toml`)

Excluded:

- Deprecated Express backend (`backend/`)
- External infrastructure config not present in repo (CDN/WAF/runtime headers)

## Primary Assets

- Supabase service-role credentials used inside Edge Functions
- Auth sessions (JWT access/refresh tokens)
- Payment state / webhook processing integrity
- Job queue / worker execution integrity
- Admin and developer tooling controls
- PII in profiles, KYC, finance/ops records

## Trust Boundaries

1. Browser -> Supabase Edge Functions
2. External payment provider -> `payment-webhook`
3. Internal schedulers/workers -> `job-worker`, `finance-cron`, `finance-admin-api`, `finance-reconcile`
4. Edge Functions (service-role) -> Postgres / Storage / Auth Admin
5. Authenticated app users -> PostgREST/RPC under RLS

## Key Entry Points

- `signup-by-phone`, `login-by-phone`, `get-weather` (manual auth / bootstrap flows)
- `create-payment-order`, `payment-webhook`
- `job-worker`, `finance-cron`, `finance-admin-api`, `finance-reconcile`
- Dev tooling endpoints (`dev-*`) and `/dev-console`

## Highest-Risk Abuse Paths (Observed / Mitigated in This Hardening Pass)

1. Public invocation of service-role internal function (`finance-reconcile`) to enqueue privileged finance jobs.
2. Runtime ambiguity / breakage from duplicate Edge Function handlers in single source files (`create-payment-order`, `payment-webhook`, `job-worker`).
3. Dev tooling endpoint use in enabled environments by non-allowlisted users.
4. Config drift from missing explicit `verify_jwt` declarations across Edge Functions.
5. Accidental production exposure of `/dev-console` route in frontend builds.

## Existing Controls (Observed)

- Signup/login server mediation with guardrails, rate limits, and audit telemetry
- Payment webhook signature verification
- Worker secret checks on several internal functions (`job-worker`, `finance-cron`, `finance-admin-api`)
- RLS-heavy schema design with many SECURITY DEFINER RPCs

## Hardening Focus Implemented

- Fail-closed worker-secret enforcement for `finance-reconcile`
- Duplicate handler removal and edge-source integrity checks
- Explicit Edge Function `verify_jwt` matrix in `supabase/config.toml`
- Dev endpoint allowlist/admin enforcement and production route gating

## Residual Risks / Follow-up

- Full SQL audit still required for all SECURITY DEFINER functions, grants, and dynamic SQL patterns
- Deployed runtime config/source may drift from repo and must be verified in staging/prod
- Some test coverage remains integration-dependent on live deployed functions

