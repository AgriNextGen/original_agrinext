# I18N Guidelines

> Internationalization rules for AgriNext Gen.
> All user-visible text MUST use the translation system.
> Two languages: English (en) and Kannada (kn).

---

## 1. System Overview

| File | Role |
|------|------|
| `src/i18n/en.ts` | English translations — canonical source of truth |
| `src/i18n/kn.ts` | Kannada translations |
| `src/i18n/index.ts` | Translation engine with mojibake repair and fallback chain |
| `src/i18n/aliases.ts` | Key aliases for backward compatibility |
| `src/hooks/useLanguage.tsx` | React hook providing `t()`, `language`, `setLanguage` |

### How It Works

1. User selects language (stored in `profiles.preferred_language`).
2. `useLanguage()` provides `t(key)` which resolves:
   - Current language → alias resolution → English fallback → key's last segment.
3. Kannada strings pass through mojibake detection and UTF-8 repair.
4. Missing keys log console warnings in development.

---

## 2. The Non-Negotiable Rule

**Every user-visible string in a component or page MUST use `t('key')`.**

```tsx
// CORRECT
const { t } = useLanguage();
return <h1>{t('farmer.dashboard.title')}</h1>;

// WRONG — hardcoded English
return <h1>My Dashboard</h1>;

// WRONG — template literal with hardcoded text
return <h1>{`Welcome, ${name}`}</h1>;

// CORRECT — template with translated prefix
return <h1>{t('farmer.dashboard.welcome')}, {name}</h1>;
```

---

## 3. Translation Key Structure

### Naming Convention

Keys use dot-separated namespaces following this hierarchy:

```
{scope}.{domain}.{element}
```

| Level | Examples | Description |
|-------|----------|-------------|
| scope | `common`, `nav`, `errors`, `farmer`, `agent`, `logistics`, `marketplace`, `admin` | Top-level domain |
| domain | `dashboard`, `crops`, `transport`, `orders`, `auth`, `settings` | Feature area |
| element | `title`, `subtitle`, `addButton`, `emptyTitle`, `emptyDesc`, `deleteConfirm` | Specific text |

### Examples

```
common.save                     → "Save"
common.loading                  → "Loading..."
common.retry                    → "Retry"

nav.dashboard                   → "Dashboard"
nav.myDay                       → "My Day"
nav.group.overview              → "Overview"

errors.loadFailed               → "Failed to load data"
errors.operationFailed          → "Operation failed"
errors.pageLoadFailed           → "Could not load this page"

farmer.crops.title              → "My Crops"
farmer.crops.addCrop            → "Add Crop"
farmer.crops.noCrops            → "No crops yet"
farmer.crops.addFirstPrompt     → "Add your first crop to get started"
farmer.crops.addSuccess         → "Crop added successfully"
farmer.crops.deleteConfirm      → "Are you sure you want to delete this crop?"

agent.today.title               → "Today"
agent.today.noTasks             → "No tasks for today"

admin.farmers.title             → "Farmers"
admin.finance.title             → "Finance Overview"
```

### Key Naming Rules

1. Use **camelCase** for multi-word keys: `addFirstPrompt`, `deleteConfirm`, `noData`.
2. Use the **role prefix** for role-specific text: `farmer.crops.xxx`, `agent.tasks.xxx`.
3. Use `common.xxx` for text reused across roles: `common.save`, `common.cancel`.
4. Use `nav.xxx` for navigation labels: `nav.dashboard`, `nav.crops`.
5. Use `errors.xxx` for error messages: `errors.loadFailed`.
6. Use `enum.xxx` for dropdown/select labels: `enum.categories.vegetables`.

---

## 4. Adding New Keys — Mandatory Dual-File Update

**ALWAYS add keys to BOTH `en.ts` AND `kn.ts` simultaneously.**

If you add a key to `en.ts` but not `kn.ts`:
- Kannada users see the English fallback (acceptable but not desired).
- Console warns `[i18n] Missing KN key: "xxx"` in dev.

If you add a key to `kn.ts` but not `en.ts`:
- `validateTranslations()` reports it as "extra".

### Process

1. Add the English text to `src/i18n/en.ts` in the correct nested object.
2. Add the Kannada translation to `src/i18n/kn.ts` in the same path.
3. If you don't know the Kannada translation, add a placeholder matching the English text and mark it with a TODO comment in `kn.ts`:
   ```ts
   farmer: { crops: { newFeature: 'New Feature' } } // TODO: translate to Kannada
   ```
4. Run the app in dev mode and check console for `[i18n] Missing` warnings.

---

## 5. Key Organization in Translation Files

### en.ts Structure (current)

```ts
export const en = {
  common: { save, cancel, delete, loading, retry, ... },
  nav: { dashboard, myDay, crops, ... },
  auth: { signIn, signUp, signOut, ... },
  errors: { loadFailed, operationFailed, ... },
  farmer: {
    dashboard: { title, welcome, ... },
    crops: { title, addCrop, noCrops, ... },
    transport: { ... },
    ...
  },
  agent: { ... },
  logistics: { ... },
  marketplace: { ... },
  admin: { ... },
  settings: { ... },
  notifications: { ... },
  enum: { categories, units, soilTypes, ... },
};
```

### Rules for Adding New Sections

- New features go under their role prefix: `farmer.newFeature.xxx`.
- Cross-role features go under `common.xxx` or a new top-level key.
- Never nest deeper than 4 levels: `farmer.crops.diary.photoGallery` is the max.

---

## 6. Interpolation and Dynamic Text

The current `t()` function returns a plain string. For dynamic values, use string concatenation or template literals around `t()`:

```tsx
// Pattern: translated label + dynamic value
<p>{t('farmer.earnings.total')}: ₹{amount}</p>

// Pattern: translated sentence with placeholder
// (If needed, extend t() to support {name} placeholders in the future)
<p>{t('farmer.dashboard.welcome')}, {profile?.full_name}</p>
```

### Pluralization

Currently no built-in pluralization. Use conditional keys:

```tsx
const countLabel = count === 1 ? t('common.item') : t('common.items');
```

If pluralization becomes complex, consider adopting a library like `i18next`.

---

## 7. Status Labels and Enums

All status labels and dropdown options MUST use i18n keys:

```ts
// en.ts
enum: {
  transportStatus: {
    open: 'Open',
    requested: 'Requested',
    assigned: 'Assigned',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  cropStatus: {
    growing: 'Growing',
    ready: 'Ready to Harvest',
    harvested: 'Harvested',
  },
}
```

Then in `statusConfig.ts`:
```tsx
label: t(`enum.transportStatus.${status}`)
```

---

## 8. Kannada-Specific Notes

### Encoding Issues

The `src/i18n/index.ts` engine includes a mojibake repair system that:
1. Detects strings with Latin characters that look like mis-encoded Kannada.
2. Attempts to decode them as CP-1252 → UTF-8.
3. Falls back to hardcoded `KN_STRING_OVERRIDES` for known-bad strings.

**When adding Kannada text:**
- Ensure your editor and git are configured for UTF-8.
- If Kannada text appears garbled in the file, add an override in `KN_STRING_OVERRIDES` in `index.ts`.
- Test by switching to Kannada in the app and visually verifying characters render correctly.

### Script Characteristics

Kannada text is typically 1.2–1.5x longer than English. Account for this in UI layout:
- Buttons should not have fixed widths.
- Labels in forms should wrap gracefully.
- Sidebar nav items should handle longer text without breaking layout.

---

## 9. Validation and QA

### Dev-Time Validation

Call `validateTranslations()` (exported from `src/i18n/index.ts`) to get:
- `missing`: keys in `en.ts` not present in `kn.ts`.
- `extra`: keys in `kn.ts` not present in `en.ts`.

### Console Warnings

In development, missing keys produce:
```
[i18n] Missing KN key: "farmer.crops.newFeature"
```

### Pre-Commit Checklist

- [ ] Every new user-visible string uses `t('key')`
- [ ] Key exists in BOTH `en.ts` and `kn.ts`
- [ ] Key follows the naming convention
- [ ] Kannada text is valid UTF-8 Kannada script
- [ ] No console `[i18n] Missing` warnings for new keys

---

## 10. Current Gaps

Pages with known hardcoded English strings that need i18n migration:

| File | Hardcoded Strings |
|------|-------------------|
| `src/pages/agent/Today.tsx` | "Quick Stats", "Today's Tasks", "Start visit" |
| `src/pages/agent/Dashboard.tsx` | Various section titles |
| `src/pages/marketplace/Browse.tsx` | "Browse Marketplace", "No products found", filter labels |
| `src/pages/logistics/Dashboard.tsx` | Stat labels, section titles |
| `src/pages/admin/Dashboard.tsx` | Section titles, quick action labels |
| Various components | Button labels, tooltip text, confirmation dialogs |

Priority: migrate role dashboard pages first, then list pages, then detail pages.
