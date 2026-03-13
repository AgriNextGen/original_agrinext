# Grid & Layout System

> Official grid, container, and responsive layout rules for AgriNext Gen.
> All pages share one layout shell. All grids follow this system.

---

## 1. Breakpoint Scale

AgriNext Gen uses the standard Tailwind CSS breakpoints:

| Name | Prefix | Min Width | Primary Context |
|------|--------|-----------|-----------------|
| xs | (default) | 0px | Small phones (375px typical) |
| sm | `sm:` | 640px | Large phones, small tablets |
| md | `md:` | 768px | Tablets — sidebar appears, layout shifts |
| lg | `lg:` | 1024px | Small laptops |
| xl | `xl:` | 1280px | Standard desktops |
| 2xl | `2xl:` | 1400px | Wide monitors — container max-width |

### Critical Breakpoint: md (768px)

This is the primary layout breakpoint. At `md`:
- Sidebar transitions from off-canvas drawer to fixed visible panel.
- Content gains left padding (`md:pl-64`).
- Page padding increases from `p-4` to `p-6`.
- Grids expand from compact to full column counts.

The `useIsMobile()` hook (`src/hooks/use-mobile.tsx`) returns `true` below 768px.

---

## 2. Page Shell — Sidebar + Content

### Desktop Layout (md+)

```
┌──────────┬─────────────────────────────────────────────┐
│          │  Header (h-16, sticky top-0, z-30)          │
│  Sidebar │─────────────────────────────────────────────│
│  (w-64)  │  Main Content (p-6)                         │
│  fixed   │                                             │
│  z-30    │  ┌─────────────────────────────────────┐    │
│          │  │  PageShell                           │    │
│          │  │  ├── KPI Row                         │    │
│          │  │  ├── Content Section                 │    │
│          │  │  └── Secondary Section               │    │
│          │  └─────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────┘
```

| Element | CSS/Classes | Value |
|---------|------------|-------|
| Sidebar | `fixed inset-y-0 left-0 z-30 w-64` | 256px wide, full height |
| Content offset | `md:pl-64` | 256px left padding |
| Header | `sticky top-0 z-30 h-16` | 64px, sticks on scroll |
| Main padding | `p-4 md:p-6` | 16px mobile, 24px desktop |

### Mobile Layout (< md)

```
┌─────────────────────────────────────────────┐
│  Header (h-16, sticky top-0)   ☰            │
│─────────────────────────────────────────────│
│  Main Content (p-4, full width)             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  PageShell                           │    │
│  │  ├── KPI Row (2 cols)               │    │
│  │  ├── Content Section                 │    │
│  │  └── Secondary Section               │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘

┌──────────┐
│  Sidebar │ ← Off-canvas drawer (z-50, overlay)
│  (w-64)  │    Triggered by ☰ hamburger
│          │    bg-black/60 backdrop-blur overlay
└──────────┘
```

### Layout Implementation

From `src/layouts/DashboardLayout.tsx`:

```tsx
<div className="min-h-screen bg-background">
  {/* Mobile overlay */}
  {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

  {/* Desktop sidebar */}
  <div className="hidden md:block fixed inset-y-0 left-0 z-30">
    <DashboardSidebar />
  </div>

  {/* Mobile sidebar drawer */}
  <div className="md:hidden">
    <DashboardSidebar isOpen={sidebarOpen} isMobile={true} />
  </div>

  {/* Content */}
  <div className="md:pl-64">
    <DashboardHeader />
    <main className="p-4 md:p-6">{children}</main>
  </div>
</div>
```

---

## 3. Container Constraints

### Tailwind Container

From `tailwind.config.ts`:

```ts
container: {
  center: true,
  padding: "2rem",
  screens: { "2xl": "1400px" },
}
```

The `container` class centers content with `max-width: 1400px` and `padding: 2rem` (32px).

### When to Use Container

- **Public/marketing pages** (Index, About, Contact): Use `container` to constrain width.
- **Dashboard pages**: Do NOT use `container`. Content fills the available space within `md:pl-64` with `p-4 md:p-6` padding.

Dashboard content width is naturally constrained by the sidebar offset and main padding. No additional max-width is needed.

### Content Width by Context

| Context | Effective Content Width |
|---------|------------------------|
| Desktop dashboard (1440px screen) | ~1440 - 256 (sidebar) - 48 (padding) = ~1136px |
| Desktop dashboard (1280px screen) | ~1280 - 256 - 48 = ~976px |
| Tablet (768px) | ~768 - 256 - 48 = ~464px |
| Mobile (375px) | ~375 - 32 (padding) = ~343px |

---

## 4. Responsive Grid Patterns

### KPI Card Grid

```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
```

| Breakpoint | Columns | Gap |
|-----------|---------|-----|
| xs–sm | 2 | 16px |
| md+ | 4 | 16px |

Always use even numbers (2 or 4). If you have 3 KPIs, add a 4th or use 2+1 stacking.

### Item Card Grid (crops, farmlands, products)

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
```

| Breakpoint | Columns | Gap |
|-----------|---------|-----|
| xs–sm | 1 | 16px |
| md–lg | 2 | 16px |
| xl+ | 3 | 16px |

### Detail Page — Two Column Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>{/* Primary info */}</div>
  <div>{/* Secondary info */}</div>
</div>
```

| Breakpoint | Layout | Gap |
|-----------|--------|-----|
| xs–sm | Stacked (1 col) | 24px |
| md+ | Side-by-side (2 col) | 24px |

### Detail Page — Main + Sidebar Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">{/* Main content */}</div>
  <div>{/* Sidebar / metadata */}</div>
</div>
```

| Breakpoint | Layout | Gap |
|-----------|--------|-----|
| xs–md | Stacked (1 col) | 24px |
| lg+ | 2/3 + 1/3 (3-col grid) | 24px |

### Form Two-Column Layout

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>{/* Field 1 */}</div>
  <div>{/* Field 2 */}</div>
</div>
```

| Breakpoint | Layout | Gap |
|-----------|--------|-----|
| xs | Stacked | 16px |
| sm+ | Side-by-side | 16px |

Full-width fields (textarea, description) should span both columns: `sm:col-span-2`.

---

## 5. Gap Scale

Standard gap values used throughout the system:

| Gap | Pixels | Tailwind | Context |
|-----|--------|----------|---------|
| 1 | 4px | `gap-1` | Tight inline elements (icon + badge) |
| 1.5 | 6px | `gap-1.5` | Trailing icon to text |
| 2 | 8px | `gap-2` | Button icon + text, header elements (mobile), inline pairs |
| 3 | 12px | `gap-3` | Nav icon + label, stacked list items, filter bar controls |
| 4 | 16px | `gap-4` | Card grids, KPI grids, form fields, main content gaps |
| 6 | 24px | `gap-6` | Detail page columns, section spacing |
| 8 | 32px | `gap-8` | Spacious section spacing |

### Rules

- Grid gaps: always `gap-4` for card/item grids.
- Detail page gaps: `gap-6`.
- Form field gaps: `gap-4` for side-by-side fields.
- Never use `gap-0` or `gap-px` for layout grids.

---

## 6. Z-Index Scale

| Z-Index | Element | Tailwind |
|---------|---------|----------|
| 0 | Page content (default) | — |
| 10 | Sticky elements (if any custom) | `z-10` |
| 30 | Desktop sidebar, header | `z-30` |
| 40 | Mobile overlay backdrop | `z-40` |
| 50 | Mobile sidebar drawer, dialogs, popovers, dropdowns, tooltips | `z-50` |

### Rules

- Never use z-index values outside this scale.
- Sidebar and header share `z-30`; the sidebar is left-positioned so they do not overlap.
- Mobile overlay is `z-40`, one level below the mobile sidebar drawer (`z-50`).
- All Radix primitives (Dialog, Popover, DropdownMenu) use `z-50`.

---

## 7. Overflow and Scrolling

### Main Content

The `<main>` element scrolls naturally (no `overflow-hidden`). The page scrolls vertically.

### Sidebar

Sidebar nav area has `overflow-y-auto` for roles with many nav items (Admin).

### Tables

Tables wrap in `overflow-auto` (built into the Table component) for horizontal scroll when content is wider than the container.

### Dialogs

Dialog content has no built-in max-height. For long dialogs, add:
```tsx
<DialogContent className="max-h-[85vh] overflow-y-auto">
```

### Body Scroll Lock

When the mobile sidebar is open, `document.body.style.overflow = 'hidden'` prevents background scrolling. This is handled in `DashboardLayout.tsx`.

---

## 8. Public Page Layout (Marketing)

Public pages (Index, About, Contact) do NOT use `DashboardLayout`. They use:

```tsx
<div className="min-h-screen bg-background">
  <Navbar />
  <main>
    <div className="container">
      {/* Content constrained to 1400px */}
    </div>
  </main>
  <Footer />
</div>
```

### Token Summary

| Element | Classes |
|---------|---------|
| Page min height | `min-h-screen` |
| Content constraint | `container` (max-w 1400px, centered, px-8) |
| Hero sections | Full-bleed (no container), then container for text |
| Section spacing | `py-16 md:py-24` |

---

## 9. Common Layout Patterns

### Flex Row — Title + Actions

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>{/* Title area */}</div>
  <div className="flex items-center gap-2">{/* Actions */}</div>
</div>
```

Stacks on mobile, row on sm+. Used in PageShell header, CardHeader, filter bars.

### Flex Row — Label + Value

```tsx
<div className="flex items-center justify-between">
  <span className="text-sm text-muted-foreground">{label}</span>
  <span className="text-sm font-medium">{value}</span>
</div>
```

Common in detail pages, settings, metadata displays.

### Vertical Stack

```tsx
<div className="space-y-4">
  {items.map(item => <Component key={item.id} />)}
</div>
```

For transport requests, task lists, notifications. Gap is `space-y-3` (tight) or `space-y-4` (standard).

---

## 10. Anti-Patterns

- Do NOT use `container` class inside dashboard pages — the sidebar offset and padding handle width.
- Do NOT set `max-width` on dashboard content — let it fill the available space.
- Do NOT use CSS Grid with more than 4 columns for card layouts — content gets too narrow on common screen sizes.
- Do NOT set fixed heights on content sections — let content determine height.
- Do NOT nest grids more than 2 levels deep. If you need a grid inside a grid inside a grid, the layout needs simplification.
- Do NOT use `absolute` positioning for layout elements — use flexbox or grid.
- Do NOT create custom breakpoints. Use the Tailwind default scale (sm, md, lg, xl, 2xl).
- Do NOT use `vh` units for main content height — this causes issues on mobile browsers with dynamic viewport height.
