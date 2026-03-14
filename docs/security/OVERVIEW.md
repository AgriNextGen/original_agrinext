# Security Overview

> Canonical enterprise security model: `docs/all_imp_rules/ENTERPRISE_SECURITY_MODEL_V2_1.md`
> Threat model: `docs/security/THREAT_MODEL.md`
> Prioritized findings: `docs/security/PRIORITIZED_FINDINGS.md`

## Secrets Handling

- Service-role key is used only in server-side Node scripts under `scripts/staging/*`.
- Browser client uses publishable key only (`src/integrations/supabase/client.ts`).
- No secrets are committed in repo docs or code.

## Environment Safety

- All staging scripts enforce project guard (`assertStagingEnvironment` in `scripts/staging/common.mjs`).
- Override requires explicit env flags (`STAGING_ALLOWED_REFS`, `STAGING_ALLOWED_HOSTS`, or `ALLOW_NON_STAGING=true`).

## Privilege Boundaries

- Client auth/session uses anon/auth JWT paths (`src/pages/Login.tsx`, `src/hooks/useAuth.tsx`).
- Client signup uses public edge endpoint only (`functions/v1/signup-by-phone`), never service role in browser.
- Privileged provisioning/cleanup uses service role only from local scripts.
- RLS remains authoritative for user-facing reads/writes.

## Signup Hardening Controls

- Signup is server-mediated (`supabase/functions/signup-by-phone/index.ts`), not direct `auth.signUp`.
- Guard and kill-switch layer:
  - `security.evaluate_signup_guard_v1(...)`
  - `app_config` keys (`SIGNUP_ENABLED`, role-open flags, limit keys, blocked prefix keys)
  - existing `public.consume_rate_limit(...)` counters
- Minimal-friction policy in normal operation:
  - high default thresholds in minimal mode
  - instant emergency shutoff via `SIGNUP_ENABLED=false`
- Signup audit telemetry:
  - table `public.signup_attempts` with request id, phone hash, ip prefix, role, status/error code.

## Login Security Controls

- `login-by-phone` performs status checks before token grant:
  - locked account => `403`
  - temporarily blocked => `429`
  - invalid credentials => `401`
- Failed logins call security RPC (`security.record_failed_login_v1`) for rate-limit/risk logic.

## Dummy Data Discipline

- Every automation run uses one deterministic `demo_tag`.
- Demo rows are either stored in `demo_tag` columns or marker-tagged in text fields.
- Rollback script supports dry-run and deletes only tag-scoped records.

## Hardening Updates

- Internal reconciliation trigger endpoint (`finance-reconcile`) is worker-secret protected and POST-only.
- Dev role endpoints enforce admin/dev allowlist checks when enabled.
- Frontend `/dev-console` route is gated to non-production + dev-tools-enabled builds and admin users.
- Edge Function `verify_jwt` settings are explicitly declared in `supabase/config.toml`.
- Job worker/webhook RPC paths are tightened via additive SQL hardening migrations.
- Client-side `VITE_DEV_TOOLS_SECRET` usage is deprecated and no longer used by the app auth hook.

## Weather Edge Function Security Notes

- `get-weather` is deployed with `--no-verify-jwt` for browser invocation compatibility.
- Manual bearer-token validation against `GET /auth/v1/user` is performed before any profile/weather lookup.
- Service-role key is used only inside the Edge Function runtime (read `profiles` location fields, read/write `web_cache`).
- Browser never receives service-role credentials.

## Runtime Smoke Safety

- Smoke scripts remain staging-only through `assertStagingEnvironment`.
- Smoke scripts use existing dummy credentials artifacts and anon/auth JWT paths for validation.
