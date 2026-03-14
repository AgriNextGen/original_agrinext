# Dashboard UI Patterns

> Canonical dashboard components and layout patterns for AgriNext Gen.
> All five role dashboards, list pages, and detail pages share these patterns.
> See also: UX_ARCHITECTURE.md (page layout), UX_STATE_SYSTEM.md (async states), COMPONENT_STANDARDIZATION.md (component rules).

---

## 1. Stat Cards (KpiCard)

**File:** `src/components/dashboard/KpiCard.tsx`

The primary metric display component for dashboards and list page summaries.

### Structure

```
┌─────────────────────────────────┐
│  LABEL (uppercase, xs, muted)   │  ┌──────┐
│  VALUE (2xl, display, semibold) │  │ Icon │
│  ▲ 12% (trend, xs)             │  └──────┘
└─────────────────────────────────┘
```

### Token Summary

| Element | Classes |
|---------|---------|
| Container | `Card` with `transition-all duration-standard` |
| Content padding | `p-4 sm:p-5` |
| Layout | `flex items-start justify-between gap-3` |
| Label | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Value | `mt-2 text-2xl font-display font-semibold leading-none` |
| Trend | `mt-2 inline-flex items-center gap-1 text-xs font-medium` |
| Icon container | `rounded-lg bg-muted p-2.5` |
| Icon size | `h-5 w-5` |

### Priority Colors (Icon Tint)

| Priority | Class | Usage |
|----------|-------|-------|
| primary | `text-primary` | Main metric (total crops, all loads) |
| success | `text-success` | Positive states (completed, ready) |
| warning | `text-warning` | Attention needed (expiring, overdue) |
| info | `text-info` | Informational (in progress, active) |
| neutral | `text-muted-foreground` | Default/generic |

### Trend Indicators

| Trend | Icon | Color |
|-------|------|-------|
| Positive (> 0) | `TrendingUp` h-3.5 w-3.5 | `text-success` |
| Negative (< 0) | `TrendingDown` h-3.5 w-3.5 | `text-destructive` |
| Neutral (0 or undefined) | `Minus` h-3.5 w-3.5 | `text-muted-foreground` |

### Grid Placement

```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
  <KpiCard label="..." value={...} icon={...} priority="primary" />
  <KpiCard label="..." value={...} icon={...} priority="success" />
  <KpiCard label="..." value={...} icon={...} priority="warning" />
  <KpiCard label="..." value={...} icon={...} priority="info" />
</div>
```

- 2 columns on mobile, 4 on desktop.
- Always use 2 or 4 KpiCards per row (never 3, to avoid orphan on mobile).
- Clickable cards add `onClick` which enables hover lift animation.

---

## 2. Data State Wrapper (DataState)

**File:** `src/components/ui/DataState.tsx`

Wraps data-dependent sections, rendering the appropriate state UI.

### Visual Appearance by State

#### Loading State

```
┌─────────────────────────────────────┐
│  border-border/70  bg-card          │
│                                     │
│         ⟳ (Loader2, animate-spin)   │
│         Loading...                  │
│                                     │
└─────────────────────────────────────┘
```

| Token | Value |
|-------|-------|
| Container | `rounded-xl border border-border/70 bg-card p-6 text-center` |
| Icon | `Loader2 mx-auto mb-3 h-5 w-5 animate-spin text-muted-foreground` |
| Label | `text-sm text-muted-foreground` |

#### Error State

```
┌─────────────────────────────────────┐
│  border-destructive/30  bg-destr/5  │
│                                     │
│         ⚠ (AlertTriangle)           │
│         Error message               │
│         [ Retry ]                   │
│                                     │
└─────────────────────────────────────┘
```

| Token | Value |
|-------|-------|
| Container | `rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center` |
| Icon | `AlertTriangle mx-auto mb-3 h-5 w-5 text-destructive` |
| Message | `mb-3 text-sm text-destructive` |
| Retry button | `Button variant="outline" size="sm"` |

#### Empty State

```
┌─────────────────────────────────────┐
│  border-border/70  bg-card          │
│                                     │
│         📥 (Inbox)                   │
│         No data                     │
│         Optional message            │
│                                     │
└─────────────────────────────────────┘
```

| Token | Value |
|-------|-------|
| Container | `rounded-xl border border-border/70 bg-card p-6 text-center` |
| Icon | `Inbox mx-auto mb-3 h-5 w-5 text-muted-foreground` |
| Title | `font-medium text-foreground` |
| Message | `mt-1 text-sm text-muted-foreground` |

---

## 3. Empty State (Full-Page / Prominent CTA)

**File:** `src/components/shared/EmptyState.tsx`

For first-time or empty collection states where user should take action.

### Structure

```
┌─────────────────────────────────────┐
│                                     │
│        ┌──────────────┐             │
│        │  🌱 (h-12)   │             │
│        │  bg-muted/50 │             │
│        └──────────────┘             │
│                                     │
│        No crops yet                 │
│        Add your first crop          │
│        to get started               │
│                                     │
│        [ Add Crop ]                 │
│                                     │
└─────────────────────────────────────┘
```

### Token Summary

| Element | Classes |
|---------|---------|
| Container | `flex flex-col items-center justify-center py-16 px-4 text-center` |
| Icon container | `p-4 rounded-full bg-muted/50 mb-4` |
| Icon | `h-12 w-12 text-muted-foreground/60` |
| Title | `text-lg font-semibold text-foreground mb-2` |
| Description | `text-sm text-muted-foreground max-w-sm mb-6` |
| Action button | `Button size="lg"` (default variant) |

### When to Use

| Scenario | Component |
|----------|-----------|
| Section within a page has no data yet | DataState (empty variant) |
| Full-page or prominent "get started" | EmptyState (with CTA) |
| Dashboard widget with no content yet | EmptyState inside a Card |

---

## 4. Action Panel

**File:** `src/components/dashboard/ActionPanel.tsx`

Card-based section for AI features, grouped actions, or contextual tools.

### Structure

```
┌─────────────────────────────────────┐
│ CardHeader                          │
│ ┌─────────────────────────────────┐ │
│ │ Title             [Sec] [Pri]  │ │
│ │ Context text                    │ │
│ └─────────────────────────────────┘ │
│ CardContent                         │
│ ┌─────────────────────────────────┐ │
│ │ {children}                      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Token Summary

| Element | Classes |
|---------|---------|
| Container | `Card` |
| Header layout | `flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between` |
| Title | `CardTitle text-base` |
| Context | `mt-1 text-sm text-muted-foreground` |
| Actions | `flex items-center gap-2` |

### Usage

- AI suggestion panels (route optimization, stock advisor).
- Grouped action areas (quick actions on admin dashboard).
- Feature callouts with context + CTA.

---

## 5. Section Card Pattern

Standard pattern for distinct sections within a dashboard page.

### Structure

```tsx
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {title}
      </CardTitle>
      {headerAction}
    </div>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>
```

### Token Summary

| Element | Classes |
|---------|---------|
| Title size | `text-lg` (Heading 3 from type scale) |
| Title font | font-sans (CardTitle default), or `font-display` for emphasis |
| Icon | `h-5 w-5 text-muted-foreground` with `gap-2` |
| Header padding override | `pb-3` to reduce gap to content |
| Content | standard CardContent `p-4 pt-0` |

---

## 6. Skeleton Loaders

**File:** `src/components/ui/skeleton.tsx`

### Base Skeleton

```tsx
<Skeleton className="h-4 w-full" />
```

Base: `animate-pulse rounded-md bg-muted`

### Dashboard Skeleton Pattern

For full-page loading on first mount:

```tsx
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-3 w-20 bg-muted rounded mb-3" />
              <div className="h-7 w-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content section */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="h-4 w-40 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Section Skeleton Pattern

For a section within a loaded page:

```tsx
<Card>
  <CardHeader>
    <Skeleton className="h-5 w-32" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </CardContent>
</Card>
```

### Skeleton Rules

| Rule | Details |
|------|---------|
| Shape match | Skeleton blocks should approximate the shape of real content |
| Count | 3-5 skeleton lines per section |
| Width variation | Alternate widths (full, 3/4, 1/2, w-40) for realistic appearance |
| Animation | `animate-pulse` on the outermost container, OR individual `<Skeleton>` components |
| KPI skeletons | Match the KpiCard layout (short label line + wider value line) |

---

## 7. List Card Pattern

For displaying collections of items as cards (crops, farmlands, transport requests):

### Structure

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id} className="hover:shadow-elev-1 transition-all duration-standard">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
          </div>
          <Badge variant={...}>{item.status}</Badge>
        </div>
        {/* Additional details */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{item.detail1}</span>
          <span>{item.detail2}</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Token Summary

| Element | Classes |
|---------|---------|
| Grid | `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` |
| Card hover | `hover:shadow-elev-1 transition-all duration-standard` |
| Title | `font-medium` (Body size, medium weight) |
| Subtitle | `text-sm text-muted-foreground mt-1` |
| Metadata row | `mt-3 flex items-center gap-4 text-xs text-muted-foreground` |
| Status badge | `Badge` component with appropriate variant |

---

## 8. Filter Bar Pattern

For pages with filterable content (Admin OpsInbox, Marketplace Browse, list pages):

### Structure

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {/* Left: Search and filters */}
  <div className="flex flex-1 items-center gap-2">
    <div className="relative flex-1 sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder={t('common.search')} className="pl-9" />
    </div>
    <Select>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={t('common.filter')} />
      </SelectTrigger>
      <SelectContent>...</SelectContent>
    </Select>
  </div>

  {/* Right: Sort and view controls */}
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <ArrowUpDown className="h-4 w-4" />
      {t('common.sort')}
    </Button>
  </div>
</div>
```

### Token Summary

| Element | Classes |
|---------|---------|
| Container | `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` |
| Search input | `relative flex-1 sm:max-w-sm` with icon at `left-3` |
| Search icon | `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground` |
| Input padding (with icon) | `pl-9` |
| Filter select width | `w-[140px]` (or responsive) |
| Action buttons | `variant="outline" size="sm"` |

### Mobile Behavior

- Search and filters stack vertically (`flex-col`) below `sm`.
- Search input takes full width on mobile.
- Filter/sort controls should be accessible without horizontal scroll.

---

## 9. Activity Feed Pattern

For recent activity, notifications, or event logs:

### Structure

```tsx
<div className="space-y-4">
  {activities.map(activity => (
    <div key={activity.id} className="flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-muted p-1.5">
        <ActivityIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{activity.actor}</span>
          {' '}{activity.action}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(activity.timestamp)}
        </p>
      </div>
    </div>
  ))}
</div>
```

### Token Summary

| Element | Classes |
|---------|---------|
| List spacing | `space-y-4` |
| Row layout | `flex items-start gap-3` |
| Icon container | `mt-0.5 rounded-full bg-muted p-1.5` |
| Icon | `h-4 w-4 text-muted-foreground` |
| Actor name | `font-medium` |
| Action text | `text-sm` |
| Timestamp | `text-xs text-muted-foreground mt-0.5` |
| Content area | `flex-1 min-w-0` (min-w-0 for text truncation) |

---

## 10. Dashboard Layout Composition

A standard dashboard page combines these patterns in a consistent order:

```
PageShell (title + subtitle + actions)
├── KPI Row (2-4 KpiCards in grid)
├── Primary Content Section (Section Card or DataState-wrapped list)
├── Secondary Content (Action Panel, Activity Feed, etc.)
└── Tertiary Content (optional — AI suggestions, links)
```

### Example Dashboard Skeleton

```tsx
<DashboardLayout title={t('nav.dashboard')}>
  <PageShell
    title={t('farmer.dashboard.title')}
    subtitle={`${t('farmer.dashboard.welcome')}, ${name}`}
    actions={<Button variant="outline" size="sm"><RefreshCw /> {t('common.refresh')}</Button>}
  >
    {/* 1. KPI Row */}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <KpiCard ... />
      <KpiCard ... />
      <KpiCard ... />
      <KpiCard ... />
    </div>

    {/* 2. Primary content */}
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sprout className="h-5 w-5 text-muted-foreground" />
          {t('farmer.dashboard.recentCrops')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataState loading={...} error={...} empty={...} retry={...}>
          {/* Content */}
        </DataState>
      </CardContent>
    </Card>

    {/* 3. Secondary (AI panel) */}
    <ActionPanel
      title={t('farmer.dashboard.aiSuggestions')}
      context={t('farmer.dashboard.aiContext')}
      primaryAction={<Button size="sm">...</Button>}
    >
      {/* AI content */}
    </ActionPanel>
  </PageShell>
</DashboardLayout>
```

### Spacing Between Sections

Controlled by PageShell `density` prop:
- `compact` → `space-y-4` (16px)
- `comfortable` → `space-y-6` (24px) — default
- `spacious` → `space-y-8` (32px)

---

## 11. Pattern Selection Guide

| Need | Pattern | Component |
|------|---------|-----------|
| Show 2-4 key metrics | Stat Cards | KpiCard in grid |
| Wrap data section with loading/error/empty | State Wrapper | DataState |
| Show "get started" with CTA | Prominent Empty | EmptyState |
| AI features / grouped actions | Action Section | ActionPanel |
| Distinct content section | Section Block | Card + CardHeader + CardContent |
| Loading placeholder | Skeleton | Skeleton / animate-pulse divs |
| Collection of items as cards | Item Grid | Card grid (1/2/3 cols) |
| Search + filter controls | Toolbar | Filter Bar pattern |
| Recent events / notifications | Timeline | Activity Feed pattern |
| Page structure | Page Wrapper | PageShell inside DashboardLayout |
