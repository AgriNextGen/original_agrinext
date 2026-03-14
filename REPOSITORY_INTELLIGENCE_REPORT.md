# REPOSITORY INTELLIGENCE REPORT
## AgriNext Gen — Phase 1 Architecture Audit

> Generated: 2026-03-14
> Scope: Full repository reverse-engineering scan
> Purpose: Architectural understanding for future improvement phases
> Status: READ-ONLY — no code was modified

---

## 1. System Overview

**AgriNext Gen** is a multi-role agricultural supply-chain coordination platform built for Karnataka, India. It is not a marketplace — it is **coordination infrastructure** connecting five distinct actors across the farm-to-market lifecycle.

| Dimension | Details |
|-----------|---------|
| Region | Karnataka, India |
| Languages | English + Kannada (bilingual) |
| Device Target | Mobile-first PWA (low-bandwidth rural users) |
| Auth Model | Phone-first (no real email) |
| Deployment | Supabase cloud + Vercel/static SPA |

### Core Platform Philosophy
- Reduce post-harvest losses through coordination
- Stabilise prices via predictive load pooling
- Improve logistics efficiency (reverse logistics, multi-stop trips)
- Connect farmers directly to buyers and logistics partners

### Roles at a Glance

| Role | Core Purpose | Route Prefix |
|------|-------------|--------------|
| `farmer` | Crop records, listings, transport requests | `/farmer/*` |
| `agent` | Field verification, farmer assignment management | `/agent/*` |
| `logistics` | Accept loads, execute trips with proof | `/logistics/*` |
| `buyer` | Browse listings, place market orders | `/marketplace/*` |
| `admin` | System monitoring, ops governance | `/admin/*` |
| `vendor` | Supply agricultural inputs | `/vendor/*` (planned) |

---

## 2. Technology Stack

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.19 |
| Language | TypeScript | 5.8.3 |
| Styling | Tailwind CSS | 3.4.17 |
| UI Components | shadcn/ui (Radix UI) | 40+ primitives |
| Routing | React Router | v6.30.1 |
| Server State | TanStack Query (React Query) | v5.83.0 |
| Forms | react-hook-form + zod | 7.61.1 / 3.25.76 |
| Offline Cache | Dexie (IndexedDB) | 4.3.0 |
| Charts | Recharts | 2.15.4 |
| Icons | lucide-react | 0.462.0 |
| Dates | date-fns | 3.6.0 |
| Toasts | Sonner | 1.7.4 |
| Carousel | embla-carousel-react | 8.6.0 |
| QR Codes | qrcode.react | 4.2.0 |

### Backend

| Layer | Technology | Details |
|-------|-----------|---------|
| Database | PostgreSQL 17 | via Supabase |
| Auth | Supabase Auth | Phone-first, JWT, session refresh |
| Edge Functions | Deno runtime | jsr: imports, 24 functions deployed |
| Storage | Supabase Storage | Private buckets, signed URLs |
| Realtime | Supabase Realtime | WebSocket subscriptions |
| Background Jobs | Custom job-worker | Edge Function + async queue |

### External Integrations

| Service | Purpose | Integration Point |
|---------|---------|------------------|
| Google Maps JS API | Route map, service area, load map | `src/integrations/googleMaps/loader.ts` |
| Google Gemini | AI suggestions (route, advisory, marketplace) | `supabase/functions/ai-gateway/` |
| ElevenLabs | Text-to-speech for voice assistant | `supabase/functions/tts-elevenlabs/` |
| Razorpay | Payment order creation + webhook | `supabase/functions/create-payment-order/` + `payment-webhook/` |
| Google Weather API | Farm location weather data | `supabase/functions/get-weather/` |

### Dev Dependencies

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| Playwright | E2E testing |
| Puppeteer | Screenshot automation |
| ESLint 9 | Linting |
| tsx | TypeScript script runner |

### TypeScript Configuration (Critical Warning)

```
tsconfig.app.json:
  "strict": false          ← strictNullChecks is OFF
  "noImplicitAny": false   ← No implicit any warnings
```

**Impact:** Runtime null/undefined crashes are invisible to TypeScript. Always null-coalesce DB values: `value ?? 'fallback'`.

---

## 3. Project Directory Structure

```
original_agrinext/
├── .github/                        # CI/CD GitHub Actions workflows
├── .cursor/rules/                  # Cursor IDE AI rules
├── .env / .env.example             # Environment variables
├── CLAUDE.md                       # AI dev guide (authoritative)
├── package.json                    # npm dependencies (use npm, not bun)
├── tsconfig.json / tsconfig.app.json
├── vite.config.ts                  # Vite build configuration
│
├── src/
│   ├── App.tsx                     # Root router + QueryClient setup (100+ routes)
│   ├── main.tsx                    # React DOM entry point
│   ├── index.css                   # Global Tailwind styles
│   │
│   ├── pages/                      # 82 page components
│   │   ├── Index.tsx               # Landing page
│   │   ├── Login.tsx               # Phone auth login
│   │   ├── Signup.tsx              # 2-step signup wizard
│   │   ├── farmer/                 # 11 farmer pages
│   │   ├── agent/                  # 8 agent pages
│   │   ├── logistics/              # 13 logistics pages (incl. unified engine)
│   │   ├── marketplace/            # 5 buyer pages
│   │   ├── admin/                  # 21 admin pages
│   │   ├── vendor/                 # 8 vendor pages (planned)
│   │   ├── Onboard/                # Role selection post-signup
│   │   ├── common/                 # PendingSync, UploadsManager
│   │   └── trace/                  # Public listing traceability (no auth)
│   │
│   ├── components/                 # 156 reusable components
│   │   ├── ui/                     # shadcn/ui auto-generated (DO NOT EDIT)
│   │   ├── farmer/                 # FarmerSummaryCard, QuickActions, DashboardZone, etc.
│   │   ├── agent/                  # Agent-specific UI components
│   │   ├── logistics/              # TripCard, EarningsSummaryCard, LoadsMapView, etc.
│   │   ├── marketplace/            # Buyer-specific listing components
│   │   ├── admin/                  # Admin table and panel components
│   │   ├── crop-diary/             # Photo gallery, activity log
│   │   ├── geo/                    # GeoDistrictSelect, GeoMarketSelect, GeoStateSelect
│   │   ├── listings/               # Traceability, listing display components
│   │   ├── shared/                 # EmptyState, PageHeader, RouteErrorBoundary
│   │   ├── dashboard/              # DashboardSidebar, DashboardHeader, KpiCard, BottomTabBar
│   │   ├── layout/                 # PageShell
│   │   ├── dev/                    # DevConsole (VITE_DEV_TOOLS_ENABLED guard)
│   │   └── marketing/              # HeroSection, ProblemSection, CTASection, etc.
│   │
│   ├── hooks/                      # 24 custom React hooks
│   │   ├── useAuth.tsx             # Auth context (CRITICAL)
│   │   ├── useLanguage.tsx         # i18n context
│   │   ├── useCropDiary.tsx        # Crop diary data + mutations
│   │   ├── useFarmerDashboard.tsx  # Farmer RPC data
│   │   ├── useLogisticsDashboard.tsx
│   │   ├── useMarketplaceDashboard.tsx
│   │   ├── useAdminDashboard.tsx
│   │   ├── useUnifiedLogistics.tsx # Unified logistics engine hook
│   │   ├── useTrips.tsx            # Legacy trips hook
│   │   ├── useRealtimeSubscriptions.tsx
│   │   ├── useMarketData.tsx
│   │   ├── useFarmerEarnings.tsx
│   │   ├── useGeoCapture.tsx       # GPS location capture
│   │   ├── useKarnatakaDistricts.tsx
│   │   └── useMobile.tsx           # Responsive detection
│   │
│   ├── routes/                     # Role-based route modules
│   │   ├── farmerRoutes.tsx
│   │   ├── agentRoutes.tsx
│   │   ├── logisticsRoutes.tsx
│   │   ├── marketplaceRoutes.tsx
│   │   ├── adminRoutes.tsx
│   │   └── vendorRoutes.tsx
│   │
│   ├── lib/
│   │   ├── routes.ts               # Type-safe ROUTES constants
│   │   ├── constants.ts            # ROLES, STORAGE_KEYS, SUPABASE_BUCKETS, CACHE_TIME
│   │   ├── utils.ts                # cn() Tailwind merge helper
│   │   ├── auth.ts                 # Auth utility functions
│   │   ├── readApi.ts              # Supabase RPC query wrappers
│   │   ├── storage-upload.ts       # Signed URL upload helpers
│   │   └── offlineQueue.ts         # Offline action queue utilities
│   │
│   ├── types/
│   │   ├── domain.ts               # AppRole, CropHealthStatus, TripStatus, OrderStatus, etc.
│   │   └── api.ts                  # RPC response shapes
│   │
│   ├── i18n/
│   │   ├── en.ts                   # English (source of truth)
│   │   ├── kn.ts                   # Kannada (must mirror en.ts exactly)
│   │   ├── index.ts                # Translation engine with mojibake repair
│   │   └── aliases.ts              # Key aliases
│   │
│   ├── offline/
│   │   ├── idb.ts                  # Dexie schema (actions, uploads, cache_meta tables)
│   │   ├── queryPersister.ts       # React Query ↔ IndexedDB sync
│   │   ├── actionQueue.ts          # Offline mutations queue
│   │   ├── uploadQueue.ts          # Upload queue for offline mode
│   │   └── network.ts              # Network status detection
│   │
│   ├── layouts/
│   │   └── DashboardLayout.tsx     # Responsive sidebar + mobile drawer shell
│   │
│   └── integrations/
│       ├── supabase/
│       │   ├── client.ts           # Supabase anon client (anon key ONLY)
│       │   └── types.ts            # AUTO-GENERATED from DB (257KB — never edit)
│       └── googleMaps/
│           └── loader.ts           # Google Maps lazy loader
│
└── supabase/
    ├── config.toml                 # Local dev: DB port 54322, API 54321, Studio 54323
    ├── functions/                  # 24 Edge Functions (Deno)
    │   ├── _shared/                # Shared utilities
    │   │   ├── cors.ts
    │   │   ├── errors.ts           # successResponse() / errorResponse() helpers
    │   │   ├── env.ts
    │   │   ├── request_context.ts
    │   │   ├── gemini_client.ts
    │   │   ├── ai_context.ts
    │   │   ├── ai_prompts.ts
    │   │   ├── ai_lang.ts
    │   │   └── ai_response.ts
    │   ├── signup-by-phone/        # ~857 lines: full signup with rate-limiting
    │   ├── login-by-phone/         # ~270 lines: auth + lockout + retry-after
    │   ├── storage-sign-upload-v1/
    │   ├── storage-sign-read-v1/
    │   ├── storage-confirm-upload-v1/
    │   ├── storage-delete-v1/
    │   ├── ai-gateway/
    │   ├── tts-elevenlabs/
    │   ├── get-weather/
    │   ├── create-payment-order/
    │   ├── payment-webhook/
    │   ├── job-worker/
    │   ├── finance-cron/
    │   ├── finance-reconcile/
    │   ├── finance-admin-api/
    │   ├── admin-enqueue/
    │   ├── admin-jobs-summary/
    │   ├── admin-finance-summary/
    │   ├── logistics-orchestrator/
    │   ├── complete-role-onboard/
    │   ├── dev-switch-role/
    │   ├── dev-get-active-role/
    │   ├── dev-create-acting-session/
    │   └── dev-revoke-acting-session/
    └── migrations/                 # 120+ SQL migrations
        └── [YYYYMMDDHHmm_p0/p1/phase_descriptor.sql]
```

---

## 4. Major Application Modules

### 4.1 Landing Page Module
- **Entry point:** `src/pages/Index.tsx`
- **Purpose:** Marketing hub + smart auth redirect
- **Sections:** Navbar → Hero → Problem → Platform → RoleValue → Workflow → TrustBanner → Impact → CTA → Footer
- **Smart redirect:** Authenticated users are immediately routed to their role dashboard via `ROLE_DASHBOARD_ROUTES[userRole]`
- **Components:** All in `src/components/marketing/`

### 4.2 Authentication Module
- **Login:** `src/pages/Login.tsx` — phone + password, role selector, lockout timer
- **Signup:** `src/pages/Signup.tsx` — 2-step wizard (role → account details)
- **Backend:** `signup-by-phone` + `login-by-phone` Edge Functions
- **Context:** `src/hooks/useAuth.tsx` — central auth state for entire app
- **Role onboarding:** `src/pages/Onboard/RoleSelect.tsx`

### 4.3 Farmer Module (11 pages)
| Page | File | Purpose |
|------|------|---------|
| Dashboard | `src/pages/farmer/Dashboard.tsx` | Hub: zones for weather, crops, transport, support |
| My Day | `src/pages/farmer/MyDay.tsx` | Daily pending actions + quick stats |
| Crops | `src/pages/farmer/Crops.tsx` | Crop inventory list |
| Crop Diary | `src/pages/farmer/CropDiary.tsx` | Detailed crop tracking with photo gallery |
| Farmlands | `src/pages/farmer/Farmlands.tsx` | Land parcel management |
| Transport | `src/pages/farmer/Transport.tsx` | Create/track transport requests |
| Listings | `src/pages/farmer/Listings.tsx` | Create and manage produce listings |
| Orders | `src/pages/farmer/Orders.tsx` | Incoming buyer orders |
| Earnings | `src/pages/farmer/Earnings.tsx` | Payment history + income summary |
| Notifications | `src/pages/farmer/Notifications.tsx` | In-app notification center |
| Settings | `src/pages/farmer/Settings.tsx` | Profile + preferences |

### 4.4 Agent Module (8 pages)
- Manages assigned farmer relationships (via `agent_farmer_assignments` RLS)
- Key pages: Today's tasks, My Farmers list, Farmer Detail deep-dive, Service Area map
- Data hook: `src/hooks/useAgentDashboard.tsx`

### 4.5 Logistics Module (13 pages)
| Category | Pages |
|----------|-------|
| Legacy | Dashboard, Active Trips, Available Loads, Completed Trips, Trip Detail, Vehicles |
| Unified Engine | Forward Trips, Reverse Loads, Unified Trip Detail, Capacity View, Earnings View |
| Account | Profile, Service Area |

- **Unified logistics hook:** `src/hooks/useUnifiedLogistics.tsx`
- **Orchestrator:** `supabase/functions/logistics-orchestrator/`
- **Key principle:** Vehicles are round-trip assets — always consider reverse logistics

### 4.6 Marketplace (Buyer) Module (5 pages)
| Page | Purpose |
|------|---------|
| Dashboard | KPI cards, fresh harvest, active orders, AI advisor |
| Browse | Search + filter + infinite scroll listings |
| Product Detail | Full listing with farmer profile, market prices, order form |
| Orders | Purchase history + status tracking |
| Profile | Buyer profile + preferred crops |

- Data hook: `src/hooks/useMarketplaceDashboard.tsx`

### 4.7 Admin Module (21 pages, 6 nav groups)
| Group | Pages |
|-------|-------|
| Operations | Dashboard, Ops Inbox, Tickets, Disputes |
| Network | Farmers, Agents, Transporters, Buyers, Crops |
| Operations | Transport, Orders, Pending Updates |
| AI Intelligence | AI Console, AI Review |
| Finance | Finance, Finance Ops, Payouts, Refunds |
| System | System Health, Seed Data, Jobs, Data Health, Mysuru Demo |

- Special: Entity 360 view (`/admin/entity/:type/:id`) for cross-role deep inspection
- Data health monitoring: `src/hooks/useAdminDataHealth.tsx`

### 4.8 Vendor Module (8 pages — Planned)
- Shipment creation, management, reverse logistics matching
- Routes exist but dashboard is not yet feature-complete

### 4.9 Offline Engine Module
- **IndexedDB (Dexie):** `src/offline/idb.ts` — 3 tables: `actions`, `uploads`, `cache_meta`
- **Action Queue:** Mutations queued when offline, retried with exponential backoff on reconnect
- **Upload Queue:** File uploads queued to IndexedDB blob storage, drained on reconnect
- **React Query Persister:** `src/offline/queryPersister.ts` — serializes query cache to IDB

### 4.10 AI Gateway Module
- **Edge function:** `supabase/functions/ai-gateway/`
- **Model:** Google Gemini
- **Contexts:** Farmer advisory, logistics route optimization, reverse load matching, marketplace recommendations
- **Shared utilities:** `gemini_client.ts`, `ai_context.ts`, `ai_prompts.ts`, `ai_lang.ts`, `ai_response.ts`
- **Frontend panels:** Embedded in Logistics and Marketplace dashboards

### 4.11 Finance & Payment Module
- **Payment flow:** `create-payment-order` → Razorpay → `payment-webhook` (HMAC verified)
- **Finance ops:** `finance-cron` (scheduled), `finance-reconcile`, `finance-admin-api`
- **Admin access:** `admin-finance-summary`, Finance pages in admin module

---

## 5. User Roles & Permissions

### Role Definitions

| Role | Data Access | Write Access | Admin Visibility |
|------|------------|-------------|-----------------|
| `farmer` | Own farmlands, crops, listings, transport requests, orders | Create/update own entities | Partial (via agent) |
| `agent` | Assigned farmers only (via `agent_farmer_assignments`) | Add notes, verify data, update task status | Direct with admin |
| `logistics` | Own trips, vehicles | Accept loads, update trip status, upload proofs | Trip visibility |
| `buyer` | All active listings, own market_orders | Place orders, update profile | Order visibility |
| `admin` | ALL tables (read) | Write via Edge Functions + audit log | Full |
| `vendor` | Own shipments, logistics requests | Create shipments | Partial |

### RLS Enforcement Pattern
```sql
-- Farmer: see only own data
CREATE POLICY "farmer_own_farmlands"
ON farmlands FOR ALL TO authenticated
USING (farmer_id = get_current_profile_id());

-- Agent: see only assigned farmers
CREATE POLICY "agent_assigned_farmers"
ON farmlands FOR SELECT TO authenticated
USING (farmer_id IN (
  SELECT farmer_id FROM agent_farmer_assignments
  WHERE agent_id = get_current_profile_id()
));
```

### Multi-Profile Support
- A single phone number can have multiple role profiles
- Managed via `user_profiles` table + `activeProfileId` in localStorage
- UI: Account Switcher page (`/account/switch`)
- Dev override: `dev-switch-role` Edge Function (8-hour session)

---

## 6. Routing Architecture

### Route Organization

```
App.tsx
├── Public routes (no auth): /, /login, /signup, /about, /contact, /trace/:traceCode
├── Protected routes (auth required):
│   ├── farmerRoutes   → /farmer/*   (11 pages)
│   ├── agentRoutes    → /agent/*    (9 pages)
│   ├── logisticsRoutes → /logistics/* (13 pages)
│   ├── marketplaceRoutes → /marketplace/* (5 pages)
│   ├── adminRoutes    → /admin/*    (21 pages)
│   └── vendorRoutes   → /vendor/*   (8 pages)
├── Dev route: /dev-console (guarded by VITE_DEV_TOOLS_ENABLED)
└── Fallback: * → 404 Not Found
```

### Auth Guard Pattern
- `ProtectedRoute` component wraps authenticated sections
- On load, `useAuth()` checks session; redirects to `/login` if none
- After login, redirects to `ROLE_DASHBOARD_ROUTES[selectedRole]`

### Type-Safe Route Constants (src/lib/routes.ts)
```typescript
ROUTES.FARMER.DASHBOARD          // '/farmer/dashboard'
ROUTES.FARMER.CROP_DIARY(cropId) // '/farmer/crops/:cropId'
ROUTES.LOGISTICS.UNIFIED_TRIP_DETAIL(tripId)
ROUTES.ADMIN.ENTITY_360(type, id)
```

### Query Client Configuration (App.tsx)
```typescript
staleTime: 2 * 60 * 1000     // 2 min (optimized for 2G networks)
gcTime: 10 * 60 * 1000       // 10 min cache
retry: 2                      // 2 retry attempts
refetchOnWindowFocus: false   // Prevents excessive refetches on mobile
```

---

## 7. Backend Architecture

### Edge Function Catalog (24 functions)

| Function | Auth | Purpose |
|----------|------|---------|
| `signup-by-phone` | None | Registration with rate-limiting + role-specific setup |
| `login-by-phone` | None | Auth with lockout + retry-after |
| `storage-sign-upload-v1` | JWT | Signed upload URL generation |
| `storage-sign-read-v1` | JWT | Signed read URL generation |
| `storage-confirm-upload-v1` | JWT | Mark upload as ready |
| `storage-delete-v1` | JWT | Delete storage file |
| `get-weather` | None | Farm location weather |
| `tts-elevenlabs` | JWT | Text-to-speech |
| `ai-gateway` | JWT | Gemini AI routing (rate-limited) |
| `create-payment-order` | JWT | Razorpay order creation |
| `payment-webhook` | HMAC sig | Razorpay payment events |
| `job-worker` | Secret header | Async background job processor |
| `finance-cron` | Cron | Scheduled finance tasks |
| `finance-reconcile` | Custom | Payment reconciliation |
| `finance-admin-api` | Custom | Finance admin operations |
| `admin-enqueue` | JWT | Enqueue background jobs |
| `admin-jobs-summary` | JWT | Job queue statistics |
| `admin-finance-summary` | JWT | Finance dashboard data |
| `logistics-orchestrator` | JWT | Trip/load coordination |
| `complete-role-onboard` | JWT | Role onboarding finalization |
| `dev-switch-role` | JWT | DEV: Role switch (8h session) |
| `dev-get-active-role` | JWT | DEV: Query active override |
| `dev-create-acting-session` | JWT | DEV: Create acting session |
| `dev-revoke-acting-session` | JWT | DEV: Revoke acting session |

### Standard Response Format
```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable" } }
```

### HTTP Status Codes
- `200` Success, `201` Created, `400` Validation, `401` Unauthorized
- `403` Forbidden (locked), `404` Not Found, `409` Conflict (duplicate)
- `429` Rate Limited, `500` Internal Error

### Signup Flow (signup-by-phone)
1. Normalize phone → `+91XXXXXXXXXX`
2. Generate synthetic email → `91XXXXXXXXXX@agrinext.local`
3. Rate-limit check (IP/phone prefix)
4. Duplicate check (profiles + Supabase Auth)
5. Create Supabase Auth user
6. Upsert `profiles` table
7. Upsert `user_roles` table
8. Create role-specific records (transporters / buyers / admin_users)
9. Issue JWT via password grant
10. Record telemetry in `signup_attempts`

### Login Flow (login-by-phone)
1. Normalize phone
2. Lookup profile → check account_status
3. If restricted: check `blocked_until` timestamp → return 429 with Retry-After header
4. Exchange credentials with Supabase Auth
5. On failure: increment failed_login_count via `record_failed_login_v1` RPC
6. On success: reset counters, set `last_login_at`, return tokens

---

## 8. Database Integration

### Schema Groups

| Schema | Purpose | Access Level |
|--------|---------|-------------|
| `public` | All operational data | Frontend via anon key + RLS |
| `secure` | KYC, payments, settlements | Edge Functions only (service_role) |
| `analytics` | Aggregated reporting | Admin Edge Functions + read replicas |

### Key Tables (public schema)

**Auth & Profile:**
- `profiles` — user display info, phone, language, account_status, lockout state
- `user_roles` — role assignment (one per user)
- `user_profiles` — unified multi-profile table
- `dev_acting_sessions` — dev role override records (8h expiry)

**Farmer Domain:**
- `farmlands` — land parcels (farmer_id FK, soil_type, area_acres, village, district)
- `crops` — crop records (land_id FK, crop_name, variety, health_status⚠️nullable, growth_stage⚠️nullable)
- `crop_activity_logs` — append-only event log
- `listings` — produce listings with trace_code for traceability

**Logistics Domain:**
- `transport_requests` — farmer transport demands
- `trips` — vehicle trip execution records
- `trip_location_events` — GPS events (PARTITIONED table)
- `transport_status_events` — state machine transitions (append-only)
- `vehicles` — transporter vehicle registry
- `transporters` — transporter profile records

**Marketplace:**
- `market_orders` — buyer purchase orders
- `buyers` — buyer profile records
- `market_prices` — price feed by crop + date

**System:**
- `notifications` — in-app notification records
- `app_config` — feature flags, rate limit config, role signup gates
- `rate_limits` — API abuse prevention (IP/phone/key based)
- `audit_logs` — append-only security audit trail
- `signup_attempts` / `login_attempts` — telemetry + lockout tracking

### Standard Column Pattern
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### Critical Nullable Columns (Known Pitfall)
```typescript
// crops.health_status — TEXT, nullable (old rows have NULL)
crop.health_status ?? 'normal'   // ALWAYS null-coalesce

// crops.growth_stage — TEXT, nullable (old rows have NULL)
crop.growth_stage ?? 'seedling'  // ALWAYS null-coalesce
```
Fixed in migration `202603071003_p1b_fix_crop_diary_null_defaults.sql` but apply defensively in all new code.

### Migration Naming Convention
```
YYYYMMDDHHmm_severity_descriptor.sql

Severity prefixes:
  p0_    Critical security/crash fix
  p1a_   High priority bug fix
  p1b_   High priority bug fix (secondary)
  phase_ Feature phase migration
```

### Client Initialization
```typescript
// src/integrations/supabase/client.ts
createClient<Database>(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
})
// NEVER use service_role key on frontend
```

---

## 9. External Integrations

### Google Maps
- **Loader:** `src/integrations/googleMaps/loader.ts` (lazy load on demand)
- **Used in:** LoadsMapView (logistics), ServiceArea maps, route visualization
- **Key:** `VITE_GOOGLE_MAPS_API_KEY` environment variable

### Google Gemini AI
- **Gateway:** `supabase/functions/ai-gateway/`
- **Shared client:** `supabase/functions/_shared/gemini_client.ts`
- **Use cases:**
  - Farmer: crop advisory, pest alerts
  - Logistics: route optimization, reverse load matching
  - Marketplace: buyer stock recommendations
- **Frontend:** AI panels embedded in dashboards (not standalone pages)
- **Secret:** `GEMINI_API_KEY` in Supabase Edge Function secrets

### ElevenLabs TTS
- **Function:** `supabase/functions/tts-elevenlabs/`
- **Use case:** Voice assistant for low-literacy rural farmers
- **Secret:** `ELEVENLABS_API_KEY`

### Razorpay (Payments)
- **Order creation:** `supabase/functions/create-payment-order/` (JWT protected)
- **Webhook:** `supabase/functions/payment-webhook/` (HMAC signature verification)
- **Secrets:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

### Google Weather API
- **Function:** `supabase/functions/get-weather/`
- **Use case:** WeatherWidget on Farmer Dashboard + My Day page
- **Integration:** Called with farmer's village/district for localized forecast

---

## 10. Key Data Flows

### 10.1 User Authentication Flow
```
User → Login page
  → Selects role
  → Enters phone + password
  → POST /functions/v1/login-by-phone
      → Normalize phone → Lookup profiles
      → Check account_status (locked/restricted?)
      → Exchange credentials (Supabase Auth)
      → On success: reset lockout counters
      → Return { access_token, refresh_token }
  → supabase.auth.setSession(tokens)
  → useAuth().refreshRole() → fetch user_roles
  → Navigate to ROLE_DASHBOARD_ROUTES[role]
```

### 10.2 Dashboard Data Loading
```
Role dashboard mounts
  → useFarmerDashboard() / useLogisticsDashboard() etc.
    → useQuery({ queryKey: ['dashboard', userId], staleTime: 30s })
      → Supabase RPC: farmer_dashboard_v1() / buyer_dashboard_v1() etc.
        → Postgres function returns aggregated JSON
      → React Query caches result
      → On network error: reads from IndexedDB persisted cache
  → Render skeleton → Replace with real data
  → useRealtimeSubscriptions() opens WebSocket channels
    → On DB change event → invalidate relevant query keys
```

### 10.3 Listing Creation Flow (Farmer)
```
Farmer → Listings page → "Create Listing"
  → Form: crop selection, price, quantity, description
  → Optional photo upload:
      → storage-sign-upload-v1 → signed URL
      → Upload binary to Supabase Storage
      → storage-confirm-upload-v1 → mark ready
  → INSERT into listings table (via Supabase client + RLS)
  → Listing appears in marketplace (RLS: is_active=true)
  → Trace code auto-generated for traceability
```

### 10.4 Order Placement Flow (Buyer)
```
Buyer → Browse → Product Detail → "Place Order"
  → Form: quantity, notes
  → useMutation → useCreateOrder()
    → INSERT into market_orders (buyer_id, farmer_id, listing_id, quantity)
  → Farmer receives notification (notifications table)
  → Payment: create-payment-order → Razorpay checkout
  → On payment success: payment-webhook → update order payment_status
```

### 10.5 Logistics Trip Flow
```
Transport request created by Farmer
  → Logistics operator sees on Available Loads page
  → Accepts load → Trip assigned
    → Trip status: REQUESTED → ASSIGNED
  → Logistics starts trip (EN_ROUTE)
    → GPS events logged to trip_location_events (partitioned)
  → Pickup (PICKED_UP) → In Transit (IN_TRANSIT)
  → Delivery: Upload proof photo (storage-sign-upload-v1)
    → Trip status: DELIVERED → CLOSED
  → Payment reconciliation via finance-cron
```

### 10.6 Offline Action Flow
```
User takes action while offline
  → useMutation detects offline (navigator.onLine)
  → Action serialized → INSERT into idb.actions (status: queued)
  → UI shows optimistic update
  → Device comes online (network.ts detects)
    → actionQueue drains: retries with exponential backoff
    → On success: status=succeeded, invalidate query cache
    → On final failure (maxRetries): status=dead, show error toast
```

---

## 11. Observed Architectural Patterns

### Pattern 1: Phone-First Auth with Synthetic Emails
Supabase Auth requires email; the platform uses phone numbers. Synthetic emails (`91XXXXXXXXXX@agrinext.local`) are generated server-side, never shown to users, and never used for communication. All auth flows go through Edge Functions — the frontend never calls `supabase.auth.signUp()`.

### Pattern 2: Multi-Schema Security Isolation
Sensitive data is isolated in the `secure` schema, inaccessible to frontend. The `analytics` schema is read-only for reporting. Only the `public` schema is exposed via PostgREST, with RLS enforcing row-level access control for every table.

### Pattern 3: Offline-First with Action Queue
All mutations are queued to IndexedDB before attempting network calls. Idempotency keys prevent duplicate writes on retry. React Query cache is persisted to IndexedDB, allowing dashboards to load from cache when offline.

### Pattern 4: Role-Agnostic API Design
API endpoints are not named per-role (no `/farmer-trips`, `/buyer-orders`). Instead, unified endpoints use RLS to filter by the caller's role. This keeps the API surface clean as new roles are added.

### Pattern 5: Append-Only Audit Trail
State transitions (transport, trips, crops) are recorded as append-only event logs (`transport_status_events`, `crop_activity_logs`, `audit_logs`). No history is lost; the current state is always the latest event.

### Pattern 6: Reverse Logistics as First-Class Concept
Vehicles are modeled as round-trip assets. Every forward trip (village → market) generates a reverse load opportunity (market → village, carrying fertilizer/seeds/goods). The unified logistics engine (`logistics-orchestrator`) handles both legs.

### Pattern 7: Type-Safe Routing
All route strings are constants in `src/lib/routes.ts`. Dynamic routes are factory functions (e.g., `ROUTES.FARMER.CROP_DIARY(cropId)`). This prevents typo-induced navigation bugs across 100+ routes.

### Pattern 8: React Query as State Backbone
No Redux or Zustand. All server state flows through TanStack Query v5. Query keys follow `['entity', 'action', ...params]` pattern. Mutations invalidate specific query keys. Cache times are tuned for 2G mobile networks.

### Pattern 9: Bilingual Engine with Mojibake Recovery
All i18n keys exist in both `en.ts` (English) and `kn.ts` (Kannada). The translation engine auto-detects and repairs corrupted Kannada UTF-8 (mojibake) that may result from incorrect encoding chains. Dev warnings fire for missing keys.

### Pattern 10: Graduated Migration Discipline
Migrations follow strict conventions: never DROP columns (use ALTER + backfill), always set DEFAULT before NOT NULL, one logical change per migration file. This ensures safe production deploys with zero data loss.

---

*End of Repository Intelligence Report — Phase 1 Complete*
