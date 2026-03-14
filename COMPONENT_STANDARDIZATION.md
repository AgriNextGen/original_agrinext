# Component Standardization

> Canonical component definitions for AgriNext Gen.
> Every pattern listed here is the single authorized implementation.
> Do NOT create alternatives. Do NOT duplicate inline.

---

## 1. KpiCard (Stat Card)

**File:** `src/components/dashboard/KpiCard.tsx`

**Purpose:** Display a single numeric metric with label, optional trend, icon, and priority color. Used on dashboards and list page summaries.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | yes | Metric label (uppercase, text-xs) |
| value | string \| number | yes | Metric value (text-2xl, font-display) |
| trend | number | no | Percentage change; shows TrendingUp/Down icon |
| icon | LucideIcon | no | Icon in top-right muted box |
| priority | 'primary' \| 'success' \| 'warning' \| 'info' \| 'neutral' | no | Icon color theme; default 'neutral' |
| onClick | () => void | no | Makes card clickable with hover lift |

**Layout grid:**
```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
  <KpiCard label={t('farmer.crops.total')} value={cropCount} icon={Sprout} priority="primary" />
  <KpiCard label={t('farmer.crops.ready')} value={readyCount} icon={CheckCircle} priority="success" />
  <KpiCard label={t('farmer.crops.growing')} value={growingCount} icon={Leaf} priority="info" />
  <KpiCard label={t('farmer.crops.harvested')} value={harvestedCount} icon={Package} priority="neutral" />
</div>
```

**Migration rule:** Replace all custom stat card implementations (Card + CardContent + inline icon + text-2xl + label) with KpiCard. Affected pages:
- `src/pages/farmer/Crops.tsx` (lines 150–218)
- `src/pages/farmer/Farmlands.tsx` (lines 128–185)
- `src/pages/farmer/Transport.tsx` (lines 174–229)
- `src/pages/agent/Today.tsx` (lines 110–133)

---

## 2. EmptyState

**File:** `src/components/shared/EmptyState.tsx`

**Purpose:** Display a visual prompt when a collection has no items. Used when the user should take an action (e.g. "Add your first crop").

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| icon | LucideIcon | yes | Large centered icon (h-12 w-12) |
| title | string | yes | Bold heading (text-lg) |
| description | string | no | Muted subtext (text-sm, max-w-sm) |
| actionLabel | string | no | Primary CTA button label |
| onAction | () => void | no | CTA click handler |

**When to use:** Full-page or full-section empty states where the user can create something.

```tsx
<EmptyState
  icon={Sprout}
  title={t('farmer.crops.noCrops')}
  description={t('farmer.crops.addFirstCrop')}
  actionLabel={t('farmer.crops.addCrop')}
  onAction={() => setAddDialogOpen(true)}
/>
```

---

## 3. DataState

**File:** `src/components/ui/DataState.tsx`

**Purpose:** Universal async-state wrapper. Handles loading, error, and empty states around data-dependent content. Renders children only when data is ready.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| loading | boolean | no | Show spinner + loading label |
| empty | boolean | no | Show empty icon + title + message |
| error | string \| null | no | Show error icon + message + retry |
| loadingLabel | string | no | Custom loading text (default: t('common.loading')) |
| emptyTitle | string | no | Custom empty heading (default: t('common.noData')) |
| emptyMessage | string | no | Custom empty description |
| retry | () => void | no | Retry handler, renders Retry button on error |
| children | ReactNode | yes | Content to render when not loading/empty/error |

**When to use:** Wrap any list, grid, or data section. Always pass `error` and `retry` from the query hook.

```tsx
const { data, isLoading, isError, error, refetch } = useMyData();

<DataState
  loading={isLoading}
  error={isError ? (error?.message ?? t('errors.loadFailed')) : null}
  empty={!data?.length}
  emptyTitle={t('crops.noCrops')}
  emptyMessage={t('crops.addFirstPrompt')}
  retry={refetch}
>
  {/* render data */}
</DataState>
```

### EmptyState vs DataState — When to Use Which

| Scenario | Component |
|----------|-----------|
| Wrapping a list/grid that may be loading, empty, or errored | **DataState** |
| Full-page empty state with prominent CTA ("Get started") | **EmptyState** |
| Section inside a page that loads independently | **DataState** |
| Empty dashboard widget where user can create content | **EmptyState** inside the widget |

**Rule of thumb:** DataState is for data lifecycle; EmptyState is for onboarding/CTA prompts.

---

## 4. StatusBadge

**Current problem:** Transport status colors are redefined in 3+ files with different mappings. Crop/listing status colors are also scattered.

**Solution:** Centralize all status configurations in one module.

**Proposed file:** `src/lib/statusConfig.ts`

```tsx
export type TransportStatus =
  | 'open' | 'requested' | 'assigned' | 'accepted'
  | 'en_route' | 'picked_up' | 'in_transit' | 'in_progress'
  | 'delivered' | 'completed' | 'cancelled';

export type CropStatus = 'growing' | 'one_week' | 'ready' | 'harvested';

export type ListingStatus = 'active' | 'draft' | 'sold_out' | 'expired';

export type TripStatus =
  | 'created' | 'accepted' | 'pickup_done'
  | 'in_transit' | 'delivered' | 'completed' | 'cancelled';

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export const transportStatusConfig: Record<TransportStatus, StatusConfig> = {
  open:        { label: 'Open',        variant: 'outline' },
  requested:   { label: 'Requested',   variant: 'secondary' },
  assigned:    { label: 'Assigned',    variant: 'default' },
  accepted:    { label: 'Accepted',    variant: 'default' },
  en_route:    { label: 'En Route',    variant: 'default', className: 'bg-blue-100 text-blue-800' },
  picked_up:   { label: 'Picked Up',   variant: 'default', className: 'bg-blue-100 text-blue-800' },
  in_transit:  { label: 'In Transit',  variant: 'default', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', variant: 'default', className: 'bg-yellow-100 text-yellow-800' },
  delivered:   { label: 'Delivered',   variant: 'default', className: 'bg-green-100 text-green-800' },
  completed:   { label: 'Completed',   variant: 'default', className: 'bg-green-100 text-green-800' },
  cancelled:   { label: 'Cancelled',   variant: 'destructive' },
};
```

**Usage with shadcn Badge:**
```tsx
import { Badge } from '@/components/ui/badge';
import { transportStatusConfig } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

function TransportStatusBadge({ status }: { status: TransportStatus }) {
  const config = transportStatusConfig[status] ?? transportStatusConfig.open;
  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
```

**Migration:** Remove inline `statusColors`, `statusConfig`, `getStatusColor` maps from:
- `src/pages/farmer/Transport.tsx`
- `src/pages/logistics/Dashboard.tsx`
- `src/pages/logistics/ActiveTrips.tsx`
- `src/pages/marketplace/Browse.tsx`
- `src/pages/farmer/Crops.tsx`

Replace with imports from `src/lib/statusConfig.ts`.

---

## 5. PageShell (Page Header)

Documented fully in `UX_ARCHITECTURE.md`. Summary:

**File:** `src/components/layout/PageShell.tsx`

**Purpose:** Canonical page wrapper providing title, subtitle, breadcrumbs, actions, and density-controlled spacing.

**Rule:** All pages use PageShell (directly or via PageHeader alias). No other wrapper patterns.

---

## 6. ActionPanel

**File:** `src/components/dashboard/ActionPanel.tsx`

**Purpose:** Card-based section for AI features, grouped actions, or contextual tools.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | yes | Section heading (CardTitle, text-base) |
| context | string | no | Explanatory text below title |
| primaryAction | ReactNode | no | Primary button/action |
| secondaryAction | ReactNode | no | Secondary button/action |
| children | ReactNode | no | Content below header |

**When to use:** AI suggestion panels, route optimization, diagnostic tools, or any card with header + actions + optional body.

---

## 7. SectionCard

**Pattern (not a standalone component):** Wrap related content in a shadcn Card with consistent header.

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

**When to use:** Any distinct section within a dashboard or detail page (e.g. "Recent Activity", "Crop Summary", "Weather Overview").

**Rules:**
- CardTitle always `text-lg` (not `text-base` or `text-xl`).
- Icon in title always `h-5 w-5 text-muted-foreground`.
- Use `pb-3` on CardHeader for comfortable density.

---

## 8. Component Registry

| Component | File | Category |
|-----------|------|----------|
| KpiCard | `src/components/dashboard/KpiCard.tsx` | Stats |
| EmptyState | `src/components/shared/EmptyState.tsx` | States |
| DataState | `src/components/ui/DataState.tsx` | States |
| ActionPanel | `src/components/dashboard/ActionPanel.tsx` | Sections |
| PageShell | `src/components/layout/PageShell.tsx` | Layout |
| PageHeader | `src/components/shared/PageHeader.tsx` | Layout (alias) |
| ErrorBoundary | `src/components/shared/ErrorBoundary.tsx` | Error handling |
| StatusBadge | `src/lib/statusConfig.ts` (config) + Badge | Data display |

---

## 9. Anti-Patterns

- Do NOT create ad-hoc stat cards with Card + inline `text-2xl` — use KpiCard.
- Do NOT define status color maps inside page files — use `statusConfig.ts`.
- Do NOT create new empty state layouts — use EmptyState or DataState.
- Do NOT create new page wrappers — use PageShell.
- Do NOT add action buttons to DataState empty variant — use EmptyState for CTAs.
- Do NOT use `variant="hero"` for in-dashboard buttons — hero is for marketing/landing pages only.
