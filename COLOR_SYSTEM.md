# Color System

> Official color palette for the AgriNext Gen platform.
> All colors are defined as HSL CSS custom properties in `src/index.css` and mapped to Tailwind utilities in `tailwind.config.ts`.
> Never use raw hex/rgb values in components. Always use semantic token classes.

---

## 1. Token Architecture

Colors flow through three layers:

```
CSS Variable (--primary: 152 55% 28%)
  → Tailwind Utility (bg-primary, text-primary)
    → Component Usage (<Button variant="default">)
```

All variables use the HSL-without-function format (`H S% L%`) so Tailwind can inject opacity modifiers (e.g. `bg-primary/90`).

---

## 2. Core Palette

### Light Mode (:root)

| Token | CSS Variable | HSL Value | Approx Hex | Tailwind Class | Role |
|-------|-------------|-----------|------------|----------------|------|
| **Primary** | `--primary` | 152 55% 28% | #20734A | `bg-primary` `text-primary` | Brand green — buttons, links, active states |
| **Primary Foreground** | `--primary-foreground` | 0 0% 100% | #FFFFFF | `text-primary-foreground` | Text on primary backgrounds |
| **Secondary** | `--secondary` | 210 15% 94% | #EEF0F3 | `bg-secondary` | Subtle backgrounds, secondary buttons |
| **Secondary Foreground** | `--secondary-foreground` | 25 30% 20% | #422D1A | `text-secondary-foreground` | Text on secondary |
| **Accent** | `--accent` | 42 75% 50% | #DFA419 | `bg-accent` | Amber highlight — premium, featured, accent CTAs |
| **Accent Foreground** | `--accent-foreground` | 25 30% 12% | #281D0E | `text-accent-foreground` | Text on accent |
| **Destructive** | `--destructive` | 0 72% 51% | #DE3B3B | `bg-destructive` | Error, delete, danger |
| **Destructive Foreground** | `--destructive-foreground` | 0 0% 100% | #FFFFFF | `text-destructive-foreground` | Text on destructive |
| **Muted** | `--muted` | 210 15% 94% | #EEF0F3 | `bg-muted` | Disabled backgrounds, subtle containers |
| **Muted Foreground** | `--muted-foreground` | 215 15% 45% | #636E80 | `text-muted-foreground` | Secondary text, placeholders, captions |

### Semantic Status Colors

| Token | CSS Variable | HSL Value | Approx Hex | Tailwind Class | Usage |
|-------|-------------|-----------|------------|----------------|-------|
| **Success** | `--success` | 145 63% 36% | #22964B | `text-success` `bg-success` | Positive outcomes, completed states, upward trends |
| **Warning** | `--warning` | 36 93% 48% | #EB9B0A | `text-warning` `bg-warning` | Caution, pending actions, expiring items |
| **Info** | `--info` | 199 89% 48% | #0DA2E8 | `text-info` `bg-info` | Informational, in-progress states, hints |

**Note:** Success, warning, and info do not have dedicated foreground tokens in the CSS variables. When used as backgrounds, use white (`text-white`) or dark foreground (`text-foreground`) based on contrast needs:
- `bg-success` → `text-white`
- `bg-warning` → `text-foreground` (dark text on amber)
- `bg-info` → `text-white`

### Surface Colors

| Token | CSS Variable | HSL Value | Tailwind Class | Usage |
|-------|-------------|-----------|----------------|-------|
| **Background** | `--background` | 210 20% 98% | `bg-background` | Page background |
| **Foreground** | `--foreground` | 25 30% 12% | `text-foreground` | Primary body text |
| **Card** | `--card` | 0 0% 100% | `bg-card` | Card surfaces |
| **Card Foreground** | `--card-foreground` | 25 30% 12% | `text-card-foreground` | Text on cards |
| **Popover** | `--popover` | 0 0% 100% | `bg-popover` | Dropdown menus, tooltips |
| **Popover Foreground** | `--popover-foreground` | 25 30% 12% | `text-popover-foreground` | Text in popovers |

### Border & Input

| Token | CSS Variable | HSL Value | Tailwind Class | Usage |
|-------|-------------|-----------|----------------|-------|
| **Border** | `--border` | 215 20% 90% | `border-border` | Default borders |
| **Input** | `--input` | 215 20% 90% | `border-input` | Form input borders |
| **Ring** | `--ring` | 152 55% 28% | `ring-ring` | Focus ring (matches primary) |

---

## 3. Dark Mode

All tokens have `.dark` overrides in `src/index.css`. Dark mode is activated via the `class` strategy (`darkMode: ["class"]` in Tailwind config).

### Dark Mode Palette

| Token | Light HSL | Dark HSL | Notes |
|-------|-----------|----------|-------|
| Background | 210 20% 98% | 220 20% 8% | Near-black |
| Foreground | 25 30% 12% | 210 20% 95% | Near-white |
| Card | 0 0% 100% | 220 18% 12% | Dark card surface |
| Primary | 152 55% 28% | 152 50% 42% | Lightened for contrast on dark bg |
| Secondary | 210 15% 94% | 220 15% 18% | Darkened |
| Muted | 210 15% 94% | 220 12% 18% | Darkened |
| Muted Foreground | 215 15% 45% | 215 12% 60% | Lightened |
| Accent | 42 75% 50% | 42 70% 48% | Slightly desaturated |
| Destructive | 0 72% 51% | 0 62% 50% | Slightly softer |
| Border | 215 20% 90% | 220 12% 20% | Dark border |
| Success | 145 63% 36% | 145 52% 46% | Lightened |
| Warning | 36 93% 48% | 39 89% 56% | Lightened |
| Info | 199 89% 48% | 201 88% 62% | Lightened |

### Dark Mode Rules

- Never hardcode light-mode colors (e.g. `text-gray-900`, `bg-white`). Always use tokens.
- Test every new component in both modes by toggling the `.dark` class on `<html>`.
- Opacity modifiers (e.g. `bg-primary/90`) work in both modes.

---

## 4. Sidebar Palette

The sidebar uses a dedicated color set for its dark-toned background:

| Token | CSS Variable | Light HSL | Dark HSL | Usage |
|-------|-------------|-----------|----------|-------|
| Sidebar BG | `--sidebar-background` | 142 35% 18% | 220 18% 6% | Deep green (light), near-black (dark) |
| Sidebar FG | `--sidebar-foreground` | 45 30% 95% | 210 20% 95% | Light text on dark sidebar |
| Sidebar Primary | `--sidebar-primary` | 42 85% 55% | 42 70% 48% | Active item highlight (amber) |
| Sidebar Primary FG | `--sidebar-primary-foreground` | 25 30% 12% | 220 20% 8% | Dark text on amber |
| Sidebar Accent | `--sidebar-accent` | 142 30% 25% | 220 12% 15% | Hover state background |
| Sidebar Accent FG | `--sidebar-accent-foreground` | 45 30% 95% | 210 20% 95% | Text on hover |
| Sidebar Border | `--sidebar-border` | 142 25% 25% | 220 12% 18% | Divider lines |
| Sidebar Ring | `--sidebar-ring` | 42 85% 55% | 42 70% 48% | Focus ring in sidebar |

Tailwind classes: `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, etc.

---

## 5. Role Accent Colors

Each role has a distinctive accent color used for the sidebar active state and logo badge. These are NOT CSS custom properties — they are applied directly via Tailwind utility classes in `DashboardSidebar.tsx`:

| Role | Color | Active BG | Active Text | Logo Badge |
|------|-------|-----------|-------------|------------|
| **Farmer** | Primary Green | `bg-sidebar-accent text-sidebar-primary` | (uses sidebar tokens) | `bg-sidebar-primary` |
| **Agent** | Purple | `bg-purple-100 text-purple-700` | `dark:bg-purple-900/30 dark:text-purple-300` | `bg-purple-600` |
| **Logistics** | Blue | `bg-blue-100 text-blue-700` | `dark:bg-blue-900/30 dark:text-blue-300` | `bg-blue-600` |
| **Buyer** | Orange | `bg-orange-100 text-orange-700` | `dark:bg-orange-900/30 dark:text-orange-300` | `bg-orange-600` |
| **Admin** | Rose | `bg-rose-100 text-rose-700` | `dark:bg-rose-900/30 dark:text-rose-300` | `bg-rose-600` |

### Rules for Role Colors

- Role accent colors are ONLY used in the sidebar and header for active state indicators.
- Page content uses the shared semantic palette (primary, accent, success, warning, etc.).
- Do NOT create role-specific color themes for page content — all roles share one design system.
- Role accents help users visually confirm which role they are operating in.

---

## 6. Gradient Definitions

Defined as CSS custom properties in `:root`:

| Gradient | CSS Variable | Value | Usage |
|----------|-------------|-------|-------|
| **Hero** | `--gradient-hero` | 135deg: primary → teal → blue-teal | Hero sections, primary gradient buttons |
| **Premium** | `--gradient-premium` | 135deg: primary → teal | Premium badges, highlighted cards |
| **Card** | `--gradient-card` | 180deg: white → off-white | Subtle card surface |
| **Accent** | `--gradient-accent` | 135deg: amber → dark amber | Accent buttons, featured badges |
| **Earth** | `--gradient-earth` | 180deg: light gray → off-white | Subtle section backgrounds |

Tailwind utility classes:
- `bg-gradient-hero`, `bg-gradient-premium`, `bg-gradient-card`, `bg-gradient-accent`, `bg-gradient-earth`
- `text-gradient-hero`, `text-gradient-accent` (for gradient text via background-clip)

### Gradient Rules

- Use `bg-gradient-hero` only for hero/marketing sections and the `hero` button variant.
- Use `bg-gradient-card` for subtle card backgrounds where visual separation is needed.
- Do NOT create new gradient definitions inline. Add to CSS variables if a new gradient is needed.

---

## 7. Elevation (Shadows)

| Level | CSS Variable | Value | Tailwind Class | Usage |
|-------|-------------|-------|----------------|-------|
| **Level 1** | `--elevation-1` | 0 4px 24px -4px hsl(215 25% 20% / 6%) | `shadow-elev-1` / `shadow-soft` | Cards at rest, default button |
| **Level 2** | `--elevation-2` | 0 8px 32px -6px hsl(215 25% 20% / 10%) | `shadow-elev-2` / `shadow-medium` | Cards on hover, floating elements |
| **Level 3** | `--elevation-3` | 0 12px 48px -12px hsl(215 25% 20% / 14%) | `shadow-elev-3` / `shadow-premium` | Modals, popovers, premium cards |

### Elevation Rules

- Cards use `shadow-sm` (Tailwind default) at rest and `shadow-elev-1` on hover.
- Clickable cards (KpiCard with onClick) elevate to `shadow-elev-2` on hover.
- Dialogs and popovers use `shadow-lg` (Tailwind default for overlays).
- Do NOT stack multiple shadow classes. Use one elevation level per element.

---

## 8. Accessibility — Contrast Guidelines

### WCAG 2.1 AA Requirements

- **Normal text** (< 18px or < 14px bold): 4.5:1 contrast ratio minimum.
- **Large text** (≥ 18px or ≥ 14px bold): 3:1 contrast ratio minimum.
- **UI components** (buttons, inputs, icons): 3:1 against adjacent colors.

### Key Contrast Pairs

| Foreground | Background | Context | Approx Ratio | Pass AA |
|-----------|------------|---------|-------------|---------|
| `foreground` on `background` | Body text | ~14:1 | Yes |
| `primary-foreground` on `primary` | Button text | ~8:1 | Yes |
| `muted-foreground` on `background` | Captions | ~4.6:1 | Yes |
| `muted-foreground` on `card` | Card captions | ~4.6:1 | Yes |
| `destructive-foreground` on `destructive` | Error button | ~6:1 | Yes |
| `sidebar-foreground` on `sidebar` | Sidebar text | ~12:1 | Yes |
| white on `success` | Success badge | ~4.8:1 | Yes |
| `foreground` on `warning` | Warning badge | ~4.5:1 | Borderline — use dark text |
| white on `info` | Info badge | ~4.1:1 | Borderline — test carefully |

### Rules

- Always pair a `-foreground` token with its corresponding background token.
- For `warning` backgrounds, always use dark foreground text (`text-foreground`), not white.
- When adding new color combinations, verify contrast with a tool (e.g. WebAIM Contrast Checker).
- Never rely solely on color to convey meaning — always pair with text, icons, or patterns.

---

## 9. Usage Rules Summary

| Need | Use | Do NOT Use |
|------|-----|-----------|
| Primary action button | `bg-primary text-primary-foreground` | `bg-green-700 text-white` |
| Error state | `text-destructive` or `bg-destructive` | `text-red-500` |
| Success indicator | `text-success` | `text-green-600` |
| Muted description | `text-muted-foreground` | `text-gray-500` |
| Card surface | `bg-card` | `bg-white` |
| Page background | `bg-background` | `bg-gray-50` |
| Border | `border-border` | `border-gray-200` |
| Focus ring | `ring-ring` | `ring-blue-500` |

### Opacity Modifiers

Tailwind supports opacity modifiers on token colors:
```tsx
bg-primary/90    // primary at 90% opacity (hover state)
bg-destructive/5 // very faint destructive (error background)
border-border/70  // softer border
bg-accent/20     // ghost hover state
```

Use these for hover states and subtle backgrounds instead of defining new color tokens.

---

## 10. Anti-Patterns

- Do NOT use raw Tailwind color classes (`bg-green-600`, `text-red-500`, `bg-gray-100`). Always use semantic tokens.
- Do NOT hardcode hex colors in components or inline styles.
- Do NOT create new CSS color variables without adding both light and dark mode values.
- Do NOT use color as the only indicator of state — always pair with text or icons (accessibility).
- Do NOT override the sidebar palette for individual roles — role accents are applied via Tailwind classes on the active state, not by changing CSS variables.
