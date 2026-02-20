# Backend → Supabase Migration

**Status:** ✅ Complete  
**Date:** 2026-02-16

## Summary

The AgriNext frontend now uses **Supabase exclusively**. The Express backend (`backend/`) is deprecated and no longer required for the app to function.

## What Was Done

### 1. Supabase Schema (MCP Project: `rmtkkzfzdmpjlqexrbme`)

- **Full schema migration** applied to the MCP-connected Supabase project
- Tables: `profiles`, `user_roles`, `farmlands`, `crops`, `transport_requests`, `trips`, `transporters`, `vehicles`, `buyers`, `listings`, `market_orders`, `notifications`, `agent_tasks`, `agent_farmer_assignments`, `agent_data`, `agent_activity_logs`, `agent_visits`, `agent_voice_notes`, `admin_users`, `soil_test_reports`, `trace_attachments`, `crop_media`, `crop_activity_logs`, `market_prices`, `market_prices_agg`, `karnataka_districts`, and supporting tables
- **RLS policies** for role-based access (farmer, agent, transporter, buyer, admin)
- **Auth trigger** to auto-create `profiles` on signup
- **Storage buckets:** `soil-reports`, `crop-media`, `traceability-media`, `voice_media`, `trip-proofs`
- **Roles seeded:** super_admin, state_admin, district_admin, field_agent, farmer, transporter, buyer, storage_manager

### 2. Frontend Configuration

- `.env` updated to point to the new Supabase project:
  - `VITE_SUPABASE_URL`: https://rmtkkzfzdmpjlqexrbme.supabase.co
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: (anon key)
  - `VITE_SUPABASE_PROJECT_ID`: rmtkkzfzdmpjlqexrbme

### 3. Backend Deprecation

- The Express backend (`backend/`) was a contract stub returning `501 NOT_IMPLEMENTED` for all non-auth routes
- The frontend **never called** the backend; it used Supabase directly
- Auth: Frontend uses `supabase.auth.signUp` / `signInWithPassword` (email/password)
- Data: All CRUD via Supabase client (`supabase.from(...)`)

## Running the App

```bash
# Frontend only (no backend needed)
npm install
npm run dev
```

Open http://localhost:8080 (or the port Vite assigns).

## Edge Functions (Optional)

The frontend references several Edge Functions (e.g. `marketplace-ai`, `transport-ai`, `admin-ai`, `seed-test-data`). These are **not** deployed to the new Supabase project yet. If you need them:

1. Deploy Edge Functions via Supabase MCP or CLI
2. Or replace with direct Supabase queries where possible

## Regenerating Types

After schema changes:

```bash
npx supabase gen types typescript --project-id rmtkkzfzdmpjlqexrbme > src/integrations/supabase/types.ts
```

Or use the Supabase MCP `generate_typescript_types` tool.
