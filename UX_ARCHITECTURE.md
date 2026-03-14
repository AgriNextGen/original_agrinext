# UX Architecture — Page Layout System

> Canonical rules for page structure across all 60+ pages in AgriNext Gen.
> Every authenticated page MUST follow this system. No exceptions.

---

## 1. Layout Hierarchy

Every authenticated page has exactly three layers:

```
DashboardLayout          ← outer shell (sidebar + header + main)
  └── PageShell          ← canonical page wrapper (title, actions, density)
        └── {content}    ← page-specific content
```

### Layer 1 — DashboardLayout

**File:** `src/layouts/DashboardLayout.tsx`

Provides:
- Fixed left sidebar (w-64, hidden on mobile, drawer overlay)
- Sticky DashboardHeader (h-16, title, search, notifications, profile)
- `<main className="p-4 md:p-6">` content area
- Mobile sidebar open/close with ESC, overlay, and body scroll lock

**Rules:**
- Every authenticated page wraps its return in `<DashboardLayout title={...}>`.
- The `title` prop drives the header's `<h1>` (truncated on mobile).
- DashboardLayout is role-agnostic; role context comes from sidebar and header hooks.

### Layer 2 — PageShell (Canonical Page Wrapper)

**File:** `src/components/layout/PageShell.tsx`

```tsx
<PageShell
  title="My Crops"
  subtitle="Manage your crop records"
  actions={<Button>Add Crop</Button>}
  breadcrumbs={<Breadcrumbs items={[...]} />}
  density="comfortable"
>
  {/* page content */}
</PageShell>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | required | Page heading (text-2xl font-display) |
| subtitle | string | optional | Description below title (text-sm text-muted-foreground) |
| actions | ReactNode | optional | Primary action buttons, right-aligned on sm+ |
| breadcrumbs | ReactNode | optional | Breadcrumb trail above the title |
| density | 'compact' \| 'comfortable' \| 'spacious' | 'comfortable' | Vertical spacing between sections |
| className | string | optional | Additional classes on the root section |

### Layer 2b — PageHeader (Thin Alias)

**File:** `src/components/shared/PageHeader.tsx`

PageHeader is a thin wrapper that delegates to PageShell. It exists for backward compatibility. New pages SHOULD use PageShell directly; existing pages using PageHeader need not be changed, as the output is identical.

**Rule:** Do NOT create any other page-wrapper components. All page structure goes through PageShell.

---

## 2. Choosing the Right Elements

### When to show a title
Always. Every page must have a title via PageShell.

### When to show a subtitle
- Dashboard pages: yes (e.g. "Welcome back, Ramesh")
- List pages: yes, as summary (e.g. "12 crops across 3 farmlands")
- Detail pages: optional (entity name can serve as subtitle)
- Settings pages: yes (describe the section)

### When to show breadcrumbs
Use breadcrumbs only for pages deeper than one level within a role section:
- `/farmer/crops/:cropId` (Crop Diary) — Crops > Ragi (Crop Diary)
- `/agent/farmer/:farmerId` (Farmer Detail) — My Farmers > Ramesh K
- `/admin/entity/:type/:id` (Entity 360) — Farmers > Farmer #xyz
- `/logistics/trip/:id` (Trip Detail) — Active Trips > Trip #abc

Do NOT add breadcrumbs to top-level list pages (e.g. /farmer/crops, /admin/farmers).

### When to show action buttons
- List pages: primary "Add" or "Create" action (e.g. "Add Crop", "New Request")
- Dashboard pages: secondary actions only (e.g. "Refresh", "Profile")
- Detail pages: contextual actions (e.g. "Edit", "Delete", status change)

---

## 3. Content Container Patterns

### KPI Row
For dashboard and list summary pages. Use `KpiCard` in a responsive grid:
```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
  <KpiCard label={...} value={...} icon={...} priority="primary" />
  ...
</div>
```
Grid: 2 columns on mobile, 4 on md+.

### Section Card
A content section wrapped in shadcn Card:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-lg">
      <Icon className="h-5 w-5" />
      Section Title
    </CardTitle>
  </CardHeader>
  <CardContent>{...}</CardContent>
</Card>
```

### Item Grid
For crop cards, farmland cards, product cards. Responsive grid:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} />)}
</div>
```

### Item List
For transport requests, tasks, orders. Vertical stack:
```tsx
<div className="space-y-4">
  {items.map(item => <ItemRow key={item.id} />)}
</div>
```

### Action Panel
For AI-powered sections or grouped actions. Use `ActionPanel`:
```tsx
<ActionPanel
  title="AI Suggestions"
  context="Route optimization based on current loads"
  primaryAction={<Button>Optimize</Button>}
>
  {content}
</ActionPanel>
```

---

## 4. Page Density Rules

| Density | Spacing | Use Case |
|---------|---------|----------|
| compact | space-y-4 | Dense admin tables, settings |
| comfortable | space-y-6 | Default for all pages |
| spacious | space-y-8 | Marketing, onboarding, empty-state-heavy |

Default is `comfortable`. Only override when page density differs from the norm.

---

## 5. Spacing Constants

All spacing uses Tailwind classes aligned with CSS custom properties:

| Token | Value | Usage |
|-------|-------|-------|
| p-4 / md:p-6 | 1rem / 1.5rem | Main content padding (from DashboardLayout) |
| gap-4 | 1rem | Grid gaps, card gaps |
| space-y-4/6/8 | PageShell density | Section vertical spacing |
| py-2.5 px-3 | — | Sidebar nav item padding |
| h-16 | 4rem | Header and sidebar logo bar height |

---

## 6. Standard Page Template

```tsx
import DashboardLayout from '@/layouts/DashboardLayout';
import PageShell from '@/components/layout/PageShell';
import DataState from '@/components/ui/DataState';
import KpiCard from '@/components/dashboard/KpiCard';
import { useLanguage } from '@/hooks/useLanguage';

export default function ExamplePage() {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useExampleData();

  return (
    <DashboardLayout title={t('nav.example')}>
      <PageShell
        title={t('example.title')}
        subtitle={t('example.subtitle')}
        actions={<Button>{t('example.addNew')}</Button>}
      >
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="..." value={...} icon={...} />
        </div>

        {/* Data section */}
        <DataState
          loading={isLoading}
          error={isError ? t('errors.loadFailed') : null}
          empty={!data?.length}
          emptyTitle={t('example.noItems')}
          retry={refetch}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        </DataState>
      </PageShell>
    </DashboardLayout>
  );
}
```

---

## 7. Anti-Patterns (Do NOT Do)

- Do NOT use raw `<div>` with inline title `<h1>` instead of PageShell.
- Do NOT create new page wrapper components beyond PageShell.
- Do NOT duplicate stat card markup inline; use KpiCard.
- Do NOT set page padding manually; DashboardLayout handles outer padding.
- Do NOT skip DashboardLayout for authenticated pages.
- Do NOT hardcode page title strings; use `t('...')`.
