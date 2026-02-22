# Architecture

## Scope and Stack
- Frontend is `Vite + React 18 + TypeScript`, not Next.js (`package.json`, `vite.config.ts`).
- Routing uses React Router with role-protected routes (`src/App.tsx`).
- State/query layer uses TanStack Query (`src/App.tsx`, `src/lib/readApi.ts`).
- UI stack is Tailwind + Radix/shadcn primitives (`tailwind.config.ts`, `src/components/ui/*`).
- Backend is Supabase (Auth, PostgREST, Storage, Edge Functions) via JS client (`src/integrations/supabase/client.ts`).

## High-Level Repo Map
- `src/pages/*`: role dashboards and feature pages.
- `src/hooks/*`: auth/session, dashboard query hooks, domain operations.
- `src/integrations/supabase/*`: typed Supabase client and generated DB types.
- `supabase/migrations/*`: SQL-first schema/RLS/function evolution.
- `supabase/functions/*`: Edge functions (phone signup/login, storage signing, worker flows).
- `scripts/staging/*`: staging verification, dummy provisioning, seeding, smoke tests, rollback.

## Architecture Decisions (Observed)
- Client app authenticates with Supabase auth session and role checks (`src/hooks/useAuth.tsx`, `src/components/ProtectedRoute.tsx`).
- Phone signup and login are implemented through Edge Functions (`signup-by-phone`, `login-by-phone`) and client session token handoff (`src/pages/Signup.tsx`, `src/pages/Login.tsx`).
- Synthetic auth email is derived from normalized phone for deterministic phone-password auth (`src/lib/auth.ts`, `supabase/functions/signup-by-phone/index.ts`).
- Data reads/writes are mostly direct Supabase client calls and RPC calls (`src/lib/readApi.ts`, role hooks/pages).
- Role routing is explicit and centralized (`src/App.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`).

## Current Data Access Pattern
- Browser-side typed client: `createClient<Database>()` using `VITE_SUPABASE_URL` and publishable key (`src/integrations/supabase/client.ts`).
- RPC wrapper for read/mutate operations: `rpcJson`/`rpcMutate` (`src/lib/readApi.ts`).
- Edge functions invoked by `fetch` for privileged flows (examples: `signup-by-phone`, `login-by-phone`).
- Staging automation uses service-role only in Node scripts under `scripts/staging/*`.

## Current Auth Pattern
- Signup: `POST /functions/v1/signup-by-phone` (server-side user creation + guardrails), then `supabase.auth.setSession(...)` (`src/pages/Signup.tsx`, `supabase/functions/signup-by-phone/index.ts`).
- Login by phone/password: call `functions/v1/login-by-phone`, then `supabase.auth.setSession` (`src/pages/Login.tsx`).
- Session/role bootstrap in `AuthProvider` by reading `user_profiles` (`src/hooks/useAuth.tsx`).
- Route guarding by `ProtectedRoute` role checks (`src/components/ProtectedRoute.tsx`).

## Migration and Type Strategy
- SQL migrations live in `supabase/migrations/*.sql`.
- Generated TypeScript contract lives at `src/integrations/supabase/types.ts`.
- Signup hardening migrations:
  - `supabase/migrations/202602281230_signup_guardrails.sql`
  - `supabase/migrations/202602281240_dashboard_rpc_compat.sql`
- Workflow evidence currently includes targeted GitHub workflow using `psql` + `DATABASE_URL` secrets (`.github/workflows/apply-phase-e2.yml`).
- Type generation command is not explicitly codified in this repo (`UNKNOWN`); file header indicates generated output.

## Risks / Unknowns
- MCP catalog access for full live schema/RLS introspection is currently unavailable in this session (`UNKNOWN`).
- Non-public schemas (`secure`, `audit`, `analytics`) are not REST-exposed and need SQL-level verification for contract certainty (`artifacts/staging/baseline-live.json`).
- Worktree has many unrelated migration diffs; keep feature changes isolated to avoid accidental drift.

## Core Runtime Stabilization Additions

### Weather Data Flow (Farmer Dashboard)
- UI caller: `src/components/farmer/WeatherWidget.tsx`
- Backend: `supabase/functions/get-weather/index.ts`
- Auth model:
  - browser passes session bearer token
  - edge function validates token manually (`/auth/v1/user`)
  - function uses service-role for profile lookup + cache writes
- Provider pipeline:
  - profile location (`pincode` / `village+district` / `district` / `location`)
  - Open-Meteo geocoding (lat/lon)
  - Open-Meteo current weather + daily summary
  - optional Gemini short summary enhancement (best-effort only)
- Cache layer:
  - `public.web_cache` with `topic='weather'`
  - fresh TTL 30 minutes, stale-serve up to 2 hours on upstream failure

### Market Data Compatibility Layer
- `src/hooks/useMarketData.tsx` now normalizes live staging schema to UI contract:
  - `market_prices_agg.avg_price -> modal_price`
  - `market_prices_agg.date -> fetched_at`
  - synthetic `state='Karnataka'`, default `unit='qtl'`
- `price_forecasts` is treated as optional until a real backend table/pipeline is present.

### Runtime Verification Tooling
- Added targeted staging smoke scripts for:
  - weather function (`scripts/staging/smoke-weather.mjs`)
  - buyer compact orders RPC (`scripts/staging/smoke-buyer-orders.mjs`)
  - combined core runtime checks (`scripts/staging/smoke-runtime-core.mjs`)
