# UX Audit Report — AgriNext Gen

**Date:** March 2025  
**Scope:** Full UI/UX analysis of the multi-role agricultural coordination platform  
**Method:** Codebase scan of pages, components, layouts, navigation, styles, and workflows. No code modifications.

---

## 1. System Overview

AgriNext Gen is a React 18 + Vite 5 + TypeScript SPA with five role-based areas: **Farmer**, **Agent**, **Logistics**, **Buyer (Marketplace)**, and **Admin**. The UI is structured as follows:

- **Routing:** Central `App.tsx` registers public routes (/, /login, /signup, /about, /contact, /trace/listing/:traceCode) and delegates role routes to five route modules: `farmerRoutes`, `agentRoutes`, `logisticsRoutes`, `marketplaceRoutes`, `adminRoutes`. Role roots (/farmer, /agent, /logistics, /marketplace, /admin) redirect to each role’s dashboard. All role routes are wrapped in `ProtectedRoute` with `allowedRoles`.
- **Layout:** Authenticated role areas share a single **DashboardLayout** (`src/layouts/DashboardLayout.tsx`): fixed left **DashboardSidebar** (w-64, hidden on mobile with overlay drawer), sticky **DashboardHeader** (title, search, notifications, profile), and main content area with `p-4 md:p-6`. Sidebar content is selected by `userRole`; one component serves all five roles.
- **Page structure:** Pages use one of three patterns: (1) **PageHeader** (shared) wrapping content with title/subtitle/actions, (2) **PageShell** (layout) with title/subtitle/breadcrumbs/density, or (3) raw content with no shared wrapper. Inconsistency exists across and within roles.
- **Design system:** Tailwind CSS with design tokens in `src/index.css` (HSL variables for background, primary, sidebar, radius, spacing, elevation, motion). Fonts: Plus Jakarta Sans (sans), Outfit (display). shadcn/ui primitives live in `src/components/ui/` (button, card, dialog, table, etc.); app-specific pieces are in `src/components/{role}/`, `src/components/shared/`, and feature folders (crop-diary, listings, geo).
- **Data & state:** TanStack Query (useQuery/useMutation) for server state; role-specific hooks in `src/hooks/` (e.g. useFarmerDashboard, useLogisticsDashboard). No global UI state library beyond React state and auth/language context.
- **i18n:** `useLanguage()` plus `src/i18n/en.ts` and `src/i18n/kn.ts`. Many pages still use hardcoded English strings instead of `t('key')`.

---

## 2. Page Inventory

Every page detected and its route path:

### Public (no auth)
| Page | Path | File |
|------|------|------|
| Index | / | src/pages/Index.tsx |
| Login | /login | src/pages/Login.tsx |
| Signup | /signup | src/pages/Signup.tsx |
| About | /about | src/pages/About.tsx |
| Contact | /contact | src/pages/Contact.tsx |
| Auth Callback | /auth/callback | src/pages/Auth/CallbackHandler.tsx |
| Account Switcher | /account/switch | src/pages/AccountSwitcher.tsx |
| Listing Trace | /trace/listing/:traceCode | src/pages/trace/ListingTrace.tsx |
| Dev Console | /dev-console | src/components/dev/DevConsole.tsx (conditional) |
| Role Select | /onboard/role-select | src/pages/Onboard/RoleSelect.tsx |
| Pending Sync | /pending-sync | src/pages/common/PendingSync.tsx |
| Uploads Manager | /uploads-manager | src/pages/common/UploadsManager.tsx |
| NotFound | * | src/pages/NotFound.tsx |

### Farmer (allowedRoles: farmer)
| Page | Path | File |
|------|------|------|
| Farmer Dashboard | /farmer/dashboard | src/pages/farmer/Dashboard.tsx |
| My Day | /farmer/my-day | src/pages/farmer/MyDay.tsx |
| Crops | /farmer/crops | src/pages/farmer/Crops.tsx |
| Crop Diary | /farmer/crops/:cropId | src/pages/farmer/CropDiary.tsx |
| Farmlands | /farmer/farmlands | src/pages/farmer/Farmlands.tsx |
| Transport | /farmer/transport | src/pages/farmer/Transport.tsx |
| Listings | /farmer/listings | src/pages/farmer/Listings.tsx |
| Orders | /farmer/orders | src/pages/farmer/Orders.tsx |
| Earnings | /farmer/earnings | src/pages/farmer/Earnings.tsx |
| Notifications | /farmer/notifications | src/pages/farmer/Notifications.tsx |
| Settings | /farmer/settings | src/pages/farmer/Settings.tsx |

### Agent (allowedRoles: agent)
| Page | Path | File |
|------|------|------|
| Agent Today | /agent/today | src/pages/agent/Today.tsx |
| Agent Dashboard | /agent/dashboard | src/pages/agent/Dashboard.tsx |
| Tasks | /agent/tasks | src/pages/agent/Tasks.tsx |
| Farmers | /agent/farmers | src/pages/agent/Farmers.tsx |
| My Farmers | /agent/my-farmers | src/pages/agent/MyFarmers.tsx |
| Farmer Detail | /agent/farmer/:farmerId | src/pages/agent/FarmerDetail.tsx |
| Transport | /agent/transport | src/pages/agent/Transport.tsx |
| Profile | /agent/profile | src/pages/agent/Profile.tsx |
| Service Area | /agent/service-area | src/pages/agent/ServiceArea.tsx |

### Logistics (allowedRoles: logistics)
| Page | Path | File |
|------|------|------|
| Logistics Dashboard | /logistics/dashboard | src/pages/logistics/Dashboard.tsx |
| Available Loads | /logistics/loads | src/pages/logistics/AvailableLoads.tsx |
| Active Trips | /logistics/trips | src/pages/logistics/ActiveTrips.tsx |
| Completed Trips | /logistics/completed | src/pages/logistics/CompletedTrips.tsx |
| Vehicles | /logistics/vehicles | src/pages/logistics/Vehicles.tsx |
| Trip Detail | /logistics/trip/:id | src/pages/logistics/TripDetail.tsx |
| Profile | /logistics/profile | src/pages/logistics/Profile.tsx |
| Service Area | /logistics/service-area | src/pages/logistics/ServiceArea.tsx |

### Marketplace / Buyer (allowedRoles: buyer)
| Page | Path | File |
|------|------|------|
| Marketplace Dashboard | /marketplace/dashboard | src/pages/marketplace/Dashboard.tsx |
| Browse | /marketplace/browse | src/pages/marketplace/Browse.tsx |
| Product Detail | /marketplace/product/:id | src/pages/marketplace/ProductDetail.tsx |
| Orders | /marketplace/orders | src/pages/marketplace/Orders.tsx |
| Profile | /marketplace/profile | src/pages/marketplace/Profile.tsx |

### Admin (allowedRoles: admin)
| Page | Path | File |
|------|------|------|
| Admin Dashboard | /admin/dashboard | src/pages/admin/Dashboard.tsx |
| Farmers | /admin/farmers | src/pages/admin/Farmers.tsx |
| Agents | /admin/agents | src/pages/admin/Agents.tsx |
| Transporters | /admin/transporters | src/pages/admin/Transporters.tsx |
| Buyers | /admin/buyers | src/pages/admin/Buyers.tsx |
| Crops | /admin/crops | src/pages/admin/Crops.tsx |
| Transport | /admin/transport | src/pages/admin/Transport.tsx |
| Orders | /admin/orders | src/pages/admin/Orders.tsx |
| AI Console | /admin/ai-console | src/pages/admin/AIConsole.tsx |
| Seed Data | /admin/seed-data | src/pages/admin/SeedData.tsx |
| Mysuru Demo | /admin/mysuru-demo | src/pages/admin/MysruDemoSeed.tsx |
| Data Health | /admin/data-health | src/pages/admin/DataHealth.tsx |
| Pending Updates | /admin/pending-updates | src/pages/admin/PendingUpdates.tsx |
| Ops Inbox | /admin/ops | src/pages/admin/OpsInbox.tsx |
| Entity 360 | /admin/entity/:type/:id | src/pages/admin/Entity360.tsx |
| Tickets | /admin/tickets | src/pages/admin/Tickets.tsx |
| AI Review | /admin/ai-review | src/pages/admin/AiReview.tsx |
| Jobs | /admin/jobs | src/pages/admin/Jobs.tsx |
| Finance | /admin/finance | src/pages/admin/Finance.tsx |
| Finance Ops | /admin/finance/ops | src/pages/admin/FinanceOps.tsx |
| Refunds | /admin/finance/refunds | src/pages/admin/Refunds.tsx |
| Payouts | /admin/finance/payouts | src/pages/admin/Payouts.tsx |
| Disputes | /admin/disputes | src/pages/admin/Disputes.tsx |
| System Health | /admin/system-health | src/pages/admin/SystemHealth.tsx |

**Total:** 13 public/common + 11 farmer + 9 agent + 8 logistics + 5 marketplace + 24 admin = **60 distinct pages**.

---

## 3. Navigation Map

### Public/marketing
- **Navbar** (src/components/Navbar.tsx): Home, Marketplace, About, Contact; when authenticated: “My Dashboard” (role-specific) and Sign Out. No sidebar on public pages.
- Role roots redirect: /farmer → /farmer/dashboard, /buyer → /marketplace/dashboard, /agent → /agent/dashboard, /admin → /admin/dashboard. /logistics is handled inside logisticsRoutes with `<Navigate to="/logistics/dashboard" />`.

### Farmer dashboard
Sidebar (DashboardSidebar, farmerNavItems): My Day, Dashboard, Crops, Farmlands, Transport, Listings, Orders, Earnings, Notifications (with badge), Settings.

### Agent dashboard
Sidebar: Today, Dashboard, My Tasks, My Farmers, Farmers & Crops, Transport, Service Area, Profile.

### Logistics dashboard
Sidebar: Dashboard, Available Loads, Active Trips, Completed, My Vehicles, Service Area, Profile.

### Buyer (marketplace) dashboard
Sidebar: Dashboard, Browse Products, My Orders, Profile.

### Admin dashboard
Sidebar (22 items, flat list): Dashboard, Ops Inbox, Tickets, Farmers, Agents, Transporters, Buyers, All Crops, Transport, Orders, Pending Updates, AI Review, Jobs, Finance, Payouts, Refunds, Disputes, System Health, AI Console, Seed Data, Mysuru Demo, Data Health.

### Observations
- No breadcrumbs in layout; only PageShell supports optional breadcrumbs, rarely used.
- Admin has no grouping (e.g. People, Operations, Finance, System); long list reduces discoverability.
- Agent: “My Farmers” and “Farmers & Crops” both use Users icon; Admin: “Orders” and “Pending Updates” both use ClipboardList.
- Logistics sidebar uses CropIcon for “Completed” (intended for completed trips), which is semantically off.
- All role sidebars live in one component; nav items are selected by `userRole` (DashboardSidebar.tsx lines 128–137).

---

## 4. UX Problems Identified

### Information architecture
- **Redundant entry points:** “Dashboard” vs “My Day” (farmer) and “Dashboard” vs “Today” (agent) create two similar entry points per role without clear differentiation in the nav labels.
- **Missing sections:** No dedicated “Help” or “Support” in any role sidebar; support flows rely on Tickets (admin) or implicit flows.
- **Trace route:** Public trace at `/trace/listing/:traceCode` is not linked from Navbar or footer; discoverability depends on external sharing.

### Navigation
- **Single 22-item admin menu:** No collapsible groups or categories; scrolling and scanning are heavy (DashboardSidebar.tsx adminNavItems).
- **Duplicate icons:** Same icon for different items (see Section 5) causes visual ambiguity.
- **Header search non-functional:** DashboardHeader (lines 141–146) renders a search Input with no `value`, `onChange`, or search behavior for all roles.
- **Settings/profile inconsistency:** Farmer has “Settings”; Agent/Logistics/Buyer have “Profile”; Admin has “Data Health” near the end. Paths differ (e.g. /farmer/settings vs /agent/profile).

### Forms and actions
- **Signup.tsx size:** Single ~500-line component; role selection, validation, and submit logic are not split into subcomponents or hooks, hurting maintainability and clarity.
- **Farmer Transport form:** Long form with many fields (crop, quantity, pickup, village, origin/dest district, date, time, notes); no progressive disclosure or steps.
- **No persistent draft:** Creating transport request or listing has no “Save draft” or recovery if user navigates away.

### Feedback and errors
- **Single ErrorBoundary:** Only one ErrorBoundary at App level (App.tsx line 70). A single null reference or thrown error in any page can blank the whole app with only a generic “Something went wrong” and Reload (ErrorBoundary.tsx).
- **ProtectedRoute timeout:** After 5s without role, user is redirected to login with state message; message is shown on Login via effect, but the flow is easy to miss.
- **Toast vs inline errors:** Mix of toast (useToast/sonner) and inline error divs; no consistent pattern for form validation display.

### Role-specific
- **DashboardHeader and farmer hooks:** Header always calls `useFarmerNotifications()` and `useFarmerProfile()` (DashboardHeader.tsx 31–32). For agent/logistics/buyer/admin this is unnecessary and may cause no-op or incorrect UI (e.g. notification count) when data is scoped to farmer.
- **Agent Dashboard:** No loading or error UI; if child components or RPC fail, the page can show partial or blank content (agent/Dashboard.tsx).
- **Marketplace Browse:** Title and empty copy are hardcoded (“Browse Marketplace”, “No products found”, etc.); filter/sort labels are English-only (Browse.tsx).

---

## 5. Component Inconsistencies

### Stat / KPI cards
- **KpiCard** (src/components/dashboard/KpiCard.tsx) is used on Logistics Dashboard, Marketplace Dashboard, and Admin Dashboard with consistent label/value/icon/priority.
- **Farmer Crops, Farmlands, Transport** use custom stat blocks: Card + CardContent + inline icon + `text-2xl font-bold` + label (e.g. Crops.tsx 150–218, Farmlands.tsx 128–185, Transport.tsx 174–229). Visual style (icon in colored box, two-line stat) differs from KpiCard (icon in muted box, single value line).
- **Agent Today** uses simple Cards with centered text (Today.tsx 110–133), again different from KpiCard.

**Recommendation:** Standardise on KpiCard (or one canonical stat card) and reuse for all dashboards and list summaries.

### Empty states
- **EmptyState** (src/components/shared/EmptyState.tsx): icon, title, description, optional action button. Used on Farmer (Crops, Farmlands, Transport), Logistics Dashboard, Marketplace Dashboard, Admin Dashboard.
- **DataState** (src/components/ui/DataState.tsx): loading, empty, error with optional retry. Used with `loading` or `empty` and children; renders Loader2, Inbox, or AlertTriangle. Used on Crops, Farmlands, Transport, ActiveTrips, AvailableLoads, Browse, Orders, etc.
- **Inline empty:** Some pages use custom empty blocks (e.g. Admin Dashboard recent activity EmptyState; Logistics dashboard cards with EmptyState inside CardContent). DataState empty variant does not support an action button; EmptyState does.

**Result:** Two primitives (EmptyState vs DataState empty) and ad-hoc inline empty UI; copy and visuals are not unified.

### Page wrappers
- **PageHeader** (src/components/shared/PageHeader.tsx): accepts title, subtitle, actions, children. Used by Farmer Dashboard, Agent Dashboard, Logistics Dashboard, Marketplace Dashboard, Admin Dashboard, and many list/detail pages.
- **PageShell** (src/components/layout/PageShell.tsx): title, subtitle, actions, breadcrumbs, density, children. Used by ActiveTrips, Browse, and several logistics/admin pages.
- **Neither:** Some pages (e.g. CropDiary, some admin pages) use only DashboardLayout and then Card or custom layout. PageShell supports breadcrumbs and density; PageHeader does not. No single convention for “page title + actions.”

### Buttons and links
- **Primary actions:** Mix of `<Button>`, `<Button variant="hero">`, and `<Button variant="default">`. Hero is used on Login and Navbar CTA; default is used for in-dashboard CTAs. No clear rule for when to use hero vs default.
- **Internal navigation:** Most use `<Link to={ROUTES...}>` or `navigate()`. Marketplace Browse uses string `/marketplace/product/${product.id}` (Browse.tsx 139, 181) instead of `ROUTES.MARKETPLACE.PRODUCT_DETAIL(product.id)`.

### Status badges
- **Transport status colors** are redefined in multiple files with different mappings:
  - Farmer Transport (Transport.tsx 55–63): open, requested, assigned, accepted, in_progress, completed, cancelled.
  - Logistics Dashboard (Dashboard.tsx 37–46): requested, assigned, en_route, picked_up, in_progress, delivered, completed, cancelled.
  - ActiveTrips (ActiveTrips.tsx 21–29): created, accepted, pickup_done, in_transit, delivered, completed, cancelled.
- **Crop/listing status:** Crops page uses statusConfig (growing, one_week, ready, harvested); Browse uses statusColors/statusLabels (active, draft, sold_out, ready, one_week, growing). Naming and color sets are not shared.

### Modals and dialogs
- **ConfirmDialog** (ui/confirm-dialog) used for delete/cancel confirmations (Crops, Farmlands, Transport).
- **EditCropDialog, EditFarmlandDialog, RequestTransportDialog:** Role-specific dialogs; structure is consistent (open, onOpenChange, payload) but not from a single dialog template.
- **TaskCompletionModal, AgentVoiceNoteDialog, etc.:** Various modal patterns without a single “form modal” or “confirmation modal” standard.

---

## 6. Missing UX States

### Loading
- **Agent Dashboard** (Dashboard.tsx): No loading or skeleton; children (AgentSummaryCards, TodaysTaskList, etc.) may render before data is ready, or show nothing.
- **Agent Today:** Has Skeleton for “Quick Stats” (dashLoading) and for task list (tasksLoading), but no full-page loading state if both are loading.
- **Several admin list pages:** Use DataState(loading) or Skeleton; some (e.g. Entity360, OpsInbox) have loading, others may not.
- **Farmer Dashboard:** Has DashboardSkeleton and loading branch; good.
- **Logistics/Marketplace/Admin dashboards:** Use Skeleton or loading branches; good.

### Empty
- **Agent Dashboard:** No explicit empty state if assigned_farmers_count is 0 or there are no tasks; components may render empty lists with no unified “Get started” message.
- **DataState empty:** Used in many places but often without an action (e.g. “Add first crop”) when the page supports create; EmptyState is used where an action is needed. So “empty” is covered in places by DataState, in others by EmptyState, and in others not at all.
- **Admin Ops Inbox:** Has filters and list; empty state depends on DataState or list length; not audited in detail for every admin page.

### Error
- **Farmer Dashboard:** Has isError branch with retry (Dashboard.tsx 60–76). Good.
- **Agent Dashboard:** No error handling; if useQuery or RPC fails in child components, no page-level error or retry.
- **DataState:** Supports `error` and `retry`; many pages pass only `loading` and `empty`, not `error` from useQuery (e.g. Crops, Farmlands use DataState(loading) but handle isError separately or not at all in some flows).
- **Logistics Dashboard:** Profile loading and missing profile are handled; stats/trips/loads errors may surface only as empty or via toast.

### Success
- **Mutations:** Most create/update/delete flows use toast on success (e.g. Crops add, Farmlands add, Transport request). No consistent “success state” in the UI (e.g. temporary checkmark or success banner) beyond toast.
- **No optimistic updates:** Lists refetch after mutation; no optimistic add/remove for perceived performance.

---

## 7. Workflow Problems

### Farmer
- **Onboarding:** After signup, user lands on role dashboard. Farmer dashboard shows OnboardingTour and FarmerLocationPrompt; no forced “Add first farmland” or “Add first crop” sequence. Users can open Crops or Listings without having farmlands/crops.
- **Add crop:** Requires farmland selection; if no farmlands, message says “add farmland first” with link to /farmer/farmlands. Flow is clear but easy to miss if user goes to Crops first.
- **Request transport:** Multi-field form; no wizard or steps. Origin/destination district selectors and preferred time are optional but add cognitive load. No summary step before submit.
- **Listing flow:** Not fully audited; Listings page exists; traceability and evidence upload are separate components. Flow from crop → listing → orders could be long.

### Buyer
- **Browse → Product → Order:** Browse has filters and sort; product detail page exists; order placement flow not fully traced. Empty “Your Active Orders” on dashboard has “Browse products” CTA; good.
- **Marketplace dashboard:** Requires buyer profile; if missing, only “Create profile” CTA is shown. Good. After creation, dashboard shows KPIs and product/order previews.

### Logistics
- **First-time:** Transporter profile required; Dashboard shows “Create profile” card if missing. Good.
- **Accept load → Trip detail → Updates:** Available Loads list; accept leads to trip; TripDetail page for status updates. Proof capture and issue reporting exist (ProofCaptureDialog, IssueReportDialog). Flow is present but not validated step-by-step.
- **AI suggestions:** Route optimization and reverse logistics buttons call Edge Function; results shown in ActionPanel. No loading state on the panel content beyond button disabled.

### Agent
- **Today vs Dashboard:** “Today” shows task list and overdue; “Dashboard” shows summary cards, task list, crops near harvest, AI insights, pending transport. Overlap between Today and Dashboard may confuse “where do I start?”
- **Task completion:** TaskCompletionModal; start visit and start task are separate actions. Flow is reasonable but labels like “Start visit” (Mic icon) could be clearer.
- **Service area:** If agent has no service areas, Today page shows “Set up your service area” button; good. No forced onboarding order.

### Admin
- **Ops Inbox:** Tabs for item types (Tickets, Stuck Trips, Stuck Orders, etc.); geo filters. Many admin pages are list/detail (Farmers, Agents, Transport, Orders, etc.). No single “admin onboarding” or “first steps” workflow.
- **Quick actions on Dashboard:** Links to Manage Farmers, Manage Agents, etc.; use `<a href={ROUTES.ADMIN...}>` causing full navigation; consistent with SPA but different from other Button+Link patterns.

---

## 8. Mobile Responsiveness Issues

### Layout
- **DashboardLayout:** Sidebar is off-canvas on mobile (fixed, translate-x, overlay). Main content has `md:pl-64`; on small screens content is full width. Header has hamburger to open sidebar. Body scroll lock when sidebar open is applied (DashboardLayout.tsx). Good.
- **Breakpoint:** `useIsMobile()` uses 768px (tailwind `md`). Sidebar visibility and header layout switch at that point.

### Touch targets
- **Navbar:** Mobile buttons use `min-h-[44px]` (Navbar.tsx 151–168). Good.
- **Dashboard:** Most action buttons (e.g. “Add crop”, “New request”, task row buttons) do not set min height. shadcn Button default is smaller; on touch devices these can be under 44px. TaskRow in Today.tsx (buttons for start, visit, complete) are size="sm" with no min height.
- **Tables:** Admin and list pages use Table or Card lists; on small screens tables may horizontally scroll or wrap. Not all list UIs use a card-based mobile layout; some rely on responsive grid (e.g. Farmer Crops grid).

### Typography and density
- **PageHeader/PageShell:** Title is `text-2xl` or `text-lg`; no explicit mobile scale-down in the shared components. Content density (PageShell density prop) is not set per-role or per-breakpoint.
- **Sidebar:** Nav items are `py-2.5`, `text-sm`; acceptable. Long labels (e.g. “Farmers & Crops”, “Pending Updates”) can wrap on narrow sidebar; no truncation.

### Overflow and scrolling
- **Main content:** `main` has `p-4 md:p-6`; no max-width on content; long tables or wide grids can cause horizontal scroll on mobile.
- **Modals/Dialogs:** DialogContent often has `max-w-md` or similar; should be safe on mobile. Long forms (e.g. Transport request, Signup) scroll inside dialog; no sticky submit button.

### Mobile-specific features
- **Header search:** On mobile, search is toggled (searchOpen); when open, it’s in a separate bar below header. The search itself is still non-functional (no handler).
- **Notifications:** Dropdown in header; works on touch. Farmer notification badge in sidebar is visible when sidebar is open.

---

## 9. Priority Fix List

### CRITICAL
1. **Add ErrorBoundary per route or per role section** so a single component error does not blank the entire app. Option: wrap each route’s element or each role’s route group in ErrorBoundary with role-appropriate fallback.
2. **Fix DashboardHeader role coupling:** Do not call `useFarmerNotifications()` and `useFarmerProfile()` when `userRole` is not farmer. Use role-specific hooks or conditional fetch so notification count and profile are correct for agent/logistics/buyer/admin.
3. **Resolve page wrapper inconsistency:** Choose one primary pattern (PageHeader vs PageShell) and migrate all role pages to it, or clearly define when to use which (e.g. PageShell for pages with breadcrumbs/density). Document in component rules.
4. **Add loading and error states to Agent Dashboard:** Use same pattern as Farmer Dashboard (skeleton + isError branch with retry) so the page never renders partial or blank on load/failure.

### HIGH
5. **Group or collapse Admin sidebar items** (e.g. People, Operations, Finance, System, Data) to improve discoverability and reduce scroll.
6. **Replace duplicate stat card implementations with KpiCard** on Farmer Crops, Farmlands, Transport and Agent Today so all dashboards share one stat card component.
7. **Give distinct icons to Agent “My Farmers” vs “Farmers & Crops” and Admin “Orders” vs “Pending Updates”** to avoid confusion.
8. **Implement or remove header search:** Either wire search to a global command palette or role-scoped search, or remove the search input and free space.
9. **Enforce minimum touch target size (e.g. 44px) for primary action buttons and task row actions** on mobile (e.g. via shared Button variant or utility class).
10. **Replace hardcoded strings with i18n** on Agent Today, Marketplace Browse, and other identified pages (use `t('...')` and add keys to en.ts and kn.ts).

### MEDIUM
11. **Centralise transport status (and other status) badge config** in one module (e.g. constants or theme) and reuse across Farmer Transport, Logistics Dashboard, ActiveTrips, and any other transport UI.
12. **Unify empty state handling:** Prefer one primitive (e.g. EmptyState with optional loading/error) or clearly document when to use EmptyState vs DataState; add action button support to DataState empty variant if needed.
13. **Use ROUTES constants everywhere:** Replace string literals (e.g. in Marketplace Browse) with `ROUTES.MARKETPLACE.PRODUCT_DETAIL(id)`.
14. **Improve accessibility:** Add aria-labels to icon-only buttons and key interactive elements; ensure focus order and live regions where content updates (e.g. notifications).
15. **Break Signup into smaller components or hooks** (e.g. RoleStep, PhoneStep, PasswordStep, Submit) for clarity and reuse.

### LOW
16. **Fix logistics sidebar icon for “Completed”** (use CheckCircle or list icon instead of CropIcon).
17. **Add breadcrumbs to key flows** (e.g. Farmer Crop Diary, Admin Entity 360) using PageShell breadcrumbs.
18. **Consider “My Day” vs “Dashboard” and “Today” vs “Dashboard”** naming and content split so the two entry points have clearly different purposes or merge into one.
19. **Add success state feedback** (e.g. short-lived checkmark or banner) for critical mutations in addition to toast.
20. **Document button variant usage** (hero vs default vs outline) in UI guidelines so new features stay consistent.

---

## 10. Preparation for UX Redesign

Before a visual or interaction redesign:

1. **Stabilise structure**
   - Implement the CRITICAL and HIGH items above so error handling, role-specific header, page shell, and loading/empty/error states are consistent. This prevents redesign from being applied on a shifting base.

2. **Component audit**
   - Complete the migration to KpiCard and a single empty-state pattern; centralise status badge config. This reduces the number of “special cases” designers and developers must account for.

3. **Navigation and IA**
   - Finalise Admin sidebar grouping (or a new IA) and fix duplicate icons and non-functional search. Have a clear map of “entry point per role” (e.g. one primary dashboard vs secondary hubs like Today).

4. **i18n and copy**
   - Replace remaining hardcoded strings and add missing keys so redesign can treat copy as a single layer (en/kn) and avoid mixing “new UI” with “old copy.”

5. **Accessibility baseline**
   - Add aria-labels and basic keyboard/live-region support so redesign can build on an a11y-aware base rather than retrofitting.

6. **Design tokens**
   - Existing CSS variables (colour, radius, spacing, motion) are in place; ensure any redesign extends or replaces these in one place (e.g. index.css and tailwind.config) rather than scattering overrides.

7. **Documentation**
   - Document the chosen page wrapper, stat card, empty state, and button patterns in the project’s UI/component rules so future work and redesign stay aligned.

Once these are in place, a UX redesign can focus on visual hierarchy, typography, spacing, and interaction details without being blocked by structural gaps, missing states, or inconsistent components.
