# AI REPOSITORY MAP
## Project: AgriNext Agricultural Coordination Platform

This document describes the actual structure of the repository and the responsibilities of each folder.

All AI agents (Cursor, Claude, GPT, Copilot) must consult this map before modifying files.

The goal is to ensure consistent architecture and prevent code from being written in incorrect locations.

------------------------------------------------

# REPOSITORY OVERVIEW

The repository is a monorepo containing a React frontend application with a Supabase backend (Postgres + Edge Functions). There is no separate backend server.

The platform serves multiple actors:

- Farmer application
- Agent coordination tools
- Buyer marketplace
- Transport logistics platform
- Vendor supply distribution system
- Admin control center

The platform integrates:

- Farm data
- Marketplace operations
- Logistics orchestration
- Vendor distribution
- AI decision systems

------------------------------------------------

# ARCHITECTURE PATTERN

The platform follows a frontend-services + Supabase architecture:

1. React frontend (Vite + TypeScript)
2. Frontend service layer (src/services/) for domain logic
3. React hooks (src/hooks/) for data access via React Query
4. Supabase Edge Functions (Deno) for server-side logic
5. Supabase Postgres RPCs for transactional operations
6. RLS policies for row-level security

There is NO separate backend/ directory. The backend/ directory was deprecated and removed.

Data flow:

Page component -> Hook (React Query) -> Service or Supabase RPC -> Postgres

State transitions must go through RPCs or Edge Functions, never direct table updates.

------------------------------------------------

# TOP-LEVEL STRUCTURE

```
src/                     -- React frontend application
supabase/
  functions/             -- Edge Functions (Deno runtime)
  migrations/            -- Database migration files
tests/                   -- Test files (role-based organization)
docs/
  all_imp_rules/         -- Authoritative enterprise rules
  ai-context/            -- AI agent context documents
```

------------------------------------------------

# FRONTEND STRUCTURE

```
src/
  App.tsx                -- Router (100+ routes, role-based)
  main.tsx               -- React DOM entry
  index.css              -- Global Tailwind styles

  pages/                 -- Page components (75 files)
    farmer/              -- 11 farmer pages
    agent/               -- 9 agent pages
    logistics/           -- 14 logistics pages
    marketplace/         -- 5 buyer pages
    admin/               -- 24 admin pages
    vendor/              -- 8 vendor pages
    Auth/                -- Login, Signup, CallbackHandler
    Onboard/             -- RoleSelect
    common/              -- PendingSync, UploadsManager
    trace/               -- ListingTrace (public)

  routes/                -- Role-based route definitions
    farmerRoutes.tsx
    agentRoutes.tsx
    logisticsRoutes.tsx
    marketplaceRoutes.tsx
    adminRoutes.tsx
    vendorRoutes.tsx

  components/            -- UI components
    ui/                  -- shadcn/ui primitives (auto-generated, NEVER edit)
    shared/              -- Cross-role shared components
    farmer/              -- Farmer-specific components
    agent/               -- Agent-specific components
    logistics/           -- Logistics components
    admin/               -- Admin components
    marketplace/         -- Buyer components
    dashboard/           -- Dashboard layout components
    crop-diary/          -- Crop diary feature
    geo/                 -- Geography selectors
    listings/            -- Listing/traceability components
    layout/              -- PageShell
    dev/                 -- DevRoleSwitcher
    marketing/           -- Landing page sections

  hooks/                 -- 41 data hooks (React Query)
    useAuth.tsx           -- Auth context (critical)
    useLanguage.tsx       -- i18n context
    useFarmerDashboard.tsx
    useAgentDashboard.tsx
    useLogisticsDashboard.tsx
    useMarketplaceDashboard.tsx
    useAdminDashboard.tsx
    useVendorDashboard.tsx
    useTrips.tsx
    useUnifiedLogistics.tsx
    useVehicleRecommendations.tsx
    ... (and more)

  services/              -- Domain service layer
    logistics/           -- 13 logistics engine modules (see below)

  lib/                   -- Utilities and helpers
    routes.ts            -- Type-safe route constants (ROUTES.*)
    utils.ts             -- cn() Tailwind merge helper
    auth.ts              -- Auth utility functions
    readApi.ts           -- Supabase RPC query wrappers
    constants.ts         -- App-wide constants
    storage-upload.ts    -- Supabase Storage upload helpers
    offlineQueue.ts      -- Offline action queue
    error-utils.ts       -- Error formatting
    marketplaceApi.ts    -- Marketplace API helpers
    logistics/
      routeClusters.ts   -- Route clustering utilities

  layouts/
    DashboardLayout.tsx  -- Mobile-responsive dashboard shell

  i18n/                  -- Internationalization
    en.ts                -- English translations
    kn.ts                -- Kannada translations
    index.ts             -- Translation engine
    aliases.ts           -- Translation key aliases

  offline/               -- Offline-first support
    idb.ts               -- Dexie IndexedDB schema
    queryPersister.ts    -- React Query cache persistence
    actionQueue.ts       -- Queued mutations for offline
    uploadQueue.ts       -- Upload queue for offline
    network.ts           -- Network status detection

  integrations/
    supabase/
      client.ts          -- Supabase client (anon key only)
      types.ts           -- AUTO-GENERATED DB types (do not edit manually)
    googleMaps/
      loader.ts          -- Google Maps API loader

  types/
    domain.ts            -- App enum types
    api.ts               -- RPC response shapes
```

------------------------------------------------

# SERVICES DIRECTORY

Location: src/services/

Contains domain business logic. Services use static methods and call Supabase RPCs or queries.

Currently implemented:

src/services/logistics/ -- Logistics engine (13 modules)

Services must:
- contain business logic only
- not contain UI or HTTP logic
- use Supabase RPCs for state transitions
- be accessed through hooks, never directly from pages

------------------------------------------------

# LOGISTICS ENGINE

Location: src/services/logistics/

This is the core logistics coordination engine.

Modules:

| Module | Responsibility |
|--------|---------------|
| LogisticsOrchestratorService | Shipment creation, pooling, booking |
| TripManagementService | CRUD for unified trips, legs, capacity |
| LoadPoolingService | Cluster shipments, create/fill load pools |
| TripGenerationService | Create trips from pools |
| ReverseLogisticsService | Detect return trip opportunities |
| LogisticsMatchingEngine | Orchestrate full matching cycle |
| VehicleCapacityService | Track and allocate vehicle capacity |
| VehicleRecommendationService | Score and rank vehicles for pools |
| RouteClusterService | Route cluster detection and listing |
| LogisticsEventService | Append-only event logging |
| LegacyBridgeService | Bridge old transport_requests/trips to unified system |
| types.ts | Domain type definitions |
| index.ts | Barrel export |

Rules:

- All logistics flows must use shared domain entities
- Never create isolated logistics systems
- No UI code inside services
- All state transitions through RPCs

------------------------------------------------

# EDGE FUNCTIONS

Location: supabase/functions/

Runtime: Deno. Imports use jsr: prefix.

Shared utilities: supabase/functions/_shared/

| Utility | Purpose |
|---------|---------|
| cors.ts | CORS headers |
| errors.ts | successResponse() and errorResponse() |
| env.ts | Safe env var loading |
| request_context.ts | JWT parsing, user ID extraction |
| gemini_client.ts | Google Gemini API client |

Key functions:

| Function | Purpose |
|----------|---------|
| signup-by-phone | User registration |
| login-by-phone | Phone auth with rate limiting |
| logistics-orchestrator | Internal logistics orchestration (service role) |
| ai-gateway | AI request routing to Gemini |
| storage-sign-upload-v1 | Signed URL for uploads |
| storage-sign-read-v1 | Signed URL for reads |
| get-weather | Weather data |
| tts-elevenlabs | Text-to-speech |
| create-payment-order | Razorpay payment |
| payment-webhook | Razorpay webhook |
| job-worker | Background job processor |
| dev-switch-role | DEV ONLY: role switching |

Rules:

- Always check _shared/ before writing new utilities
- Use service_role for server-side DB writes
- Never expose service_role to frontend
- Standard response format: { success, data/error }
- dev-* functions are DEV ONLY

------------------------------------------------

# MIGRATIONS

Location: supabase/migrations/

Naming: YYYYMMDDHHmm_descriptive_name.sql

102 migration files exist.

Rules:

- Never delete production tables
- Use additive migrations
- Maintain backward compatibility
- Add indexes for high-frequency queries
- Regenerate types after: supabase gen types typescript --local > src/integrations/supabase/types.ts

------------------------------------------------

# FRONTEND ROUTING

Routes are defined in src/routes/ using React Router v6.

All role routes use:
- ProtectedRoute with allowedRoles check
- Lazy loading with Suspense
- RouteErrorBoundary for error handling
- ROUTES constants from src/lib/routes.ts

Route prefixes:

| Role | Prefix |
|------|--------|
| Farmer | /farmer/* |
| Agent | /agent/* |
| Logistics | /logistics/* |
| Buyer | /marketplace/* |
| Admin | /admin/* |
| Vendor | /vendor/* |

------------------------------------------------

# DASHBOARD LAYOUT

All dashboards use DashboardLayout (src/layouts/DashboardLayout.tsx):

- Desktop: fixed sidebar + main content
- Mobile: overlay sidebar + bottom tab bar
- Role-specific navigation via DashboardSidebar

Components:
- DashboardSidebar (src/components/dashboard/)
- DashboardHeader (src/components/dashboard/)
- BottomTabBar (src/components/dashboard/)

------------------------------------------------

# TESTS

Location: tests/

Organization: role-based directories

```
tests/
  logistics/    -- 28 files (engine, services, integration)
  admin/        -- 16 files
  agent/        -- 11 files
  farmer/       -- 12 files
  vendor/       -- 3 files
  chaos/        -- 10 files (resilience testing)
  unit/         -- 5 files
  playwright/   -- 1 file (E2E)
  p0/           -- 7 files (smoke tests)
```

------------------------------------------------

# DOMAIN OWNERSHIP

Each domain has clear boundaries.

User Domain:
profiles, user_roles, authentication

Farm Domain:
farmlands, crops, crop_activity_logs

Marketplace Domain:
listings, market_orders

Logistics Domain (Unified):
shipment_requests, shipment_items, load_pools, load_pool_members,
unified_trips, trip_legs, vehicle_capacity_blocks,
reverse_load_candidates, shipment_bookings, route_clusters

Logistics Domain (Legacy):
transport_requests, trips, transport_status_events

Vehicle Domain:
vehicles, transporters

Vendor Domain:
vendors, vendor_products, vendor_delivery_requests

Agent Domain:
agent_farmer_assignments, agent_tasks

AI agents must respect these domain boundaries.

------------------------------------------------

# FILE MODIFICATION SAFETY

When making changes, AI must:

1. Identify correct module
2. Avoid modifying unrelated domains
3. Maintain separation of concerns
4. Place services in src/services/
5. Place hooks in src/hooks/
6. Place pages in src/pages/{role}/
7. Place shared components in src/components/shared/
8. Never edit src/components/ui/ (auto-generated)
9. Never edit src/integrations/supabase/types.ts manually

------------------------------------------------

# LONG TERM ARCHITECTURE GOAL

The repository should evolve into a scalable coordination platform connecting:

Farmers, Agents, Buyers, Transporters, Vendors, Markets, Storage systems

The logistics engine acts as the backbone connecting all actors.

AI agents must preserve this architecture.
