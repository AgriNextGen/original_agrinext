# Spacing System

> Official spacing scale and usage rules for the AgriNext Gen platform.
> Consistent spacing creates visual rhythm and reduces cognitive load.
> All spacing MUST use Tailwind classes mapped to this scale. No arbitrary values.

---

## 1. Spacing Scale

### Base Unit: 4px

All spacing is derived from a 4px base unit. The full scale:

| Step | Pixels | Rem | CSS Variable | Tailwind | Alias |
|------|--------|-----|-------------|----------|-------|
| 1 | 4px | 0.25rem | `--space-xs` | `p-1` / `gap-1` / `space-y-1` | xs |
| 2 | 8px | 0.5rem | `--space-sm` | `p-2` / `gap-2` / `space-y-2` | sm |
| 3 | 12px | 0.75rem | — | `p-3` / `gap-3` / `space-y-3` | — |
| 4 | 16px | 1rem | `--space-md` | `p-4` / `gap-4` / `space-y-4` | md |
| 5 | 20px | 1.25rem | — | `p-5` / `gap-5` / `space-y-5` | — |
| 6 | 24px | 1.5rem | `--space-lg` | `p-6` / `gap-6` / `space-y-6` | lg |
| 8 | 32px | 2rem | `--space-xl` | `p-8` / `gap-8` / `space-y-8` | xl |
| 10 | 40px | 2.5rem | — | `p-10` | — |
| 12 | 48px | 3rem | — | `p-12` | — |
| 16 | 64px | 4rem | — | `p-16` | — |

### Custom Spacing Tokens

The CSS custom properties `--space-xs` through `--space-xl` are mapped in Tailwind config as named spacing utilities: `p-xs`, `m-sm`, `gap-md`, etc. However, standard Tailwind numeric classes (e.g. `p-4`, `gap-6`) produce identical results and are more widely understood. Use whichever is clearer in context.

---

## 2. Usage by Context

### Page Content Padding

```tsx
<main className="p-4 md:p-6">
  {children}
</main>
```

| Breakpoint | Padding | Pixels |
|-----------|---------|--------|
| Mobile (< md) | `p-4` | 16px |
| Desktop (≥ md) | `p-6` | 24px |

This is set in `DashboardLayout.tsx` and should NOT be overridden by individual pages.

### Page Section Spacing (PageShell Density)

Vertical spacing between sections within a page:

| Density | Class | Pixels | Use Case |
|---------|-------|--------|----------|
| Compact | `space-y-4` | 16px | Admin tables, settings, dense lists |
| Comfortable | `space-y-6` | 24px | Default for all pages |
| Spacious | `space-y-8` | 32px | Onboarding, marketing, empty-state-heavy |

Set via the `density` prop on PageShell. Default is `comfortable`.

### Card Padding

| Element | Class | Pixels |
|---------|-------|--------|
| CardHeader | `p-4` | 16px (all sides) |
| CardContent | `p-4 pt-0` | 16px sides/bottom, 0 top |
| CardFooter | `p-4 pt-0` | 16px sides/bottom, 0 top |
| KpiCard content | `p-4 sm:p-5` | 16px mobile, 20px desktop |

### Card Internal Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| CardHeader vertical gap | `space-y-1.5` | 6px |
| Between label and value (KpiCard) | `mt-2` | 8px |
| Between value and trend (KpiCard) | `mt-2` | 8px |

### Grid Gaps

| Context | Class | Pixels |
|---------|-------|--------|
| KPI card grid | `gap-4` | 16px |
| Item card grid (crops, farmlands) | `gap-4` | 16px |
| Product grid (marketplace) | `gap-4` | 16px |
| Form field grid | `gap-4` (2-col) | 16px |
| Stacked list items | `space-y-3` or `space-y-4` | 12–16px |

Standard: `gap-4` (16px) for all grids. Use `gap-3` (12px) only for tight grids (e.g. within a card).

### Form Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| Between form fields (vertical) | `space-y-4` | 16px |
| Between label and input | `space-y-2` | 8px |
| Between input and helper/error text | `mt-1` | 4px |
| Between form sections | `space-y-6` | 24px |
| Form actions (submit row) | `mt-6` | 24px from last field |

### Sidebar Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| Logo bar height | `h-16` | 64px |
| Logo bar horizontal padding | `px-6` | 24px |
| Nav list padding | `px-3 py-4` | 12px horizontal, 16px vertical |
| Nav item padding | `px-3 py-2.5` | 12px horizontal, 10px vertical |
| Nav item gap (icon to label) | `gap-3` | 12px |
| Nav item vertical spacing | `space-y-1` | 4px |
| Sign-out section padding | `p-3` | 12px |

### Header Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| Header height | `h-16` | 64px |
| Header horizontal padding | `px-4 md:px-6` | 16px mobile, 24px desktop |
| Header element gap | `gap-2 md:gap-4` | 8px mobile, 16px desktop |
| Title to sync indicator | `ml-3` | 12px |

### Dialog Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| Dialog content padding | `p-6` | 24px |
| Dialog content gap | `gap-4` | 16px |
| Dialog header gap | `space-y-1.5` | 6px |
| Dialog footer gap | `space-x-2` | 8px |

### Empty State Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| EmptyState vertical padding | `py-16` | 64px |
| EmptyState horizontal padding | `px-4` | 16px |
| Icon to title | `mb-4` | 16px |
| Title to description | `mb-2` | 8px |
| Description to CTA | `mb-6` | 24px |

### DataState Spacing

| Element | Class | Pixels |
|---------|-------|--------|
| Container padding | `p-6` | 24px |
| Icon to text | `mb-3` | 12px |
| Error text to retry button | `mb-3` | 12px |
| Empty title to message | `mt-1` | 4px |

---

## 3. Fixed Dimensions

Certain UI elements have fixed dimensions that should not vary:

| Element | Dimension | Value |
|---------|-----------|-------|
| Sidebar width | width | `w-64` (256px) |
| Header height | height | `h-16` (64px) |
| Sidebar logo bar | height | `h-16` (64px) |
| Content offset (desktop) | padding-left | `md:pl-64` (256px) |
| Avatar (header) | width/height | `h-9 w-9` (36px) |
| Icon button (default) | width/height | `h-10 w-10` (40px) |
| Button height (default) | height | `h-11` (44px) |
| Button height (sm) | height | `h-9` (36px) |
| Button height (lg) | height | `h-12` (48px) |
| Input height | height | `h-10` (40px) |
| Table header row | height | `h-12` (48px) |

---

## 4. Margin vs Padding vs Gap

### When to Use Each

| Technique | When | Example |
|-----------|------|---------|
| **Padding** (`p-*`) | Internal space within a container | Card content, button, input |
| **Gap** (`gap-*`) | Equal spacing between flex/grid children | Grid of cards, button groups |
| **Space** (`space-y-*`) | Vertical stack of non-grid siblings | Form fields, page sections |
| **Margin** (`m-*`, `mt-*`) | One-off spacing between specific elements | KPI trend below value |

### Rules

- Prefer `gap` over individual margins for flex/grid layouts.
- Prefer `space-y-*` for vertical stacks (auto-applied to children).
- Use margin only for specific element relationships, not systematic layouts.
- Never combine `space-y-*` on a container with explicit `mt-*` on its children — pick one approach.

---

## 5. Responsive Spacing

Some spacing values change at the `md` breakpoint:

| Context | Mobile | Desktop |
|---------|--------|---------|
| Page padding | `p-4` (16px) | `md:p-6` (24px) |
| Header padding | `px-4` (16px) | `md:px-6` (24px) |
| Header element gap | `gap-2` (8px) | `md:gap-4` (16px) |
| KpiCard padding | `p-4` (16px) | `sm:p-5` (20px) |

### Rules

- Only change spacing at breakpoints when the density change is meaningful.
- Do not add responsive spacing to every element — most elements use the same value at all sizes.
- Page-level padding and header spacing are the primary responsive adjustments.

---

## 6. Border Radius Scale

| Token | CSS Variable | Value | Tailwind | Usage |
|-------|-------------|-------|----------|-------|
| Small | `--radius-sm` | 10px | `rounded-sm` | Small badges, toggle buttons |
| Medium | `--radius-md` | 13px | `rounded-md` | Inputs, selects, table cells |
| Large | `--radius-lg` | 16px | `rounded-lg` | Cards, buttons, dialogs |
| Full | — | 9999px | `rounded-full` | Avatars, pills, badges |

Base radius: `--radius: 1rem` (16px). The sm and md variants are calculated:
- `--radius-sm: calc(var(--radius) - 6px)` = 10px
- `--radius-md: calc(var(--radius) - 3px)` = 13px
- `--radius-lg: var(--radius)` = 16px

### Rules

- Cards and buttons use `rounded-lg`.
- Inputs and selects use `rounded-md`.
- Badges use `rounded-full`.
- Do NOT use arbitrary border-radius values (e.g. `rounded-[12px]`).

---

## 7. Anti-Patterns

- Do NOT use arbitrary spacing values (e.g. `p-[13px]`, `mt-[7px]`). Stay on the 4px grid.
- Do NOT add padding to pages — `DashboardLayout` handles it.
- Do NOT use `m-auto` for centering within dashboard pages — the layout handles centering.
- Do NOT mix `space-y-*` with explicit child margins in the same container.
- Do NOT use `gap-1` (4px) for card grids — minimum grid gap is `gap-3` (12px).
- Do NOT remove `pt-0` from CardContent — it prevents double-spacing with CardHeader.
