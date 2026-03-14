# BUYER DASHBOARD UX IMPROVEMENTS
## AgriNext Gen — Phase 4D

> Date: 2026-03-14
> Scope: Buyer/Marketplace Dashboard components only — `src/pages/marketplace/`, `src/components/marketplace/`
> No backend APIs, RPCs, Edge Functions, or other role dashboards were modified.

---

## Original Problems

### 1. OrderStepper — `ready_for_pickup` Rendered as Fractional Step
**Problem:** `OrderStepper.tsx` defined only 4 steps (placed → confirmed → packed → delivered). When an order reached `ready_for_pickup` status, a special-case hack returned `2.5` — a fractional index between `packed` (2) and `delivered` (3). This caused the stepper to render `packed` as "done" and `delivered` as "in progress" simultaneously, with no visible label for the actual current status.

```ts
// BEFORE — hack using fractional index
function getStepIndex(status: string): number {
  if (status === 'ready_for_pickup') return 2.5;
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}
```

**Impact:** Any buyer with an order in `ready_for_pickup` state saw a confusingly half-highlighted stepper with no readable label. The `marketplace.readyForPickup` i18n key existed but was never displayed.

### 2. Dashboard.tsx — Dead `useQuery` Block
**Problem:** `Dashboard.tsx` contained an inline `useQuery` that called `rpcJson('buyer_dashboard_v1')` and destructured `rpcStats`/`rpcLoading`. Neither variable was referenced anywhere in the JSX — dead code that fires a network request on every dashboard load with the result silently discarded.

Additionally, `useMarketplaceDashboardStats` was imported from the hook file but never called (the inline `useQuery` duplicated its purpose). The `rpcJson` import from `@/lib/readApi` existed solely for this dead block.

### 3. Browse.tsx — Wrong i18n Key References
**Problem:** The error state in `Browse.tsx` (network/API failure) used keys `t('errors.loadFailed')` and `t('errors.tryAgain')`. These keys **do not exist** in `en.ts` or `kn.ts` — the `errors` namespace only contains AI, audio, and voice sub-sections. This meant:
- Error heading always showed the English fallback: `'Failed to load products'`
- Error body always showed the English fallback: `'Please check your connection and try again.'`
- The Kannada language setting was silently ignored for the error state

The correct keys (`common.loadError` and `common.retryMessage`) existed all along.

### 4. Hardcoded English Fallbacks Throughout
**Problem:** Six components used the pattern `{t('some.key') || 'English fallback'}` where the i18n key was actually defined. This pattern silently bypasses i18n when the key lookup unexpectedly returns a falsy value (rare, but possible during initialisation). All 126 marketplace keys exist in both `en.ts` and `kn.ts` — fallbacks were unnecessary defensive code that reduced trust in the translation system.

Files affected:
| File | Count | Keys with redundant fallbacks |
|------|-------|-------------------------------|
| `Dashboard.tsx` | 4 | `marketplace.getStarted`, `marketplace.onboardStep1/1Desc/2/2Desc/3/3Desc` |
| `Browse.tsx` | 3 | `marketplace.featured`, `marketplace.nearby` (×2) |
| `Profile.tsx` | 2 | `marketplace.profileCompletion`, `marketplace.profileComplete` |
| `CropSearchInput.tsx` | 1 | `marketplace.recentSearches` |

### 5. ProductDetail.tsx — Hardcoded `'Unknown'` in JSX
**Problem:** When a product's location, village, and district were all missing, the farmer location display fell back to the hardcoded string `'Unknown'`. This bypassed i18n — Kannada users saw English regardless of language setting.

---

## Improvements Made

### 1. OrderStepper — Proper 5-Step Model
**File:** `src/components/marketplace/OrderStepper.tsx`

Added `ready_for_pickup` as a proper 4th step between `packed` and `delivered`, using the existing `marketplace.readyForPickup` i18n key:

```ts
// AFTER — explicit 5-step model, no fractional hacks
const STEPS = [
  { key: 'placed',           labelKey: 'marketplace.placed' },
  { key: 'confirmed',        labelKey: 'marketplace.confirmed' },
  { key: 'packed',           labelKey: 'marketplace.packed' },
  { key: 'ready_for_pickup', labelKey: 'marketplace.readyForPickup' },  // ← new
  { key: 'delivered',        labelKey: 'marketplace.delivered' },
] as const;

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
  // no more fractional 2.5 hack
}
```

**Result:** Buyers with `ready_for_pickup` orders now see a clearly labelled 4th step highlighted with the correct translated label ("Ready for Pickup" / "ಪಿಕಪ್‌ಗೆ ಸಿದ್ಧ").

### 2. Dashboard.tsx — Dead Code Removal
**File:** `src/pages/marketplace/Dashboard.tsx`

Removed:
- The inline `useQuery` block that called `rpcJson('buyer_dashboard_v1')` and produced unused `rpcStats`/`rpcLoading`
- The `import { useQuery } from '@tanstack/react-query'` (sole consumer was the dead block)
- The `import { rpcJson } from '@/lib/readApi'` (sole consumer was the dead block)
- `useMarketplaceDashboardStats` from the hook import (imported but never called)

**Result:** Dashboard no longer fires a redundant RPC network call on every load. Bundle is slightly smaller.

### 3. Browse.tsx — Correct i18n Key References + Fallback Removal
**File:** `src/pages/marketplace/Browse.tsx`

Fixed error state to use existing `common.*` keys:
```tsx
// BEFORE
<h3>{t('errors.loadFailed') || 'Failed to load products'}</h3>     // key missing
<p>{t('errors.tryAgain') || 'Please check...'}</p>                  // key missing
<Button>{t('common.retry') || 'Retry'}</Button>                     // fallback redundant

// AFTER
<h3>{t('common.loadError')}</h3>        // key: common.loadError (en.ts:83)
<p>{t('common.retryMessage')}</p>       // key: common.retryMessage (en.ts:84)
<Button>{t('common.retry')}</Button>    // key: common.retry (en.ts:17)
```

Also removed redundant fallbacks from the Featured and Nearby badges.

### 4. ProductDetail.tsx — i18n for Unknown Location
**File:** `src/pages/marketplace/ProductDetail.tsx`

```tsx
// BEFORE
{product.location || product.land?.village || product.farmer?.village || 'Unknown'}

// AFTER
{product.location || product.land?.village || product.farmer?.village || t('common.unknown')}
```

### 5. Profile.tsx + CropSearchInput.tsx — Fallback Removal
Removed `|| 'English fallback'` patterns from `Profile.tsx` (2 keys) and `CropSearchInput.tsx` (1 key). These keys exist and are translated — the fallbacks were never needed.

---

## Files Modified

| File | Change Summary |
|------|----------------|
| `src/components/marketplace/OrderStepper.tsx` | Added `ready_for_pickup` as step 4 in 5-step model; removed fractional `2.5` hack |
| `src/pages/marketplace/Dashboard.tsx` | Removed dead `useQuery`/`rpcStats`/`rpcLoading` + unused imports; removed 4 i18n fallbacks |
| `src/pages/marketplace/Browse.tsx` | Fixed `errors.loadFailed` → `common.loadError`, `errors.tryAgain` → `common.retryMessage`; removed 3 redundant fallbacks |
| `src/pages/marketplace/ProductDetail.tsx` | `'Unknown'` → `t('common.unknown')` |
| `src/pages/marketplace/Profile.tsx` | Removed 2 redundant i18n fallbacks |
| `src/components/marketplace/CropSearchInput.tsx` | Removed 1 redundant i18n fallback |

## Files NOT Modified
- `src/i18n/en.ts` / `src/i18n/kn.ts` — all 126 marketplace keys already existed; no new keys needed
- `src/pages/marketplace/Orders.tsx` — `statusConfig` already had `ready_for_pickup` at line 29
- All other role dashboards — Phase 4D scope is buyer only
- All backend APIs, RPCs, Edge Functions — unchanged

---

## UX Reasoning

### Why the OrderStepper fix matters for buyers
The `ready_for_pickup` status is the most action-relevant state for a buyer — it means "your order is physically ready and a driver will collect it." Displaying this as a half-highlighted step with no label left buyers uncertain whether anything was happening. The fix makes this critical status explicit and legible on mobile (where the stepper is most commonly viewed).

### Why dead code removal matters beyond clean code
The unused `rpcStats` query was calling the `buyer_dashboard_v1` RPC on every dashboard load. In a low-bandwidth rural setting, every unnecessary network request competes with the fetches that actually populate the UI. Removing it reduces dashboard load time by one RPC round-trip.

### Why i18n fallback removal is a correctness fix
When a key exists but `t()` returns falsy (e.g., during context initialisation or a race condition), the `|| 'English fallback'` pattern silently renders English for Kannada users. Removing the fallbacks ensures the component renders the translated key once available, or nothing — which the user can recognise as a loading state, rather than unexpected English text.

### Why using the right `common.*` keys matters
`errors.loadFailed` and `errors.tryAgain` were being requested but never defined — every call to `t('errors.loadFailed')` was a cache miss returning an empty string, which the `||` fallback then caught. The correct keys (`common.loadError`, `common.retryMessage`) are maintained, translated, and tested. Using them removes a category of silent translation failure.

---

*Phase 4D Complete — Buyer Dashboard UX improvements applied. Next: Phase 4E (Agent Dashboard improvements).*
