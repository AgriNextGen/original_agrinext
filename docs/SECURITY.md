# Security

## Secrets Handling
- Service-role key is used only in server-side Node scripts under `scripts/staging/*`.
- Browser client uses publishable key only (`src/integrations/supabase/client.ts`).
- No secrets are committed in repo docs or code.

## Environment Safety
- All staging scripts enforce project guard (`assertStagingEnvironment` in `scripts/staging/common.mjs`).
- Default allowed staging ref in automation: `rmtkkzfzdmpjlqexrbme`.
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
- Source: `supabase/functions/login-by-phone/index.ts`.

## Dummy Data Discipline
- Every automation run uses one deterministic `demo_tag`.
- Demo rows are either:
  - stored in `demo_tag` columns, or
  - marker-tagged in text fields (`[demo_tag]`) for cleanup.
- Rollback script supports dry-run and deletes only tag-scoped records.

## Open Security Unknowns
- Full live RLS policy SQL and trigger source are not available through REST-only access.
- Non-public schema policy details need SQL-catalog verification path.

## Weather Edge Function Security Notes
- `get-weather` is deployed with `--no-verify-jwt` to avoid gateway preflight/JWT verification blocking browser invocation.
- Security requirement (implemented in function): manual bearer-token validation against `GET /auth/v1/user` before any profile/weather lookup.
- Service-role key is used only inside the Edge Function runtime to:
  - read `profiles` location fields,
  - read/write `public.web_cache`.
- Browser never receives service-role credentials.
- Gemini (if enabled) is summary-only:
  - no secrets are logged,
  - Gemini failure must not fail weather response path.

## Runtime Smoke Safety
- New smoke scripts remain staging-only through `assertStagingEnvironment`.
- Smoke scripts use existing dummy credentials artifacts and anon/auth JWT paths for validation, not service-role reads for user-facing endpoints.
