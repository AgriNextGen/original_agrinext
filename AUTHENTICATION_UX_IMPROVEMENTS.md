# AUTHENTICATION UX IMPROVEMENTS
## AgriNext Gen — Phase 4B

> Date: 2026-03-14
> Scope: Auth pages only (`src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/i18n/`)
> No backend, dashboard, or Edge Function logic was modified.

---

## Original Problems

### 1. Signup Password Field Had No Visibility Toggle
**Problem:** `src/pages/Signup.tsx` Step 2 had a password field with `type="password"` and no toggle:
```tsx
// BEFORE (Signup.tsx)
<Input
  id="password"
  type="password"
  ...
  className="pl-10 h-12"
/>
// No Eye/EyeOff button — user cannot verify what they typed
```
Login.tsx already had a fully functional show/hide toggle (`Eye`/`EyeOff` from lucide-react, `showPassword` state). The inconsistency meant:
- New users creating an account could not verify their password before submitting
- Typos in password at signup = locked out immediately, with no recovery path shown
- Login page had the feature; signup page did not — same app, inconsistent UX

### 2. Login Right-Side Hero Was Static for 5 of 6 Roles
**Problem:** `src/pages/Login.tsx` lines 454–463 only rendered a role-specific headline for `logistics`:
```tsx
// BEFORE (Login.tsx)
{selectedRole === 'logistics'
  ? t('auth.heroTitleLogistics')
  : t('auth.welcomeToAgriNextGen')}   // ← generic for farmer, buyer, agent, admin, vendor
```
For every role except logistics, the right-side hero showed the same generic text:
- "Welcome to AgriNext Gen"
- "Connect with buyers, manage your farm..."

This was incorrect for buyers (who don't manage a farm), agents (who verify listings), admins, and vendors. The hero panel was a missed opportunity to reinforce role identity and intent at the login step.

---

## Improvements Made

### 1. Password Visibility Toggle in Signup (Signup.tsx)
**Fix:** Added the same Eye/EyeOff toggle pattern from Login.tsx:
- Imported `Eye, EyeOff` from lucide-react (line 6)
- Added `const [showPassword, setShowPassword] = useState(false)` to state declarations
- Changed `type="password"` → `type={showPassword ? "text" : "password"}`
- Added `pr-10` to Input className (right padding to avoid button overlap)
- Added toggle button: `absolute right-3 top-1/2 -translate-y-1/2`, `tabIndex={-1}` (not in tab order)

```tsx
// AFTER (Signup.tsx)
<Input
  type={showPassword ? "text" : "password"}
  className="pl-10 pr-10 h-12"
  ...
/>
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
  tabIndex={-1}
>
  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
</button>
```

Now both Login and Signup have consistent password visibility UX.

### 2. Role-Specific Hero for All 6 Roles (Login.tsx)
**Fix:** Replaced the binary ternary with a role-keyed lookup object:
```tsx
// AFTER (Login.tsx)
<h2 className="text-4xl font-display font-bold mb-4">
  {({
    farmer: t('auth.heroTitleFarmer'),
    buyer: t('auth.heroTitleBuyer'),
    agent: t('auth.heroTitleAgent'),
    logistics: t('auth.heroTitleLogistics'),
    vendor: t('auth.heroTitleVendor'),
    admin: t('auth.heroTitleAdmin'),
  } as Record<string, string>)[selectedRole] ?? t('auth.welcomeToAgriNextGen')}
</h2>
```
The `??` fallback ensures that if `selectedRole` is empty string (page first load, no role selected) the generic text still shows.

Each role now has a distinct, role-appropriate hero headline and subtitle:

| Role | Headline | Subtitle focus |
|------|----------|----------------|
| Farmer | Grow More. Earn More. | Crop tracking, market prices, buyer connection |
| Buyer | Source Fresh. Buy Smart. | Verified produce, direct pricing |
| Agent | Empower Farmers. Grow Your Network. | Portfolio management, verification, district adoption |
| Logistics | Deliver Smarter. Earn More. | Route optimization, return loads (existing) |
| Vendor | Reach Rural Markets. | Supply inputs to verified farmers |
| Admin | Full Platform Visibility. | Operations monitoring, dispute resolution |

---

## Files Modified

| File | Change Summary |
|------|---------------|
| `src/pages/Signup.tsx` | Added `Eye, EyeOff` import; `showPassword` state; pw visibility toggle button |
| `src/pages/Login.tsx` | Replaced binary logistics ternary with 6-role lookup object for hero title + subtitle |
| `src/i18n/en.ts` | Added `heroTitleFarmer/Buyer/Agent/Admin/Vendor` + `heroSubtitle*` (10 new keys) |
| `src/i18n/kn.ts` | Mirrored all 10 keys in Kannada |

## Files NOT Modified
- `supabase/functions/signup-by-phone/` — API contract unchanged
- `supabase/functions/login-by-phone/` — API contract unchanged
- `src/hooks/useAuth.tsx` — auth context unchanged
- `src/pages/Onboard/RoleSelect.tsx` — not on primary auth path
- Dashboard pages — out of Phase 4B scope

---

## UX Reasoning

### Why password visibility is critical at signup (not just login)
At login, a wrong password triggers a clear error: "Invalid credentials." The user can retry.
At signup, a typo in the password creates an account the user immediately cannot log in to — they don't know what password they just set. This is a deadlock state. Visibility toggle at signup is therefore more important than at login, not less.

### Why role-specific hero text matters
The login page is the last branded touchpoint before the user enters their role-specific dashboard. Showing a farmer "Connect with buyers, manage your farm" is accurate but generic. Showing a buyer the same text is wrong — the buyer does not manage a farm. Showing an admin "Connect with buyers" is actively misleading. Role-specific copy:
- Confirms to the user they selected the correct role before submitting credentials
- Reinforces the value proposition specific to their workflow
- Reduces support tickets from users who logged in with the wrong role

### Why a lookup object instead of chained ternaries
A `selectedRole === 'a' ? ... : selectedRole === 'b' ? ...` chain for 6 roles is 12 conditions and unmaintainable. A keyed object is O(1) lookup, readable, and trivially extensible when a 7th role (e.g., vendor-lite) is added.

### Why `tabIndex={-1}` on the Eye button
The Eye toggle is a usability helper, not a form action. Including it in tab order would interrupt the keyboard flow: Name → Phone → Password → Eye toggle → Submit. With `tabIndex={-1}`, keyboard users tab directly from the password field to the submit button, while mouse/touch users can still click the Eye icon.

---

## Navigation / UX Consistency Summary

| Before | After |
|--------|-------|
| Signup password field: no visibility toggle | Signup password field: Eye/EyeOff toggle (matches Login) |
| Login hero: role-specific only for logistics | Login hero: role-specific for all 6 roles |
| Buyer logging in sees "manage your farm" | Buyer sees "Source Fresh. Buy Smart." |
| Admin logging in sees generic welcome | Admin sees "Full Platform Visibility." |
| Vendor logging in sees generic welcome | Vendor sees "Reach Rural Markets." |

---

*Phase 4B Complete — Authentication UX improvements applied. Next: Phase 4C (Dashboard improvements).*
