# UX State System

> Universal rules for handling async states across all pages in AgriNext Gen.
> Every page that fetches data MUST handle loading, empty, error, and success states.

---

## 1. The Four States

Every data-dependent UI section exists in exactly one of these states:

| State | Trigger | User Sees |
|-------|---------|-----------|
| **Loading** | Query is fetching | Skeleton or spinner with label |
| **Empty** | Query succeeded, zero results | Icon + title + optional CTA |
| **Error** | Query failed | Error icon + message + Retry button |
| **Success** | Query succeeded, has data | Actual content |

The rendering priority is: **loading → error → empty → success** (first match wins).

---

## 2. DataState — The Universal Wrapper

**File:** `src/components/ui/DataState.tsx`

DataState is the primary component for handling these four states. It wraps content and only renders `children` when data is ready.

```tsx
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['crops', farmerId],
  queryFn: fetchCrops,
});

<DataState
  loading={isLoading}
  error={isError ? (error?.message ?? t('errors.loadFailed')) : null}
  empty={!data?.length}
  emptyTitle={t('crops.noCrops')}
  emptyMessage={t('crops.addFirstPrompt')}
  retry={refetch}
>
  <CropGrid items={data!} />
</DataState>
```

### Required Props (Always Pass These)

| Prop | Source | Notes |
|------|--------|-------|
| loading | `isLoading` from useQuery | Shows spinner |
| error | `isError ? error.message : null` | Shows error + retry |
| empty | `!data?.length` or `data === null` | Shows empty state |
| retry | `refetch` from useQuery | Always provide for error recovery |

### Optional Customization

| Prop | Default | When to Override |
|------|---------|-----------------|
| loadingLabel | `t('common.loading')` | When context helps: "Loading crops..." |
| emptyTitle | `t('common.noData')` | Always override for page-specific copy |
| emptyMessage | undefined | Add when helpful: "Add your first farmland" |

---

## 3. Skeleton Loaders

### When to Use Skeletons vs DataState Loading

| Scenario | Use |
|----------|-----|
| Entire page is loading (first mount) | **Skeleton layout** at page level |
| A single section within a loaded page | **DataState loading** (inline spinner) |
| Dashboard with multiple independent sections | **Skeleton per section** |

### Page-Level Skeleton Pattern

```tsx
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row skeleton */}
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
      {/* Content skeleton */}
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

### Section Skeleton Pattern (shadcn Skeleton)

```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Card>
  <CardHeader>
    <Skeleton className="h-5 w-32" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </CardContent>
</Card>
```

### Rules for Skeletons
- Match the rough shape of actual content (card dimensions, text lines, grid columns).
- Use `animate-pulse` on the container OR shadcn `<Skeleton>` components.
- Keep skeletons simple — 3–5 placeholder blocks per section.
- Dashboard pages: show skeleton for the full dashboard, not DataState spinner.
- List/detail pages: DataState spinner is acceptable.

---

## 4. Empty States

### Choosing the Right Empty Component

| Context | Component | Example |
|---------|-----------|---------|
| First-time user, can create something | **EmptyState** (with CTA) | "No crops yet" + "Add Crop" button |
| Filtered list returns zero results | **DataState empty** (no CTA) | "No matching results" |
| Dashboard widget with no data | **EmptyState** (inside Card) | "No recent orders" + "Browse" |
| Section that will populate over time | **DataState empty** (informational) | "No notifications" |

### Empty State Copy Guidelines

Every empty state MUST have:
1. **Title** — what's missing ("No crops yet", "No pending tasks")
2. **Message** (if actionable) — what to do ("Add your first crop to get started")

Labels must use i18n keys. Never hardcode English strings.

```tsx
// Good
<EmptyState
  icon={Sprout}
  title={t('farmer.crops.noCrops')}
  description={t('farmer.crops.addFirstPrompt')}
  actionLabel={t('farmer.crops.addCrop')}
  onAction={openAddDialog}
/>

// Bad — hardcoded, no CTA
<div className="text-center py-8">
  <p>No crops found</p>
</div>
```

---

## 5. Error States

### Error Display Rules

1. **Always show a human-readable message.** Never show raw error objects or stack traces.
2. **Always offer a Retry button** when the error is recoverable (network, timeout).
3. **Use DataState** for section-level errors.
4. **Use ErrorBoundary** for component-tree crashes.

### DataState Error

DataState renders a bordered error box with destructive styling:
```
┌─────────────────────────────────┐
│      ⚠ [error message]         │
│         [ Retry ]               │
└─────────────────────────────────┘
```

Always pass `retry={refetch}` so the user can recover.

### Page-Level Error (isError from useQuery)

For dashboard pages with complex data, handle isError at the page level with a dedicated error block:

```tsx
if (isError) {
  return (
    <DashboardLayout title={title}>
      <PageShell title={title}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('errors.pageLoadFailed')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t('errors.tryAgain')}</p>
          <Button onClick={refetch}>{t('common.retry')}</Button>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
```

### ErrorBoundary

**File:** `src/components/shared/ErrorBoundary.tsx`

Catches runtime React errors (null access, thrown exceptions). Shows a generic error page with Reload button.

**Placement strategy:**
- One ErrorBoundary at App root (already exists in `App.tsx`).
- Add per-role-section ErrorBoundary around each role's routes:

```tsx
// In route modules
<ErrorBoundary>
  <Route path="dashboard" element={<FarmerDashboard />} />
  <Route path="crops" element={<Crops />} />
  {/* ... */}
</ErrorBoundary>
```

This prevents a crash in one role section from blanking the entire app.

---

## 6. Success Confirmations

### Mutation Success

All create/update/delete mutations use toast notifications on success:

```tsx
const mutation = useMutation({
  mutationFn: createCrop,
  onSuccess: () => {
    toast({
      title: t('farmer.crops.addSuccess'),
      description: t('farmer.crops.addSuccessDesc'),
    });
    queryClient.invalidateQueries({ queryKey: ['crops'] });
  },
  onError: (err) => {
    toast({
      title: t('errors.operationFailed'),
      description: err.message,
      variant: 'destructive',
    });
  },
});
```

### Toast vs Inline Feedback

| Action | Feedback |
|--------|----------|
| Create / Add | Toast (success) |
| Update / Edit | Toast (success) |
| Delete | Toast (success) after confirmation dialog |
| Form validation error | Inline field errors (red text below input) |
| Network error on form submit | Toast (destructive) |
| Background sync | SyncIndicator in header |

### Rules
- Always show a toast on successful mutation.
- Always show a destructive toast on failed mutation.
- Never show success inline AND toast simultaneously — pick one (toast for mutations).
- Form validation errors are always inline, never toasts.

---

## 7. Checklist for New Pages

When creating a new page that fetches data, verify:

- [ ] Page renders skeleton or loading state on first mount
- [ ] DataState wraps every data-dependent section
- [ ] `error` and `retry` are passed to DataState
- [ ] Empty state has a meaningful title (not generic "No data")
- [ ] Empty state has a CTA if the user can create content
- [ ] All strings use `t('...')`
- [ ] Mutations show success toast and destructive error toast
- [ ] ErrorBoundary exists at the route-group level

---

## 8. Current Gaps to Fix

| Page | Issue | Fix |
|------|-------|-----|
| Agent Dashboard | No loading or error state | Add skeleton + isError branch |
| Agent Today | Partial skeleton, no page-level error | Add isError fallback |
| Several admin pages | DataState without error/retry | Add error + retry props |
| Farmer Crops/Farmlands/Transport | Custom stat cards, no DataState error | Migrate to KpiCard + add error handling |
| Marketplace Browse | Hardcoded empty strings | Use i18n + DataState |
