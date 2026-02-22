# Features

## Existing Product Features (Observed)
- Public pages: landing/about/contact (`src/App.tsx`).
- Auth:
  - signup with role selection (`src/pages/Signup.tsx`)
  - phone/password login via edge function (`src/pages/Login.tsx`)
  - OAuth callback support (`src/pages/Auth/CallbackHandler.tsx`)
- Role dashboards and modules:
  - Farmer: crops, farmlands, listings, transport, orders, earnings.
  - Agent: today/tasks/farmers/transport/profile/service area.
  - Logistics: loads/trips/completed/vehicles/profile/service area.
  - Buyer: marketplace dashboard/browse/orders/profile.
  - Admin: dashboard + ops, data health, tickets, disputes, finance, jobs, AI pages.

## New Staging Delivery Features
- Server-side phone signup:
  - `signup-by-phone` edge function removes dependence on direct `/auth/v1/signup` quotas.
  - includes role gating, minimal-mode rate controls, and typed error codes.
  - files: `supabase/functions/signup-by-phone/index.ts`, `src/pages/Signup.tsx`
- Live staging baseline verifier:
  - checks public tables, non-public schema exposure, storage, and edge function endpoints.
  - file: `scripts/staging/verify-baseline.mjs`
- Dummy user provisioning (staging-only):
  - creates/aligns role users for farmer/agent/logistics/buyer/admin.
  - outputs credentials artifact.
  - file: `scripts/staging/provision-dummy-users.mjs`
- Rich role-wise seed data:
  - farmland/crop/listing/transport/order/agent/admin notification data.
  - demo-tagged for cleanup.
  - file: `scripts/staging/seed-dummy-data.mjs`
- Smoke test suite:
  - signup-by-phone checks, login-by-phone checks, session checks, role RPC checks,
    invalid-credential checks, restricted/locked checks.
  - file: `scripts/staging/smoke-phone-auth.mjs`
- Rollback:
  - dry-run counts and targeted cleanup by `demo_tag`.
  - auth user deletion as final step.
  - file: `scripts/staging/rollback-dummy-data.mjs`
- One-command execution:
  - file: `scripts/staging/run-all.mjs`
  - npm scripts added in `package.json`.

## Core Runtime Stabilization Features (Staging)
- Weather widget backend restored:
  - repo-managed `get-weather` Edge Function (Open-Meteo + `web_cache`)
  - optional Gemini summary enhancer (best-effort)
  - file: `supabase/functions/get-weather/index.ts`
- Buyer compact orders compatibility:
  - `list_orders_compact_v1` patched to work when `market_orders.total_amount` is absent
  - file: `supabase/migrations/202602281260_list_orders_compact_compat.sql`
- Farmer market widget schema synchronization:
  - `useMarketData` no longer assumes missing `state`/`fetched_at` columns
  - normalizes live `market_prices_agg` and `market_prices` rows to UI shape
  - file: `src/hooks/useMarketData.tsx`
- Optional forecast degradation:
  - missing `price_forecasts` table returns empty forecast list (no widget failure)
  - file: `src/hooks/useMarketData.tsx`
- Runtime smoke scripts for repeated staging verification:
  - `npm run staging:smoke-weather`
  - `npm run staging:smoke-buyer-orders`
  - `npm run staging:smoke-runtime-core`
