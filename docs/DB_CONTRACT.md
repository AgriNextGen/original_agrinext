# DB Contract

## Baseline (Staging Verification)
- Verified at: `2026-02-22T03:18:46Z`
- Project URL: `https://rmtkkzfzdmpjlqexrbme.supabase.co`
- Baseline artifact: `artifacts/staging/baseline-live.json`

## Core Entity Groups
- Identity and role:
  - `profiles` (user identity/profile metadata)
  - `user_roles` (single active role mapping)
  - `user_profiles` (multi-profile model support)
  - `app_config` (runtime signup/login controls)
  - `signup_attempts` (signup telemetry + guard outcomes)
- Farmer domain:
  - `farmlands`, `crops`, `listings`, `transport_requests`
- Logistics domain:
  - `transporters`, `vehicles`, `trips`, `transport_status_events`
- Buyer/market domain:
  - `buyers`, `market_orders`
- Agent/admin support:
  - `agent_farmer_assignments`, `agent_tasks`, `agent_visits`, `agent_voice_notes`, `admin_users`
- Ops/support:
  - `notifications`, `support_tickets`, `job_queue`, `job_runs`, `files`, `disputes`

## Relationship Intent (High-Level)
- `profiles.id` maps to auth user id.
- `user_roles.user_id` links each authenticated user to one app role.
- Domain tables reference user ids and role-specific ids (`buyers.id`, `transporters.id`, etc.).
- Workflow tables (`trips`, `transport_status_events`, `market_orders`) tie role dashboards together.
- `app_config` drives signup gates (`SIGNUP_ENABLED`, role-open flags, limit and blocklist keys).
- `signup_attempts` stores request-level signup outcomes for operations review and rollback audit.

## RLS Contract Principles
- All client-side access is assumed through authenticated JWT (`anon` + user token), never service role.
- Writes to critical state transitions should occur via RPC/Edge Function when business invariants apply.
- Role-based visibility must enforce:
  - owner visibility by `auth.uid()`,
  - explicit admin overrides,
  - deny-by-default for unrelated roles.
- Non-public schemas (`secure`, `audit`, `analytics`) must stay non-REST-exposed.
- `signup_attempts` is admin-readable only; insert path is service/privileged edge path.

## Signup Guard Contract
- Guard evaluator function: `security.evaluate_signup_guard_v1(...)`.
- Inputs: role, normalized phone, request id, client IP.
- Decision outputs: `allowed`, `error_code`, `reason`.
- Runtime controls in `app_config`:
  - `SIGNUP_ENABLED`
  - `SIGNUP_MINIMAL_MODE`
  - `SIGNUP_MAX_PER_IP_5M`
  - `SIGNUP_MAX_PER_PHONE_1H`
  - `SIGNUP_BLOCKED_PHONE_PREFIXES`
  - `SIGNUP_BLOCKED_IP_PREFIXES`
- Existing `public.consume_rate_limit(...)` is used for guard token windows.

## Dashboard RPC Compatibility Contract
- Canonical RPCs:
  - `farmer_dashboard_v1`
  - `agent_dashboard_v1`
  - `logistics_dashboard_v1`
  - `buyer_dashboard_v1`
  - `admin_dashboard_v1`
- Compatibility helpers:
  - `public._column_exists(...)`
  - `public._dashboard_unread_notifications_count(...)`
- Contract rule: RPCs must not fail when optional drift columns are absent (`total_amount`, `read_at`, `pickup_village`, `secure.payment_events.event_type`).

## Per-Table Demo Data Contract
- Demo inserts must carry `demo_tag` where column exists.
- Tables without `demo_tag` use `[demo_tag]` marker in text fields for rollback matching.
- Auth users are tagged via `user_metadata.demo_tag`.
- Rollback must be dependency-safe and tag-scoped (`scripts/staging/rollback-dummy-data.mjs`).

## Verified / Unknown
- Verified reachable public tables: see `tables.public` in `artifacts/staging/baseline-live.json`.
- Verified non-public schemas are not exposed in REST (`406 Invalid schema`).
- `UNKNOWN`:
  - exact RLS policy bodies per table,
  - trigger definitions and execution paths,
  - catalog-level constraints/indexes not exposed via REST.

## Core Runtime Compatibility Additions (Staging)
- `public.district_neighbors` (compat table):
  - purpose: unblock farmer market widget neighbor lookup
  - migration: `supabase/migrations/202602281250_district_neighbors_compat.sql`
  - access: authenticated `SELECT` only (RLS enabled)
- `public.list_orders_compact_v1` (compat patch):
  - function updated to avoid hard dependency on `market_orders.total_amount`
  - migration: `supabase/migrations/202602281260_list_orders_compact_compat.sql`
- `public.web_cache` usage contract for weather:
  - `topic='weather'`
  - `cache_key='weather:<normalized-location-key>'`
  - `location_key` stores normalized district/pincode token
  - `data` stores weather payload envelope (`provider`, `summary_provider`, `payload`)
  - `fetched_at` is cache freshness source

## Market Data Compatibility Expectations
- `market_prices_agg` live columns used by frontend compatibility layer:
  - `avg_price`, `date`, `district`, `crop_name`, `created_at`, `trend_direction`
- `market_prices` live columns used by fallback:
  - `crop_name`, `district`, `date`, `modal_price`, `min_price`, `max_price`, `mandi_name`, `created_at`
- `price_forecasts`:
  - currently optional in staging runtime
  - frontend must degrade to `[]` on `PGRST205` (no table) without failing widget render
