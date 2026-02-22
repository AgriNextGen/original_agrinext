# API Contract

## Auth APIs

### Signup By Phone (Primary)
- Endpoint: `POST /functions/v1/signup-by-phone`
- Caller: browser signup page and smoke script.
- Request:
  - `role: farmer|agent|logistics|buyer|admin`
  - `phone: string` (normalized to E.164)
  - `password: string`
  - `full_name: string`
  - `email?: string` (optional, otherwise synthetic email is derived from phone)
  - `profile_metadata?: { village?: string; district?: string; preferred_language?: string }`
- Success response (`201`):
  - `ok: true`
  - `user_id: uuid`
  - `role`, `phone`, `auth_email`
  - `dashboard_route`
  - `access_token`, `refresh_token`, `expires_in`
  - `request_id`
- Failure response:
  - `ok: false`
  - `error_code: PHONE_ALREADY_EXISTS|EMAIL_ALREADY_EXISTS|ROLE_CLOSED|SIGNUP_DISABLED|RATE_LIMITED|VALIDATION_ERROR|INTERNAL`
  - `message`, `request_id`
- Source:
  - `supabase/functions/signup-by-phone/index.ts`
  - `src/pages/Signup.tsx`

### Login By Phone
- Endpoint: `POST /functions/v1/login-by-phone`
- Request:
  - `phone: string`
  - `password: string`
  - `role: farmer|agent|logistics|buyer|admin` (UI sends role)
- Response success:
  - `access_token: string`
  - `refresh_token: string`
  - `expires_in: number`
- Response failures:
  - `401 Invalid credentials`
  - `403 account_locked`
  - `429 temporarily_blocked`
- Function source: `supabase/functions/login-by-phone/index.ts`
- Client integration: `src/pages/Login.tsx`

## Staging Provisioning Contracts
- Source of truth: `scripts/staging/contracts.mjs`

### `SignupByPhoneRequestSchema`
- `role`, `phone`, `password`, `full_name`, optional `email`, optional `profile_metadata`

### `SignupByPhoneResponseSchema`
- Union of success and typed error payload, including `SignupErrorCodeSchema`

### `CreateDummyUserRequestSchema`
- `role`, `phone`, `password`, `full_name`, `dashboard_path`, `profile_metadata`

### `SeedProfileDataRequestSchema`
- `demo_tag`
- `users[]` (`user_id`, `role`, `phone`)
- `richness` (`minimal|standard|rich`)

### `SmokeTestResultSchema`
- `executed_at`, `demo_tag`, `project_url`
- `summary` (`total_steps`, `passed_steps`, `failed_steps`)
- `steps[]` with role/step/status/result
- `evidence` (signup outputs and role matrix)

## Staging Automation Entry Points
- `scripts/staging/verify-baseline.mjs`
- `scripts/staging/provision-dummy-users.mjs`
- `scripts/staging/seed-dummy-data.mjs`
- `scripts/staging/smoke-phone-auth.mjs`
- `scripts/staging/rollback-dummy-data.mjs`
- Orchestrator: `scripts/staging/run-all.mjs`

## Expected Credentials Artifact
- File: `artifacts/staging/demo-users-<demo_tag>.json`
- Contains role, phone, password, user_id, dashboard route.
- Explicitly marked as dummy-only staging data.

## Runtime Stabilization APIs (Core)

### Weather (Farmer Widget Backend)
- Endpoint: `POST /functions/v1/get-weather`
- Deploy mode: `--no-verify-jwt` (manual auth inside function)
- Caller: `src/components/farmer/WeatherWidget.tsx` via `supabase.functions.invoke('get-weather')`
- Auth:
  - Browser sends `Authorization: Bearer <session_access_token>`
  - Function validates token against `GET /auth/v1/user`
- Success response (`200`):
  - `cached: boolean`
  - `stale?: boolean`
  - `cache_age_minutes?: number`
  - `message?: string`
  - `data?: { temp_c, humidity, wind_kmh, description, icon, forecast_short, fetched_at, location }`
- Provider strategy:
  - factual weather source: Open-Meteo
  - optional summary enhancer: Gemini (`WEATHER_SUMMARY_PROVIDER=gemini`, best-effort only)
- Source: `supabase/functions/get-weather/index.ts`

### Buyer Compact Orders RPC (Compatibility)
- Endpoint: `POST /rest/v1/rpc/list_orders_compact_v1`
- Contract:
  - request: `{ p_limit?: int, p_cursor?: { updated_at, id } | null }`
  - response: `{ items: any[], next_cursor: { updated_at, id } | null }`
- Compatibility behavior:
  - `total_amount` is derived when `market_orders.total_amount` column is absent
  - supports fallback expressions from `qty*unit_price` or `quantity*price_agreed`
- Migration patch: `supabase/migrations/202602281260_list_orders_compact_compat.sql`

## Additional Staging Runtime Smoke Entry Points
- `scripts/staging/smoke-weather.mjs`
- `scripts/staging/smoke-buyer-orders.mjs`
- `scripts/staging/smoke-runtime-core.mjs`

## Weather Deploy / Runtime Runbook (Staging)
- Deploy command:
  - `npx supabase functions deploy get-weather --project-ref rmtkkzfzdmpjlqexrbme --no-verify-jwt --use-api`
- Required runtime env names (Supabase function secrets):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - optional `gemini_api_key`
  - optional `WEATHER_SUMMARY_PROVIDER` (`gemini` to enable Gemini summary generation)
- Staging verify sequence after deployment:
  - apply DB compat migration(s)
  - regenerate `src/integrations/supabase/types.ts`
  - `npm run typecheck`
  - `npm run staging:smoke-weather -- --users-file <artifact>`
  - `npm run staging:smoke-runtime-core -- --users-file <artifact>`
