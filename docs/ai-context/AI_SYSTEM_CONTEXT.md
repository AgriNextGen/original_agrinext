# AI SYSTEM CONTEXT
## Project: AgriNext Agricultural Coordination Platform

This document provides the top-level system context for AI agents working in this repository.

All AI agents (Cursor, Claude, GPT, Copilot) should read this file first to understand the platform.

------------------------------------------------

# WHAT THIS PLATFORM IS

AgriNext Gen is a multi-role agricultural supply-chain coordination platform for Karnataka, India.

It connects:

- Farmers — crop records, listings, transport requests
- Agents — field verification, task management, farmer assignments
- Logistics partners — accept loads, execute trips with proof
- Buyers — browse listings, place market orders
- Vendors — agricultural input suppliers (fertilizer, seeds, pesticides)
- Admins — monitoring, data health, ops governance

The platform is NOT a marketplace. It is coordination infrastructure designed to:

- Reduce post-harvest losses
- Stabilise prices through predictive coordination
- Increase logistics efficiency via load aggregation and reverse logistics
- Improve farmer income via direct market access

------------------------------------------------

# TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui |
| State | TanStack Query v5 (React Query) + Dexie IndexedDB (offline) |
| Backend | Supabase (Postgres 17, Auth, Edge Functions, Storage) |
| Edge Functions | Deno runtime, jsr imports |
| Routing | React Router v6 |
| Forms | react-hook-form + zod |
| i18n | Custom hook (useLanguage) + en.ts / kn.ts |
| Charts | Recharts |
| Maps | Google Maps JS API Loader |
| Payments | Razorpay |
| AI | Google Gemini (via ai-gateway Edge Function) + ElevenLabs TTS |

There is NO separate backend server. The backend/ directory was deprecated and removed.

All server-side logic runs as Supabase Edge Functions or Postgres RPCs.

------------------------------------------------

# ARCHITECTURE PATTERN

The platform uses a frontend-services + Supabase architecture:

1. React frontend with role-based dashboards
2. Frontend service layer (src/services/) for domain logic
3. React hooks (src/hooks/) for data access via React Query
4. Supabase Edge Functions (Deno) for server-side operations
5. Supabase Postgres RPCs for transactional operations
6. RLS policies for row-level security at the database level

Data flow:

Page -> Hook (React Query) -> Service or Supabase RPC -> Postgres

State transitions always go through RPCs or Edge Functions.

------------------------------------------------

# AUTH SYSTEM

Authentication is phone-first, not email-based.

- Users sign up via phone + password
- Synthetic email format: 91XXXXXXXXXX@agrinext.local
- Auth handled by Edge Functions: signup-by-phone, login-by-phone
- JWT issued by Supabase Auth after Edge Function validates credentials
- Never use supabase.auth.signUp() with email on the frontend

------------------------------------------------

# DATABASE ARCHITECTURE

Three schema groups:

| Schema | Purpose |
|--------|---------|
| public | All operational app data (frontend via anon key + RLS) |
| secure | Tier-4 regulated data (Edge Functions only via service_role) |
| analytics | Aggregated reporting (admin Edge Functions) |

Key rules:

- Never expose service_role key to frontend
- All tables must have RLS enabled
- All state transitions must go through RPC or Edge Functions
- Tier-4 data stays in secure schema
- All sensitive actions must write audit logs
- No destructive migrations

------------------------------------------------

# LOGISTICS ENGINE

The logistics system is the platform backbone. It is a predictive coordination engine, not simple point-to-point delivery.

Location: src/services/logistics/

Pipeline flow:

shipment_requests -> route clustering -> load pools -> vehicle matching -> trip generation -> bookings -> reverse logistics scan

Vehicles are treated as round-trip assets (forward + return).

See AI_LOGISTICS_ENGINE.md for full details.

------------------------------------------------

# PLATFORM ROLES

| Role | Route Prefix | Dashboard |
|------|-------------|-----------|
| farmer | /farmer/* | Yes |
| agent | /agent/* | Yes |
| logistics | /logistics/* | Yes |
| buyer | /marketplace/* | Yes |
| admin | /admin/* | Yes |
| vendor | /vendor/* | Yes |

All routes are protected by ProtectedRoute with allowedRoles checks.

------------------------------------------------

# KEY CONSTRAINTS

- Region: Karnataka, India
- Languages: English + Kannada (bilingual)
- UX: Phone-first, PWA, low-bandwidth optimized
- Offline: All farmer-facing flows must work offline via IndexedDB + action queue
- Scale target: Millions of farmers, thousands of transport partners

------------------------------------------------

# RELATED CONTEXT FILES

Before making changes, AI agents should also read:

- AI_DATABASE_SCHEMA.md — canonical database schema
- AI_LOGISTICS_ENGINE.md — logistics engine architecture
- AI_WORKFLOW_RULES.md — development workflow rules
- AI_REPOSITORY_MAP.md — repository structure
- AI_TESTING_FRAMEWORK.md — testing standards
- AI_AUTONOMOUS_DEV_SYSTEM.md — autonomous development rules

Authoritative enterprise rules live in docs/all_imp_rules/:

- PRODUCT_OVERVIEW.md
- API_CONTRACTS.md
- ENTERPRISE_SECURITY_MODEL_V2_1.md
- ENTERPRISE_DATA_ARCHITECTURE.md
- ENTERPRISE_RLS_POLICY_MATRIX.md
- ENTERPRISE_EDGE_FUNCTION_STANDARD.md
- DEPLOYMENT_SOP.md
