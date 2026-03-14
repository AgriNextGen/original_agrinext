# USER JOURNEY ANALYSIS REPORT
## AgriNext Gen — Phase 3 User Interaction Audit

> Generated: 2026-03-14
> Scope: Full simulation of all user role journeys through the application
> Purpose: Understand real user interactions, UX friction, and system behavior
> Status: READ-ONLY — observational only, no code was modified

---

## 1. Platform Entry Experience

### 1.1 Landing Page (/)

**First Impression:**
The landing page (`src/pages/Index.tsx`) is a marketing-focused single-page scroll experience with 8 distinct sections. It communicates the platform's multi-role value proposition clearly.

**Smart Redirect Behavior:**
```
Authenticated user → auto-redirected to role dashboard (no marketing shown)
Unauthenticated user → full marketing site displayed
OAuth error (hash params) → toast shown, redirect to /login
```

**Page Sections (in order):**
1. **Navbar** — Logo, language toggle (EN/KN), Login + Get Started buttons
2. **Hero Section** — Main headline, sub-headline, dual CTA (Get Started, Watch Demo)
3. **Problem Section** — Pain points of agricultural supply chain (post-harvest loss, price instability)
4. **Platform Section** — 5-role ecosystem overview with role cards
5. **Role Value Section** — Per-role specific benefit highlights (farmer, buyer, logistics, agent, vendor)
6. **Workflow Section** — End-to-end interaction flow diagram/illustration
7. **Trust Banner** — Social proof metrics (farmers onboarded, trips completed, etc.)
8. **Impact Section** — Outcome KPIs (post-harvest loss reduction, income increase)
9. **CTA Section** — Final call-to-action with role-specific signup buttons
10. **Footer** — Links, legal, contact info

**Navigation:**
- Navbar is responsive (hamburger on mobile)
- "Get Started" → `/signup`
- "Login" → `/login`
- Language toggle persists via `agrinext_language` localStorage key

**UX Assessment:**
- Clear value proposition, well-structured narrative flow
- Role cards are a strong UX pattern for diverse user base
- Bilingual toggle is appropriately prominent for rural KA users

---

## 2. Authentication Flow

### 2.1 Login Page (/login)

**Layout:** Split 50/50 on desktop (left: form, right: role-specific branding). Full-width form on mobile.

**Step 1 — Role Selection:**
```
6-button grid presented FIRST (before any credentials)
Roles: Farmer | Buyer | Agent | Logistics | Vendor | Admin
  → Selected role: border highlight + background tint
  → Right panel: dynamically changes illustration + tagline per role
  → Submit disabled until role selected
```

**Step 2 — Credential Entry:**
```
Phone field (with phone icon, normalized on submit)
Password field (show/hide toggle via Eye/EyeOff icon)
"Login" button (disabled while loading)
"Sign in with Google" (OAuth fallback)
"Create account" link → /signup
```

**Submission Flow:**
```
POST /functions/v1/login-by-phone
  { phone, password, role }
  → 200: receive { access_token, refresh_token }
      → supabase.auth.setSession(tokens)
      → Navigate to ROLE_DASHBOARD_ROUTES[selectedRole]
  → 401: "Invalid phone or password" error alert
  → 429: Lockout countdown timer shown (MM:SS format)
  → 403: "Account locked" message
```

**Advanced Error Handling:**
- **Lockout timer:** On `retry_after_seconds` in response → countdown displayed, button disabled
- **Network timeout:** 15-second fetch timeout with user-friendly timeout message
- **JSON parse errors:** Caught separately from HTTP errors
- **Auto-retry buffer:** Prevents double-submit via `isSubmitting` ref

**UX Friction Points:**
- The role selector is non-obvious for first-time users — no instructional label before the 6 buttons
- Password recovery flow is absent (no "Forgot password?" link visible)
- Google OAuth stores role in `sessionStorage` — if tab is closed before callback, role is lost

---

### 2.2 Signup Page (/signup)

**Multi-step Wizard (2 steps):**

**Step 1 — Role Selection:**
```
5 role cards (excluding Admin — admin signup is closed)
Each card: icon + role name + brief description
"Continue" button disabled until role selected
Progress bar: 50% filled at Step 1
```

**Step 2 — Account Details:**
```
← Back button (returns to Step 1 without losing selection)
Fields:
  Full Name (required)
  Phone (required, normalized on submit)
  Password (required, min 8 chars)
  Email (optional — synthetic email generated if empty)
"Create Account" button with loading state ("Creating account...")
Progress bar: 100% filled at Step 2
```

**Submission Flow:**
```
POST /functions/v1/signup-by-phone
  { role, phone, password, full_name, email/synthetic }
  → 201: receive { access_token, refresh_token, dashboard_route }
      → supabase.auth.setSession(tokens)
      → refreshRole()
      → Navigate to dashboard_route
  → 409: "Phone number or email already in use"
  → 429: "Too many signup attempts. Please try again later."
  → 403: "Signups for [role] are currently closed."
```

**Protection:**
- `isSubmittingRef` prevents duplicate submissions (important for slow 2G networks)
- Error shown as red alert box above form
- Field errors clear when user starts typing

**UX Friction Points:**
- No field-level validation on phone format before submission
- Password strength indicator is absent
- No resend OTP or phone verification step (trust is based on password only)
- Admin role is absent from signup cards but navigating to `/signup` with admin role via URL still shows no explicit error to users

---

### 2.3 Session Management

**Persistence:** Sessions stored in localStorage via Supabase client auto-persistence.

**Token Refresh:** Supabase client auto-refreshes tokens before expiry (set in config.toml: `jwt_expiry = 3600`, `refresh_token_reuse_interval = 10`).

**Multi-Profile:** Users can have multiple role profiles under one phone number. `activeProfileId` stored in localStorage; Account Switcher page at `/account/switch`.

**Logout:**
```
signOut() → supabase.auth.signOut() → clears session
→ Redirects to / (landing page)
```

---

## 3. Farmer User Journey

### 3.1 Dashboard (/farmer/dashboard)

**First Visit (No Data):**
```
FarmerLocationPrompt → request GPS access
FarmerOnboardingWizard → collect: village, district, land area
FarmerSummaryCard (all zeros)
QuickActions (add farm, add crop, request transport, create listing)
WeatherWidget + MarketPricesWidget
```

**Returning Visit (With Data):**
```
FarmerSummaryCard (farmlands, crops, listings, orders counts)
QuickActions (contextual based on missing steps)
WeatherWidget + MarketPricesWidget (collapsible zone)
FarmlandsSummary + CropsSection (hidden until toggle or has data)
HarvestTimeline + TransportSection (hidden until toggle or has data)
AdvisoriesList + MyAgentWidget + MyHelpRequests (collapsible support zone)
AgentNotesSection (only if agent has left notes)
VoiceAssistant (floating button, always visible)
```

**Smart Visibility Logic:**
```javascript
hasAnyData = crops.length > 0 || transportRequests.length > 0 || orders.length > 0 || farmlands.length > 0
hasFarmData = farmlands.length > 0 || crops.length > 0
hasTransportOrOrders = transportRequests.length > 0 || activeOrders.length > 0
```

**Loading:** Skeleton screens replace each zone during data fetch. Distinct skeleton shapes for KPI cards, weather, and list items.

**Error:** Red alert with "Failed to load dashboard" + refresh button (calls `refetch()`).

**Data Source:** `farmer_dashboard_v1` RPC (staleTime: 30s, retry: 2 attempts with exponential backoff).

**Realtime:** `useRealtimeSubscriptions()` opens channels for: crops, transport_requests, listings, notifications.

---

### 3.2 My Day (/farmer/my-day)

**Purpose:** Time-aware daily view — "what needs my attention today?"

**Time-Based Greeting:**
```
Hour 5-11:  "Good Morning, [name]"
Hour 12-16: "Good Afternoon, [name]"
Hour 17+:   "Good Evening, [name]"
```

**Content:**
```
Date string (e.g., "Wednesday, 13 March")
Quick Stats (4-col KPI): Active Orders | Transport Requests | Listings | Crops

Pending Actions (shown if any exist):
  Active Orders badge + navigate button
  Open Transport badge + navigate button
  Draft Listings badge + navigate button
  Harvest Ready Crops badge + navigate button

Quick Actions Grid (shown only if NO pending actions):
  Add Crop | Add Farmland | Request Transport | Create Listing

Daily Tip Widget (amber gradient, lightbulb icon)

Recent Orders Section (if orders exist):
  Top 5 orders with:
  - Status badge (color-coded)
  - Order amount
  - Status explanation button → Dialog
  - Help button → Help Request Dialog
```

**Dialogs:**
- **Status Explanation:** "What does CONFIRMED mean?" → plain-language explanation
- **Help Request:** Category dropdown + message textarea → creates support ticket

**UX Assessment:** Strong "daily driver" pattern. Pending actions model is intuitive — farmers know exactly what to do next.

---

### 3.3 Crop Diary (/farmer/crops/:cropId)

**Content:**
- Crop header: name, variety, status badge, health indicator
- Photo gallery (upload + view)
- Activity log (append-only timeline)
- Edit crop details (growth stage, health status)

**Critical Null Safety Fix Applied:**
```typescript
// health_status may be NULL for old crops
const config = healthStatusConfig[crop.health_status ?? 'normal'];

// growth_stage may be NULL for old crops
<Select value={crop.growth_stage ?? 'seedling'} />
```

Without this fix, the page renders blank (no ErrorBoundary catches the TypeError).

---

### 3.4 Transport Request (/farmer/transport)

**Flow:**
```
List of existing transport requests (status-coded)
"Request Transport" button → form:
  Pickup village + district
  Destination market
  Preferred date
  Crop + quantity
  Notes
→ INSERT transport_requests
→ Status: REQUESTED (visible to logistics operators)
```

**Cancel option:** Available via RPC `farmer_cancel_transport_request` (migration 202603131000).

---

### 3.5 Listings (/farmer/listings)

**Flow:**
```
List of active/draft/sold listings
"Create Listing" → form:
  Crop selection (from own crops)
  Price per unit + quantity
  Description
  Photo upload (optional, signed URL flow)
→ INSERT listings (is_active=true)
→ Trace code auto-generated for public traceability
```

**Traceability:** Every listing gets a unique `trace_code`. Public URL: `/trace/listing/:traceCode` (no auth required — allows buyers to verify farm-to-fork chain).

---

## 4. Buyer User Journey

### 4.1 Onboarding (First Visit)
```
Dashboard loads → useBuyerProfile() returns null
→ Show profile creation form:
    Name, Company Name (optional), Phone, District, Preferred Crops
→ createBuyerProfile.mutate(data)
→ INSERT buyers table
→ Dashboard reloads with buyer data
```

### 4.2 Marketplace Dashboard (/marketplace/dashboard)

**Layout:**
```
Onboarding banner (if first-time, dismissible via localStorage flag)
  3-step guide: Browse → Place Orders → Track

KPI Cards (3-col):
  Total Products Available
  Fresh Harvest (available_qty > 0)
  Active Orders (not delivered/cancelled)

2-Column Content:
  Left: Fresh Harvest Available
    Top 4 active listings (title, price, qty, location)
    Click → Product Detail

  Right: Your Active Orders
    Top 3 orders (crop, status badge, amount, farmer name)
    Click → Orders page

AI Stock Advisor Panel:
  Button: "Get Stock Recommendations"
  Calls ai-gateway with buyer profile + market context
  Result displayed in scrollable text box
  Disabled if no products in market
```

**UX Assessment:**
- Clear separation of "discover" (left) and "track" (right)
- AI advisor is a differentiating feature but button label is vague — "Get AI Recommendations" would be clearer
- "Fresh Harvest" badge criteria (`available_qty > 0`) is good but no freshness date shown

---

### 4.3 Browse Marketplace (/marketplace/browse)

**Filter Controls (3):**
1. Crop search (text input, live filter)
2. Status filter (All / Active / Sold Out dropdown)
3. Sort (Newest / Price ↑ / Price ↓ / Qty ↑ / Qty ↓)

**Featured Section:**
- Shown only when: no search text + all statuses selected + ≥3 products
- Top 3 products in prominent 3-col grid
- "Nearby" badge if buyer's district matches farmer's district

**Product Grid:**
- Infinite scroll (24 per page, "Load More" button at bottom)
- Product cards: title, price/unit, available qty, location, farmer district
- Hover effect: shadow + slight translate-up
- Click → Product Detail

**Empty State:** Contextual (no products vs. no matches for filter)

**UX Friction:**
- "Load More" is a button, not true infinite scroll (user must explicitly click)
- No map view to browse by geography (only list view)
- No freshness/harvest date shown on listing cards

---

### 4.4 Product Detail (/marketplace/product/:id)

**Content:**
```
Product image (from storage signed URL)
Crop name + variety + status badge
Price per unit + available quantity
Farmer profile: name, village, district, rating
Farm details: soil type, growing practices
Harvest timeline + estimated date
Market price history (mini chart)
"Place Order" form:
  Quantity input (max: available_qty)
  Notes textarea
  Submit → useCreateOrder()
QR code for traceability (links to /trace/listing/:traceCode)
```

**Order Placement:**
```
useCreateOrder.mutate({ listing_id, quantity, notes })
→ INSERT market_orders
→ Farmer notified (notifications table)
→ Payment: Razorpay checkout (create-payment-order → Razorpay)
→ On payment: payment-webhook → update payment_status
```

---

### 4.5 Orders (/marketplace/orders)

**Content:**
- List of all buyer's orders
- Each order: crop name, quantity, amount, status badge, farmer name + contact
- Status color coding (PLACED=blue, CONFIRMED=green, DELIVERED=dark-green, CANCELLED=red)
- Filters: status, date range

---

## 5. Agent User Journey

### 5.1 Dashboard (/agent/dashboard)

**Purpose:** Overview of assigned farmers, pending tasks, and field activity.

**Content:**
```
KPI Cards: Assigned Farmers | Pending Tasks | Today's Visits | Completed Tasks

Today's Tasks (list):
  Task type, linked farmer, status badge, priority
  Click → task detail

My Farmers (quick list):
  Top 5 assigned farmers
  Name, village, crop count
  Click → Farmer Detail

Service Area Map (mini view)
```

**RLS Enforcement:** Agent only sees farmers linked via `agent_farmer_assignments`. All queries are RLS-filtered automatically — no manual filtering in frontend code.

---

### 5.2 Farmer Detail (/agent/farmer/:farmerId)

**Purpose:** 360° view of a specific assigned farmer.

**Sections:**
- Farmer profile: name, phone, village, district, language
- Farmlands list (all parcels)
- Crops list with health status indicators
- Recent activity log
- Agent notes (add new notes, view history)
- Transport requests (assist with coordination)

**Data isolation:** Agent can only reach this page for their assigned farmers (RLS on farmlands, crops, transport_requests).

---

### 5.3 Today's Tasks (/agent/today)

**Content:**
- List of today's field tasks (filtered by date)
- Each task: type badge (verification, visit, data-entry), farmer name, address, priority
- Status update: "Start" → "Complete" buttons
- Form inputs for verification notes
- Photo upload for field evidence

---

## 6. Logistics User Journey

### 6.1 Dashboard (/logistics/dashboard)

**First Visit (No Profile):**
```
OnboardingWizard component:
  Step 1: Name + Phone
  Step 2: Vehicle type + capacity
  Step 3: Operating village + district
→ createProfile.mutate()
→ INSERT transporters + vehicles
→ Dashboard loads with fresh profile
```

**Dashboard Layout:**
```
Header: Title + operating village subtitle
Actions: Refresh (mobile) + Profile button

KPI Grid #1 (4-col):
  Available Loads | Accepted Trips | In Progress | Completed

KPI Grid #2 (4-col, unified engine):
  Forward Trips | Reverse Loads | Capacity | Earnings

2-Column Content:
  Left: Today's Active Trips
    Top 3 trips (crop, status, location, qty)
    Click → Trip Detail

  Right: New Load Requests
    Top 3 available transport requests
    Farmer, crop, qty, date, location
    Click → Available Loads page

Loads Map View (if loads available):
  Google Maps with top 10 loads + operating village pin
  Visual load clustering

AI Suggestions Panel (2 tabs):
  Route Optimization tab:
    "Suggest Best Route" → ai-gateway (route_optimization)
    Result in text box
  Reverse Logistics tab:
    "Find Return Loads" → ai-gateway (reverse_logistics)
    Result in text box
```

---

### 6.2 Available Loads (/logistics/loads)

**Content:**
```
All open transport_requests (status: REQUESTED)
Each load card:
  Farmer name + phone (tap to call)
  Crop + quantity + pickup location
  Destination market
  Preferred date
  Notes
  "Accept Load" button → assigns trip
```

**Filter:** By district, date, crop type.

**Acceptance Flow:**
```
Accept Load → create trips record (status: ASSIGNED)
→ transport_requests status: ASSIGNED
→ Farmer notified
→ Navigate to Active Trips
```

---

### 6.3 Active Trips (/logistics/trips)

**Content:**
- Status filters: `accepted` | `pickup_done` | `in_transit`
- Legacy trips and unified trips shown in separate sections

**Each Trip Card:**
```
Crop name + status badge
Info grid: Farmer | Quantity | Pickup Location | Date
Notes (if any)
Actions:
  "Open Trip" → Trip Detail
  "Open in Maps" → Google Maps directions (tel: + maps link)
  "Call Farmer" → tel: link
```

**Trip Status Progression:**
```
ASSIGNED → EN_ROUTE → PICKED_UP → IN_TRANSIT → DELIVERED → CLOSED
```

---

### 6.4 Trip Detail (/logistics/trip/:id)

**Content:**
- Full trip info (farmer, pickup, destination, cargo, timeline)
- Status update buttons (EN_ROUTE, PICKED_UP, IN_TRANSIT, DELIVERED)
- GPS location updates (logs to trip_location_events)
- Delivery proof upload:
  ```
  → storage-sign-upload-v1 (bucket: trip-proofs)
  → Upload image
  → storage-confirm-upload-v1
  → Update trip with proof_url
  ```
- Trip completion → status: DELIVERED → CLOSED

---

### 6.5 Unified Logistics (Forward + Reverse)

**Forward Trips (/logistics/forward-trips):**
- Trips going village → market
- Managed by unified logistics engine
- Shows capacity remaining, pickup stops, multi-drop points

**Reverse Loads (/logistics/reverse-loads):**
- Return trip opportunities (market → village)
- Cargo: fertilizer, seeds, agricultural inputs, consumer goods
- AI-assisted matching via `reverse_logistics` AI type
- `ReverseLoadCard` component per opportunity

**Capacity View (/logistics/capacity):**
- Per-vehicle capacity breakdown
- Active trips consuming capacity
- Available capacity for new loads

**Earnings View (/logistics/earnings):**
- Trip-by-trip earnings breakdown
- Period filter (week/month)
- Total earned + pending settlement

---

## 7. Admin User Journey

### 7.1 Dashboard (/admin/dashboard)

**Content:**
```
System KPIs: Active Farmers | Open Loads | Active Trips | Pending Orders
Data health indicators (red/amber/green)
Recent activity feed (realtime)
Quick links to ops inbox + pending updates
```

**Data sources:** `useAdminDashboard()`, `useAdminRealtimeSubscriptions()` (live WebSocket updates).

---

### 7.2 Navigation Structure (6 collapsible groups)

| Group | Pages | Icon |
|-------|-------|------|
| **Home** | Dashboard, Ops Inbox, Tickets | Home |
| **Network** | Farmers, Agents, Transporters, Buyers, Crops | Users |
| **Operations** | Transport, Orders, Pending Updates | Activity |
| **AI Intelligence** | AI Console, AI Review | Brain |
| **Finance** | Finance, Payouts, Refunds, Disputes | DollarSign |
| **System** | System Health, Jobs, Data Health, Seed Data, Mysuru Demo | Settings |

Groups collapse/expand with smooth max-height animation. State persists across navigation.

---

### 7.3 Entity 360 View (/admin/entity/:type/:id)

**Purpose:** Deep-inspection view for any entity (farmer, agent, transporter, buyer).

**Content varies by type:**
- **Farmer:** Profile + farmlands + crops + listings + transport requests + orders + agent assignment + notifications
- **Transporter:** Profile + vehicles + trips + earnings
- **Buyer:** Profile + orders + payment history
- **Agent:** Profile + assigned farmers + task history + service area

All data on one page for admin investigation without role switching.

---

### 7.4 Finance Module

- **Finance Overview (`/admin/finance`):** Revenue summary, settlement status, reconciliation status
- **Finance Ops (`/admin/finance/ops`):** Operations center for reconciliation triggers
- **Payouts (`/admin/finance/payouts`):** Farmer/transporter payout processing
- **Refunds (`/admin/finance/refunds`):** Buyer refund management
- **Disputes (`/admin/disputes`):** Cross-party dispute resolution

**Backend:** `finance-admin-api`, `finance-reconcile`, `finance-cron` Edge Functions + `admin-finance-summary`.

---

### 7.5 AI Console (/admin/ai-console)

**Purpose:** Test AI requests, view prompt/response pairs, monitor Gemini usage.

**Features:**
- Send arbitrary AI requests (farmer advisory, route optimization, etc.)
- Inspect raw prompt sent to Gemini + raw response
- Toggle between roles/contexts for testing
- Rate limit status for AI gateway

---

### 7.6 Background Jobs (/admin/jobs)

**Content:**
- Queue depth, active jobs, failed jobs, dead-letter queue
- Job type breakdown (payment reconciliation, load pooling, notifications)
- Manual trigger: enqueue job via `admin-enqueue` Edge Function
- Failed job retry: re-queue with reset retry count

---

## 8. Navigation Structure

### Desktop Navigation (md+ screens)

```
Fixed left sidebar (w-64):
  Logo + role title
  Role subtitle/description
  Nav groups (collapsible for admin, flat for others):
    [Icon] Nav item
    [Icon] Nav item  ← active: left border + bg highlight + bold
  Notification badges on relevant items
  Sign Out button (bottom)

Main content area:
  PageHeader (title + action buttons + back button)
  Page content (p-4 md:p-6)
```

### Mobile Navigation (<md screens)

```
Top header bar:
  [≡] Menu button → opens sidebar drawer
  Page title
  Action buttons (role-specific, e.g., Refresh, Profile)

Sidebar drawer (slide-in from left):
  Same content as desktop sidebar
  Backdrop overlay (click to close)
  Escape key closes
  Body scroll lock when open
  Auto-closes on route change

Bottom tab bar (sticky, h-16):
  4-5 primary nav items (most common for role)
  "More" tab → opens sidebar drawer
  Active tab: primary color icon + label
```

### Active State Indicators
```css
/* Active nav item */
border-left: 3px solid primary
background: primary/10
font-weight: 600
icon: scale(1.1)

/* Inactive nav item */
text-muted-foreground
icon: default size
```

### Notification Badges
- Shown on relevant nav items (e.g., Notifications, Orders, Ops Inbox)
- Count comes from React Query cached data
- Real-time updates via Supabase Realtime subscription

---

## 9. UX Friction Points

### 9.1 Critical Issues (Risk of blank screen or broken flow)

| # | Issue | Location | Root Cause |
|---|-------|---------|-----------|
| C1 | **Blank page on null crash** | All pages without ErrorBoundary | `strictNullChecks=false` + no error boundary = silent crash shows blank screen |
| C2 | **Crop Diary blank page** (fixed) | `/farmer/crops/:id` | `healthStatusConfig[null].icon` → TypeError. Fixed in CropDiary.tsx:87 with `?? 'normal'` |
| C3 | **Vendor dashboard incomplete** | `/vendor/*` | Routes exist and link shown in sidebar, but pages are scaffolded placeholders |

### 9.2 Moderate Issues (Friction, confusion, or missing safety net)

| # | Issue | Location | Impact |
|---|-------|---------|--------|
| M1 | **No password recovery** | Login page | Users who forget passwords have no recovery path |
| M2 | **No phone verification (OTP)** | Signup | Account creation doesn't verify phone ownership |
| M3 | **Lockout countdown only on login** | Signup page | Signup rate-limit errors show static message, not countdown |
| M4 | **Role selector has no instructional label** | Login page | New users may not understand they must select role before login |
| M5 | **No field-level form validation on phone** | Signup Step 2 | Invalid phone format discovered only on submission |
| M6 | **OAuth role lost if tab closed** | Login → Google OAuth | Role stored in `sessionStorage` — lost on tab close before callback |
| M7 | **"Load More" vs. true infinite scroll** | Marketplace Browse | User must manually click button; listings don't auto-load on scroll |
| M8 | **No harvest date on listing cards** | Browse, Dashboard | Buyers can't assess freshness without opening each product |
| M9 | **Map view only in Logistics** | Marketplace Browse | Buyers cannot browse listings by geographic proximity on a map |
| M10 | **Unified logistics dual sections** | Active Trips page | Legacy + unified trips shown in separate sections — confusing for operators |

### 9.3 Minor Improvements (Polish and consistency)

| # | Issue | Location | Suggestion |
|---|-------|---------|-----------|
| m1 | Password strength meter absent | Signup | Add visual strength indicator for rural user guidance |
| m2 | AI advisor button label vague | Marketplace, Logistics | Rename to "Get AI Stock Tips" / "Optimize My Route" |
| m3 | "Show All" toggle not discoverable | Farmer Dashboard | New users with no data may miss the toggle to explore the UI |
| m4 | Missing "back to browse" on Product Detail | Marketplace | No explicit back button — relies on browser back |
| m5 | Status badge color inconsistency | Orders vs. Trips | Different color scales used across roles for similar statuses |
| m6 | No empty state on Admin Entity 360 | Admin | Sections with no data show nothing (no "No data" message) |
| m7 | Sidebar scroll position not preserved | All roles | Navigating deep then returning resets scroll position |
| m8 | Bottom tab bar "More" label ambiguous | Mobile | "More" tab opens sidebar but label doesn't explain what it contains |
| m9 | Notification badge count not real-time on mobile | All roles | Badge count updates only on query refetch, not live push |
| m10 | Language toggle not visible inside dashboards | All dashboards | Language switcher only on landing page — no in-dashboard access |

---

## 10. System Behavior Observations

### 10.1 Loading Strategy
- **Skeleton screens** are universally applied across all dashboard sections
- Skeleton shapes match the final content layout (prevents layout shift)
- React Query `staleTime: 2min` means re-navigation within 2 minutes shows instant cached data
- `refetchOnWindowFocus: false` prevents refetch storms on mobile (app switching)

### 10.2 Error Handling Patterns
- **Network errors:** Most pages show a red alert with a retry button that calls `refetch()`
- **Auth errors:** Handled at the `useAuth` level — invalid sessions redirect to `/login`
- **Mutation errors:** Shown as toast notifications (Sonner library)
- **Missing:** Global ErrorBoundary wrapper — most pages are unprotected against render-time crashes

### 10.3 Realtime Behavior
- Supabase Realtime WebSocket channels open on authenticated dashboard mounts
- Channels: trips, transport_requests, listings, notifications, market_orders
- On DB insert/update event → React Query key invalidated → immediate UI update
- Mobile connection loss → reconnection handled by Supabase client automatically

### 10.4 Offline Behavior
- `network.ts` monitors `navigator.onLine` + `online/offline` events
- On offline: mutations enqueue to IndexedDB (`actions` table)
- Upload offline: file saved as Blob to IndexedDB (`uploads` table)
- UI shows: `SyncIndicator` component (pending sync count)
- On reconnect: action queue drains sequentially, uploads retry with signed URLs
- Dashboard data: loads from IndexedDB cache (React Query persister) if network unavailable

### 10.5 AI Integration Behavior
- AI panels are **embedded** in dashboards, not standalone pages
- AI results are not cached — each button click makes a new request to `ai-gateway`
- Language-aware: AI responses adapt to `preferred_language` (EN/KN)
- Rate-limited at Edge Function level: prevents abuse, degrades gracefully

### 10.6 Voice Assistant
- Floating button on Farmer Dashboard
- Calls `tts-elevenlabs` Edge Function with text content
- Designed for low-literacy rural farmers who prefer audio over text
- Language follows user's `preferred_language` setting

### 10.7 Bilingual System
- Language toggle in Navbar: EN ↔ KN
- Persisted to localStorage (`agrinext_language`)
- Translation engine auto-repairs corrupted Kannada (mojibake) bytes
- Dev warnings fire in console for missing translation keys
- Full parity required: both `en.ts` and `kn.ts` must have identical key structure

### 10.8 Payment Flow
```
Buyer places order
  → create-payment-order Edge Function
  → Razorpay order created (server-side with RAZORPAY_KEY_SECRET)
  → Razorpay JS SDK opens checkout modal
  → User completes payment
  → Razorpay sends webhook to payment-webhook Edge Function
  → HMAC signature verified
  → market_orders.payment_status updated
  → Farmer + admin notified
```

### 10.9 Storage Upload Flow
```
User selects file (crop photo, trip proof, soil report, KYC doc)
  → Check network (offline? → queue to IndexedDB)
  → storage-sign-upload-v1: get signed URL + token
  → supabase.storage.uploadToSignedUrl(signedUrl, file)
  → storage-confirm-upload-v1: mark file as ready
  → Return file_id or path for DB storage
```

### 10.10 Traceability System
- Every listing has a unique `trace_code` (server-generated)
- Public URL: `/trace/listing/:traceCode` (no auth required)
- Shows: farmer name, village, farmland details, crop details, activity log
- QR code on Product Detail links to trace URL
- Enables farm-to-fork verification for buyers and regulators

---

## Summary

### Platform Strengths
1. **Phone-first auth** with thoughtful lockout/retry UX matches the target user base
2. **Role-specific dashboards** with adaptive content zones reduce cognitive load
3. **Offline-first architecture** with action queue handles rural connectivity gaps
4. **AI integration** directly in dashboards provides value without requiring navigation
5. **Reverse logistics** as a first-class concept differentiates from simple delivery apps
6. **Traceability system** builds trust between farmers and buyers
7. **Bilingual support** with voice assistant addresses literacy and language barriers
8. **My Day view** for farmers is an excellent daily driver pattern

### Top Priority Improvements for Phase 4
1. **Add ErrorBoundary** to all page routes (prevents blank screens from null crashes)
2. **Add password recovery flow** (users blocked from platform on forgotten password)
3. **Add OTP phone verification** on signup (security + prevents fake accounts)
4. **Unify legacy and unified logistics** sections (reduce confusion in Active Trips)
5. **True infinite scroll** on Browse page (reduce click friction)
6. **In-dashboard language toggle** (accessibility for rural users mid-session)
7. **Harvest date on listing cards** (critical buying decision factor)

---

*End of User Journey Analysis Report — Phase 3 Complete*
