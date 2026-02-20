\% AgriNext Gen --- Deployment & Operations SOP (Production Grade,
Investor-Ready) % Version 1.0 % Generated on 2026-02-19

# DEPLOYMENT_SOP.md

Status: Production-Grade\
Audience: Founders, Backend Engineers, DevOps, Security Reviewers\
Applies to: dev / staging / prod\
Depends on: ENTERPRISE_SECURITY_MODEL_V2_1.md,
ENTERPRISE_DATA_ARCHITECTURE.md, ENTERPRISE_RLS_POLICY_MATRIX.md,
ENTERPRISE_EDGE_FUNCTION_STANDARD.md, API_CONTRACTS.md

**Purpose:** Define a safe, repeatable deployment process for AgriNext
Gen that is migration-safe, secure, and investor-ready (auditable,
reproducible, rollback-capable).

------------------------------------------------------------------------

## 0) Guiding Principles (Non-Negotiable)

1.  **Production is immutable**: no manual edits in dashboard that
    aren't recorded as migrations.
2.  **No destructive changes**: schema changes are additive only (drop
    later when safe).
3.  **Staging is mandatory**: all migrations and functions go to staging
    before prod.
4.  **Secrets never in git**: secrets live only in Supabase secrets + CI
    vault.
5.  **RLS is a release gate**: no release if RLS/policies are missing.
6.  **Observability is required**: logs, alerts, and monitoring must be
    enabled in prod.
7.  **Rollback is planned**: every deployment includes a rollback
    strategy.

------------------------------------------------------------------------

## 1) Environments & Project Separation

### 1.1 Required Environments

You MUST maintain separate Supabase projects:

-   **dev** (local + personal testing)
-   **staging** (pre-prod mirror for QA)
-   **prod** (live system)

### 1.2 Environment Parity Rules

-   staging schema must match prod schema.
-   edge function versions must match prod versions.
-   configuration (auth providers, storage settings, RLS) must be
    replicated.

### 1.3 Naming Convention

-   `agrinext-dev`
-   `agrinext-staging`
-   `agrinext-prod`

------------------------------------------------------------------------

## 2) Source Control Requirements

### 2.1 Repos

Single monorepo recommended for MVP:

-   `src/` frontend
-   `supabase/` migrations + functions
-   `docs/` governance documents
-   `.github/` workflows

### 2.2 Branch Strategy (Simple & Safe)

-   `main` = production
-   `staging` = staging releases
-   `feature/*` = feature branches

### 2.3 Pull Request Rules

PR must include: - migration SQL (if DB change) - RLS policy updates (if
new table) - edge function updates (if API change) - test updates - docs
update (if behavior changes)

------------------------------------------------------------------------

## 3) Secrets & Configuration Management

### 3.1 Secrets Locations

Allowed: - Supabase secrets (Edge Functions) - CI/CD secure vault
(GitHub Actions secrets)

Forbidden: - committed `.env` - frontend bundle

### 3.2 Frontend Environment Variables

Only these may be in frontend: - `VITE_SUPABASE_URL` -
`VITE_SUPABASE_ANON_KEY`

Never expose: - `SUPABASE_SERVICE_ROLE_KEY` - payment provider secrets -
SMS provider secrets

### 3.3 Secret Rotation Policy

-   rotate quarterly (minimum)
-   rotate immediately after suspected exposure
-   record rotation event in audit/security events

------------------------------------------------------------------------

## 4) Database Migration SOP (Supabase CLI)

### 4.1 Migration Discipline

-   All changes are versioned files in `supabase/migrations/`
-   No manual schema edits in prod dashboard
-   Migrations are always forward-only and additive

### 4.2 Naming Convention

Use timestamp prefix:

-   `YYYYMMDDHHMMSS_description.sql` Example:
-   `20260219183000_create_trip_location_partitions.sql`

### 4.3 Migration Rules

Allowed: - add table - add column (nullable or with default) - add
index - add function/policy - add trigger - create partition tables

Forbidden in prod (unless planned migration window + strategy): - DROP
COLUMN - DROP TABLE - changing column types without a safe backfill plan

### 4.4 Migration Flow

1.  create migration locally
2.  apply to dev
3.  push to staging via CI
4.  run tests
5.  promote to prod

------------------------------------------------------------------------

## 5) RLS & Policy Release Gate

No deploy passes if: - new tables do not have RLS enabled - policies not
defined for SELECT - INSERT/UPDATE not explicitly controlled - secure
schema policies not locked down - audit schema not append-only

Add a CI script that checks: - RLS enabled on all public tables - policy
presence for key operations

------------------------------------------------------------------------

## 6) Edge Functions Deployment SOP

### 6.1 Function Config (verify_jwt)

All functions must be explicitly configured in `supabase/config.toml`.
No mismatches between local and deployed settings.

### 6.2 Versioning

-   all functions under `/functions/v1/*`
-   breaking changes under `/functions/v2/*`
-   maintain v1 for minimum deprecation window (90 days)

### 6.3 Deployment Flow

-   deploy to staging first
-   run smoke tests
-   deploy to prod

### 6.4 Secrets for Functions

Set secrets per environment:

-   `supabase secrets set --project-ref <ref> KEY=value`

Never reuse secrets across environments.

------------------------------------------------------------------------

## 7) Frontend Deployment SOP

### 7.1 Hosting

Recommended: Vercel or Netlify for speed.

### 7.2 Build Requirements

-   build uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
-   correct domain allowlisted in Supabase Auth redirect URLs
-   CORS allowlist in edge functions updated for prod domain

### 7.3 Release Flow

-   preview deployments for every PR
-   staging deployment for `staging` branch
-   production deployment for `main` branch

------------------------------------------------------------------------

## 8) Storage Bucket Setup SOP

### 8.1 Bucket Creation

Buckets must be created in each environment: - crop-photos -
trip-proofs - voice-notes - soil-reports - kyc-documents -
warehouse-documents

### 8.2 Bucket Policies

-   private buckets only
-   read/write via signed URLs
-   validate content types and size via edge functions

### 8.3 Migration Note

Bucket creation is not handled by SQL migrations (Supabase limitation).
Maintain `docs/STORAGE_SETUP.md` checklist and verify in staging/prod.

------------------------------------------------------------------------

## 9) Observability (Production Requirements)

### 9.1 Logging

-   Edge function logs enabled
-   Structured request_id in logs
-   No PII in logs

### 9.2 Monitoring

Minimum alerts: - high auth failure rate - edge function error rate
spike - db connection issues - storage anomaly (excess downloads)

### 9.3 Audit Trail

All sensitive events must be written to: - `audit.audit_logs` -
`audit.security_events`

------------------------------------------------------------------------

## 10) Testing & QA Gates

### 10.1 Required Test Types

-   RLS tests (positive + negative)
-   RPC state machine tests
-   Edge function auth tests
-   Smoke tests for critical flows:
    -   login
    -   create transport request
    -   accept load
    -   update trip status
    -   upload proof

### 10.2 Staging Validation

Before prod: - run full migration apply - run smoke tests - run RLS
coverage check - verify function verify_jwt config

------------------------------------------------------------------------

## 11) Rollback Strategy (Critical)

### 11.1 Frontend Rollback

-   redeploy previous commit
-   keep release tags

### 11.2 Edge Function Rollback

-   redeploy previous function version
-   keep v1 stable while testing v2

### 11.3 Database Rollback (Safe Method)

Database rollbacks are risky. Prefer: - forward-fix migrations
(hotfix) - feature flags to disable new features - add nullable fields
and backfill

If rollback required: - maintain a "down migration plan" doc per release
(manual) - only within maintenance window

------------------------------------------------------------------------

## 12) Release Checklist (Investor-Ready)

Before release to production:

-   [ ] All migrations applied cleanly in staging
-   [ ] RLS enabled + policies exist for new tables
-   [ ] secure schema still blocked from client
-   [ ] audit tables append-only verified
-   [ ] edge functions verify_jwt correct
-   [ ] rate limiting enabled for sensitive endpoints
-   [ ] idempotency verified on accept/confirm/webhooks
-   [ ] CORS allowlist correct for prod domain
-   [ ] storage buckets private + signed URL flow works
-   [ ] smoke tests pass
-   [ ] no secrets in repo
-   [ ] docs updated (if behavior changed)

------------------------------------------------------------------------

## 13) Operational Playbooks (Day-2 Ops)

### 13.1 Key Rotation

-   rotate secrets in staging first
-   deploy
-   rotate in prod
-   verify critical endpoints

### 13.2 Incident Response

-   disable affected edge functions
-   rotate keys
-   revoke sessions
-   create security event log entry
-   post-mortem report

### 13.3 Data Export Requests (Govt/Partners)

-   must be approved by admin
-   must log export event in audit schema
-   must anonymize if not legally required to share PII

------------------------------------------------------------------------

## 14) Cursor Contract (What must be output per deployment change)

For any deployment-affecting change, Cursor must output: 1. migration
file(s) 2. RLS policy changes 3. edge function changes + verify_jwt
config updates 4. secrets required (names only) 5. staging test steps 6.
rollback plan (forward-fix preferred)

------------------------------------------------------------------------

END OF DEPLOYMENT SOP
