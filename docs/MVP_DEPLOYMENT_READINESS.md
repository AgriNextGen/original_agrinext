# AgriNext Gen — MVP Deployment Readiness Report

> **Generated:** 2026-03-13 | **Covers:** Phases F1–F4 + testing fixes
> **Purpose:** Enumerate every remaining task before real-user onboarding.

---

## Executive Summary

Phases F1–F4 fixed the core buyer-farmer-admin order pipeline, the logistics trip status vocabulary, admin login/navigation, and farmer loading states. The MVP is **~75% deployment-ready**. The remaining work falls into 5 phases (F5–F9), ordered by blast radius — do them in order.

### What Works Today (Post F1–F4)

| Role | Core Flow | Status |
|------|-----------|--------|
| Farmer | Register, add farmlands, add crops, create listings, view/manage orders, request transport | Working |
| Buyer | Browse listings, view detail, place order, track order status | Working |
| Agent | Dashboard, tasks, farmer management, my-farmers, visits | Working |
| Logistics | Dashboard, accept loads, active trips, trip detail, status updates, proof upload, completed trips | Working |
| Admin | Login, dashboard, manage all entities, orders, ops inbox, tickets, finance, jobs | Working |

### What Is Broken or Missing

| Category | Count | Severity |
|----------|-------|----------|
| Broken state-transition pages (direct .update() blocked by trigger) | 3 pages | HIGH |
| Missing production infrastructure (PWA, .env.example, query defaults) | 3 items | HIGH |
| Hardcoded route strings (should use ROUTES constants) | ~12 instances | MEDIUM |
| Missing i18n keys (hardcoded English strings) | ~50+ strings | MEDIUM |
| WeatherWidget still on useState+useEffect | 1 component | LOW |
| Admin pages with no loading skeletons | 3 pages | LOW |

---

## Phase F5: Blocked State Transitions (CRITICAL)

**Why:** Three pages do `supabase.from('table').update({ status })` which is blocked by DB triggers that require RPC-based transitions. These pages silently fail or show errors when users try to change statuses.

### F5-1: Agent Transport page — direct status update blocked

**File:** `src/pages/agent/Transport.tsx`

The agent transport page uses `supabase.from('transport_requests').update({ status })` to change request statuses. The trigger `trg_block_status_update_transport_requests` rejects this with error code `42501`.

**Fix:** Replace the direct update with an RPC call. The existing `accept_transport_load` RPC handles `requested → accepted`, but there is no agent-specific RPC for other transitions (e.g., assigning a transporter). Options:
- Use existing RPCs where available
- Create a new `agent_update_transport_status_v1` RPC that sets `current_setting('app.rpc', true)` before updating
- Or restrict the agent UI to only show read-only transport request status (the logistics role handles transitions)

### F5-2: Admin Transport page — direct status update blocked

**File:** `src/pages/admin/Transport.tsx`

Same issue as F5-1. Admin transport status dropdown uses direct `.update()` which is blocked.

**Fix:** Same approach — use the `update_order_status_v1` pattern: wrap status updates in an RPC that sets `app.rpc = true`.

### F5-3: Farmer Transport cancel — direct status update blocked

**File:** `src/pages/farmer/Transport.tsx`

Farmer cancellation of transport requests uses direct `.update({ status: 'cancelled' })` which is blocked by the trigger.

**Fix:** Add a lightweight `cancel_transport_request_v1` RPC or allow the farmer's cancel to go through the existing state machine.

### F5-4: Admin Disputes — AssignModal never rendered

**File:** `src/pages/admin/Disputes.tsx`

The Disputes page has an "Assign" button that calls `setAssignModal({ open: true, disputeId })`, but `AssignModal` component is never rendered in the JSX tree. The exported `DisputesPageWithAssignWrapper` wraps it, but routes use the unwrapped `DisputesPage`.

**Fix:** Either render `AssignModal` inside `DisputesPage`, or change the route to use `DisputesPageWithAssignWrapper`.

---

## Phase F6: Production Infrastructure (HIGH)

### F6-1: Add `.env.example`

No `.env.example` exists. New developers and deployment pipelines have no reference for required environment variables.

**Fix:** Create `.env.example` with all required `VITE_*` variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEV_TOOLS_ENABLED=false
VITE_ENABLE_PRICE_FORECASTS=false
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```

### F6-2: Add React Query global defaults

**File:** `src/App.tsx` (QueryClient creation)

Currently `new QueryClient()` with no defaults. On slow 2G connections this causes excessive refetching and poor UX.

**Fix:** Add sensible mobile-first defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // 2 min — reduce refetches on 2G
      gcTime: 10 * 60 * 1000,        // 10 min cache
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      refetchOnWindowFocus: false,    // Avoid refetch on every tab switch
    },
  },
});
```

### F6-3: PWA Setup (manifest + service worker)

The app is described as "Phone-first UX (PWA, low-bandwidth)" but has no PWA infrastructure. For MVP with rural Indian users on mobile, this is important for:
- Home screen install
- Offline cache of static assets
- App-like experience

**Fix:** Add `vite-plugin-pwa` with a basic manifest:
- App name, icons, theme color
- Network-first strategy for API calls
- Cache-first for static assets

**Note:** This is optional for initial deployment but strongly recommended for real-user onboarding in rural Karnataka.

---

## Phase F7: Route Constants Cleanup (MEDIUM)

~12 instances of hardcoded route strings remain across agent and logistics pages.

### Files to fix:

| File | Hardcoded Route | Should Be |
|------|-----------------|-----------|
| `src/components/farmer/TodaysTaskList.tsx` | `'/agent/tasks'` | `ROUTES.AGENT.TASKS` |
| `src/components/farmer/PendingTransportList.tsx` | `'/agent/transport'` | `ROUTES.AGENT.TRANSPORT` |
| `src/pages/agent/Profile.tsx` | `'/agent/service-area'` | `ROUTES.AGENT.SERVICE_AREA` |
| `src/pages/agent/Today.tsx` | `` `/agent/farmer/${id}` `` | `ROUTES.AGENT.FARMER_DETAIL(id)` |
| `src/pages/agent/MyFarmers.tsx` | `` `/agent/farmer/${id}` `` | `ROUTES.AGENT.FARMER_DETAIL(id)` |
| `src/pages/logistics/ActiveTrips.tsx` | `'/logistics/trip/${id}'` | `ROUTES.LOGISTICS.TRIP_DETAIL(id)` |
| `src/pages/logistics/ActiveTrips.tsx` | `'/logistics/loads'` | `ROUTES.LOGISTICS.AVAILABLE_LOADS` |

**Fix:** Simple search-and-replace for each instance.

---

## Phase F8: i18n Completeness (MEDIUM)

~50+ user-visible strings are hardcoded in English across farmer, agent, and logistics pages. For bilingual (English + Kannada) MVP, these need i18n keys in both `src/i18n/en.ts` and `src/i18n/kn.ts`.

### Key areas with hardcoded strings:

| Area | Examples |
|------|----------|
| Farmer Farmlands GPS section | "Farm Location (GPS) - Optional", "Location captured", "Capture Location" |
| Farmer Notifications | "Notifications", "All caught up!", "Mark all as read" |
| Logistics TripDetail | "Load Details", "Confirm Pickup", "Start Delivery", "Report Issue" |
| Logistics ActiveTrips | "Active Trips", "No active trips", "Browse Available Loads" |
| Logistics CompletedTrips | "Completed Trips", "Delivery History", "Total Deliveries" |
| Agent Dashboard components | Various task and farmer labels |
| Admin pages | Many table headers, button labels, and status labels |

**Fix:** Audit each page, extract strings to i18n keys, add Kannada translations.

**Note:** This is important for MVP because the target users are Kannada-speaking farmers. English-only admin pages are acceptable for V1.

---

## Phase F9: Polish & Edge Cases (LOW)

These are quality-of-life improvements that improve reliability but are not blockers for MVP launch.

### F9-1: WeatherWidget migration to useQuery

**File:** `src/components/farmer/WeatherWidget.tsx`

Still uses `useState` + `useEffect` + `supabase.functions.invoke('get-weather')`. Should use `useQuery` for caching, offline support, and loading states.

### F9-2: Admin pages loading skeletons

**Files:** `src/pages/admin/Payouts.tsx`, `Refunds.tsx`, `Jobs.tsx`

These pages show empty content while loading instead of skeleton loaders.

### F9-3: Unify offline queues

Two offline queue implementations exist:
- `src/offline/actionQueue.ts` (IndexedDB) — used by Tasks page
- `src/lib/offlineQueue.ts` (localStorage) — used by TaskCompletionModal

Should consolidate to a single IndexedDB-based queue.

### F9-4: Listing status alignment

`Browse.tsx` filters for status `active`, but the DB `listing_status` enum uses `approved`. Verify whether the listings table has an `is_active` boolean or if `approved` should be used instead.

### F9-5: Admin DataHealth sync actions

**File:** `src/pages/admin/DataHealth.tsx`

"Sync Now" and "Rebuild Segments" buttons invoke Edge Functions (`sync-karnataka-mandi-prices`, `rebuild-farmer-segments`) that do not exist in `supabase/functions/`. These buttons will fail silently.

**Fix:** Either create the Edge Functions or remove/disable the buttons for MVP.

---

## Recommended Execution Order

```
F5 (Blocked state transitions)  ← CRITICAL, users will see errors
  ↓
F6 (Production infrastructure)  ← HIGH, deployment readiness
  ↓
F7 (Route constants cleanup)    ← MEDIUM, prevents navigation bugs
  ↓
F8 (i18n completeness)          ← MEDIUM, Kannada user experience
  ↓
F9 (Polish & edge cases)        ← LOW, nice-to-have for V1
```

### Estimated Effort

| Phase | Tasks | Estimated Effort |
|-------|-------|-----------------|
| F5 | 4 fixes (RPCs + Disputes modal) | Medium — requires DB RPC creation or UI adaptation |
| F6 | 3 tasks (.env, query defaults, PWA) | Small-Medium |
| F7 | ~12 string replacements | Small |
| F8 | ~50+ i18n key additions | Medium |
| F9 | 5 polish items | Small |

---

## Items Explicitly Deferred (Not MVP)

Per user direction, these are NOT in scope for MVP deployment:

1. **Payment gateway integration** (Razorpay) — Edge Functions exist but not wired to frontend
2. **Real-time notifications** (Supabase Realtime channels) — hooks exist but not critical for V1
3. **AI features** (Gemini chat, voice assistant, route optimization) — infrastructure exists, works when API keys are configured
4. **Advanced offline** (full PWA with background sync) — basic offline queue exists
5. **Performance optimization** (code splitting, image optimization) — build works, chunk sizes noted
6. **CI/CD pipeline** — GitHub Actions workflow exists but not validated

---

## Current Build Health

```
TypeScript:     0 errors
Lint:           0 errors
Vite build:     SUCCESS (39s)
Bundle size:    1.2 MB main chunk (gzipped: 329 KB)
Pre-existing:   4 duplicate key warnings in i18n (agent, weather in both en.ts and kn.ts)
```
