# FARMER DASHBOARD UX IMPROVEMENTS
## AgriNext Gen — Phase 4C

> Date: 2026-03-14
> Scope: Farmer Dashboard components only — `src/components/farmer/`, `src/i18n/`
> No backend APIs, RPCs, Edge Functions, or other role dashboards were modified.

---

## Original Problems

### 1. FarmerOnboardingWizard Never Completed
**Problem:** Step 3 "Review Settings" in `FarmerOnboardingWizard.tsx` had `isComplete: false` hardcoded:
```tsx
// BEFORE
{
  icon: TrendingUp,
  titleKey: 'dashboard.onboarding.step3Title',
  descKey: 'dashboard.onboarding.step3Desc',
  route: ROUTES.FARMER.SETTINGS,
  isComplete: false,  // ← always false, no matter what
}
```
This meant the wizard card NEVER disappeared, even for farmers who had added farmlands, crops, and completed their profile. The wizard is designed to `return null` when `allComplete === true`, but with step 3 always failing, `allComplete` could never be true.

**Impact on farmer:** New farmers who did all the right things (added farmland, added crop, filled profile) still saw the "Getting Started" wizard telling them they had incomplete steps. Confusing and demoralizing for first-time users.

### 2. Four Dashboard Components Had Zero i18n Coverage
**Problem:** `FarmlandsSummary`, `HarvestTimeline`, `TransportSection`, and `AdvisoriesList` all used hardcoded English strings with no `useLanguage()` calls. Since 60%+ of target users are Kannada-speaking rural farmers, this meant large portions of the dashboard showed English text even when the app was set to Kannada.

Specific hardcoded strings found:
| Component | Hardcoded English |
|-----------|------------------|
| FarmlandsSummary | "My Farmlands", "X plots • Y acres total", "No farmlands added yet", "Add Your First Farmland", "Show less", "+X more plots", "View all farmlands (X)" |
| HarvestTimeline | "Upcoming Harvests", "No harvests in the next 2 weeks", "Today", "Tomorrow", "X days", "Monitor price", "+X more harvests coming up" |
| TransportSection | "Transport & Pickup", "No active transport requests", "Request Transport", "+X more requests", "Requested", "Assigned", "En Route", "Picked Up", "Delivered", "View all requests" |
| AdvisoriesList | "No notifications yet", "+X more notifications", "View all notifications", "Set your district to see local advisories" |

---

## Improvements Made

### 1. FarmerOnboardingWizard Step 3 Completion Fix
**File:** `src/components/farmer/FarmerOnboardingWizard.tsx`

**Fix:** Added `useFarmerProfile()` hook call and derived step 3 completion from profile data:
```tsx
// AFTER
import { useFarmlands, useFarmerProfile } from '@/hooks/useFarmerDashboard';
// ...
const { profile } = useFarmerProfile();
// ...
{
  isComplete: !!(profile?.full_name && profile?.district),
}
```

**Why `full_name && district`?** These are the two most essential farmer identity fields. A farmer who has set both their name and district is meaningfully "set up" for the platform — they have an identity and can receive localized prices/advisories. This check is safe to falsy-evaluate (returns false while loading), so no flash of incorrect state.

**Result:** The onboarding wizard now correctly hides once a farmer has:
- Added at least one farmland (step 1 ✓)
- Added at least one crop (step 2 ✓)
- Completed name + district in settings (step 3 ✓)

### 2. FarmlandsSummary — Full i18n Coverage
**File:** `src/components/farmer/FarmlandsSummary.tsx`

Added `useLanguage()` hook and replaced all 7 hardcoded English strings with `t()` calls using new i18n keys:
- `farmer.farmlands.myFarmlands` — section title
- `farmer.farmlands.plots` — "plots" label in summary line
- `farmer.farmlands.acresTotal` — "acres total" label
- `farmer.farmlands.noFarmlandsYet` — empty state message
- `farmer.farmlands.addFirstFarmland` — empty state CTA button
- `farmer.farmlands.showLess` / `farmer.farmlands.morePlots` — collapse toggle
- `farmer.farmlands.viewAllFarmlands` — "View all" link

Also uses `common.add` (already existed) for the "Add" button.

### 3. HarvestTimeline — Full i18n Coverage
**File:** `src/components/farmer/HarvestTimeline.tsx`

Added `useLanguage()` hook and replaced all hardcoded strings:
- `farmer.harvest.title` — "Upcoming Harvests" heading
- `farmer.harvest.noHarvestsSoon` — empty state
- `farmer.harvest.moreHarvestsSoon` — "+X more harvests coming up"
- `farmer.harvest.monitorPrice` — action hint on each harvest card
- `common.today` / `common.tomorrow` / `common.days` — urgency badges

### 4. TransportSection — Full i18n Coverage
**File:** `src/components/farmer/TransportSection.tsx`

Added `useLanguage()` hook. The module-level `statusConfig` object held hardcoded English status labels, which couldn't use `t()` (called outside a React component). Fixed by:
1. Renaming `statusConfig` → `statusColors` (color/step only — no labels)
2. Creating `statusLabels` inside the component body where `t()` is available:

```tsx
const statusLabels: Record<string, string> = {
  requested: t('farmer.transport.status.requested'),
  assigned: t('farmer.transport.status.assigned'),
  en_route: t('farmer.transport.status.enRoute'),
  picked_up: t('farmer.transport.status.pickedUp'),
  delivered: t('farmer.transport.status.delivered'),
  cancelled: t('farmer.transport.status.cancelled'),
};
```

All 5 pipeline labels in the progress bar and all badge labels now use the translation system.

New i18n keys added:
- `farmer.transport.requestTransport` — "Request Transport" CTA
- `farmer.transport.noActiveRequests` — empty state
- `farmer.transport.moreRequests` — "+X more requests"
- `farmer.transport.viewAllRequests` — view all link
- `farmer.transport.status.{requested,assigned,enRoute,pickedUp,delivered,cancelled}` — all status labels

### 5. AdvisoriesList — Full i18n Coverage
**File:** `src/components/farmer/AdvisoriesList.tsx`

Added `useLanguage()` hook and replaced all hardcoded English:
- `farmer.advisories.noNotificationsYet` — empty state
- `farmer.advisories.moreNotifications` — "+X more" counter
- `farmer.advisories.viewAll` — "View all notifications" link
- `farmer.advisories.setDistrictAlert` — district alert banner

---

## Files Modified

| File | Change Summary |
|------|---------------|
| `src/components/farmer/FarmerOnboardingWizard.tsx` | Added `useFarmerProfile`; step 3 `isComplete` now derived from `profile?.full_name && profile?.district` |
| `src/components/farmer/FarmlandsSummary.tsx` | Added `useLanguage`; replaced 7 hardcoded strings with `t()` |
| `src/components/farmer/HarvestTimeline.tsx` | Added `useLanguage`; replaced 6 hardcoded strings with `t()` |
| `src/components/farmer/TransportSection.tsx` | Added `useLanguage`; refactored `statusConfig` into `statusColors` + in-component `statusLabels`; replaced 10 strings |
| `src/components/farmer/AdvisoriesList.tsx` | Added `useLanguage`; replaced 4 strings |
| `src/i18n/en.ts` | Added 3 `common.*` keys; 8 `farmer.farmlands.*` keys; 4 `farmer.harvest.*` keys; 10 `farmer.transport.*` keys; 5 `farmer.advisories.*` keys (30 total) |
| `src/i18n/kn.ts` | Mirrored all 30 keys in Kannada |

## Files NOT Modified
- `src/pages/farmer/Dashboard.tsx` — existing layout structure is sound
- `src/components/farmer/QuickActions.tsx`, `FarmerSummaryCard.tsx` — already had i18n
- `src/components/farmer/WeatherWidget.tsx`, `MarketPricesWidget.tsx` — complex, deferred
- `src/components/farmer/MyAgentWidget.tsx` — inline bilingual strings (deferred)
- `src/components/farmer/AgentNotesSection.tsx` — agent-facing content (deferred)
- All other role dashboards — Phase 4C scope is farmer only

---

## UX Reasoning

### Why the onboarding wizard fix matters more than it looks
The wizard card renders on the main dashboard page, prominently above the fold. If it never disappears, farmers who have done everything right still see "Setup Required" — this erodes trust and creates confusion ("Did I do something wrong?"). For low digital literacy users who may not understand why the platform is still showing a setup screen, this is a critical point of abandonment.

### Why i18n coverage is a first-class UX concern for this audience
The target users are rural farmers in Karnataka. Many are more comfortable in Kannada than English. When half the dashboard shows English (FarmlandsSummary, HarvestTimeline, TransportSection, AdvisoriesList were all English-only), the app feels foreign and is harder to trust. Every string now participates in the language-switching system.

### Why status labels can't live in module-level constants
React's `t()` translation function comes from a context hook (`useLanguage`). Hooks can only be called inside React components. Moving status label resolution into the component body — while keeping color/step metadata in the module constant — is the correct React pattern for translatable enum labels.

---

*Phase 4C Complete — Farmer Dashboard UX improvements applied. Next: Phase 4D (Buyer/Marketplace Dashboard improvements).*
