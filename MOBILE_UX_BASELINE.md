# Mobile UX Baseline

> Minimum mobile usability standards for AgriNext Gen.
> This is a phone-first platform for Karnataka farmers — mobile UX is not optional.
> All components and pages MUST meet these standards.

---

## 1. Breakpoint System

| Breakpoint | Tailwind | Width | Primary Context |
|------------|----------|-------|-----------------|
| xs (default) | — | < 640px | Small phones |
| sm | `sm:` | ≥ 640px | Large phones |
| md | `md:` | ≥ 768px | Tablets, sidebar visible |
| lg | `lg:` | ≥ 1024px | Small laptops |
| xl | `xl:` | ≥ 1280px | Desktops |

**Mobile breakpoint:** `768px` (md). The `useIsMobile()` hook (`src/hooks/use-mobile.tsx`) uses this value. Below 768px:
- Sidebar is hidden (off-canvas drawer).
- Header shows hamburger menu.
- Content is full-width with `p-4` padding.

---

## 2. Touch Target Minimum

### Rule: 44×44px Minimum

Every interactive element (buttons, links, toggles, checkboxes, list item taps) MUST have a minimum touch target of **44×44 CSS pixels** (Apple HIG / WCAG 2.5.5).

### Implementation

For shadcn Button, the default height is 36px (`h-9`). On mobile, enforce minimum height:

```tsx
<Button className="min-h-[44px]">
  {label}
</Button>
```

For icon buttons (`size="icon"`), default is 36×36px (`h-9 w-9`). On mobile:
```tsx
<Button size="icon" className="min-h-[44px] min-w-[44px]">
  <Icon className="h-5 w-5" />
</Button>
```

### Where This Matters Most

| Component | Current Size | Fix |
|-----------|-------------|-----|
| Sidebar nav items | py-2.5 ≈ 40px total | Already close; add `min-h-[44px]` |
| Task row action buttons (Agent Today) | size="sm" ≈ 32px | Change to `min-h-[44px]` on mobile |
| KpiCard (when clickable) | No constraint | Already large enough (p-4/p-5 content) |
| Table row action icons | size="icon" ≈ 36px | Add `min-h-[44px] min-w-[44px]` |
| Form inputs | h-10 = 40px | Add `min-h-[44px]` on mobile |
| Notification dropdown items | p-3 ≈ adequate | OK as-is |

### Utility Class (optional)

Consider adding a utility:
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 3. Responsive Layout Patterns

### Grid Collapse

Grids should collapse from multi-column to single or two-column on mobile:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

| Content Type | Mobile | Tablet | Desktop |
|-------------|--------|--------|---------|
| KPI cards | 2 cols | 3-4 cols | 4 cols |
| Item cards (crops, farmlands) | 1 col | 2 cols | 3 cols |
| Product grid (marketplace) | 1 col | 2 cols | 3-4 cols |
| Detail sections | 1 col stacked | 2 cols side-by-side | 2 cols |

### Stacking Order

On mobile, vertically stack elements that sit side-by-side on desktop:
```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div>{title}</div>
  <div>{actions}</div>
</div>
```

This is already the pattern in PageShell for title + actions.

---

## 4. Responsive Tables

Tables with many columns are problematic on mobile. Apply one of these patterns:

### Pattern A: Card List (Preferred)

Replace table rows with stacked cards on mobile:

```tsx
{/* Desktop: table */}
<div className="hidden md:block">
  <Table>{...}</Table>
</div>

{/* Mobile: card list */}
<div className="md:hidden space-y-3">
  {items.map(item => (
    <Card key={item.id}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.status}</p>
          </div>
          <Badge>{item.badge}</Badge>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### Pattern B: Horizontal Scroll

For data-dense admin tables where all columns matter:

```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <Table className="min-w-[600px]">
    {/* table content */}
  </Table>
</div>
```

Negative margins prevent the scrollbar from clipping content padding.

### Pattern C: Priority Columns

Hide non-essential columns on mobile:

```tsx
<TableHead className="hidden md:table-cell">District</TableHead>
...
<TableCell className="hidden md:table-cell">{item.district}</TableCell>
```

### Which Pattern to Use

| Data Type | Mobile Pattern |
|-----------|---------------|
| Crop list, farmland list | Card List (A) |
| Transport requests | Card List (A) |
| Admin entity tables | Priority Columns (C) + Scroll (B) fallback |
| Trip location events | Horizontal Scroll (B) |
| Order details table | Priority Columns (C) |

---

## 5. Mobile Sidebar Behavior

Current implementation in `DashboardLayout.tsx`:

| Behavior | Status |
|----------|--------|
| Off-canvas drawer (translateX) | Implemented |
| Overlay backdrop (bg-black/60, backdrop-blur) | Implemented |
| Close on route change | Implemented |
| Close on ESC | Implemented |
| Close on overlay tap | Implemented |
| Body scroll lock when open | Implemented |
| Swipe to close | Not implemented |

### Recommended Addition: Swipe Gesture

Add touch swipe-to-close for the sidebar:
- Detect `touchstart` and `touchmove` on the sidebar element.
- If swipe left exceeds 50px threshold, trigger `closeSidebar()`.
- This is a natural gesture on mobile and improves UX.

---

## 6. Mobile Form Patterns

### Input Sizing

All form inputs should be at least 44px tall on mobile:
```tsx
<Input className="min-h-[44px]" />
<Select className="min-h-[44px]" />
<Textarea className="min-h-[88px]" />
```

### Form Layout

- Labels above inputs (never side-by-side on mobile).
- Full-width inputs on mobile; constrained on desktop.
- Submit button at bottom, full-width on mobile:
```tsx
<Button type="submit" className="w-full md:w-auto min-h-[44px]">
  {t('common.submit')}
</Button>
```

### Long Forms

For forms with 5+ fields (e.g. Transport Request, Signup):
- Group fields into logical sections with subtle headers.
- Consider progressive disclosure (show advanced fields behind "More options").
- Keep the submit button visible — sticky bottom on mobile if the form scrolls:
```tsx
<div className="sticky bottom-0 bg-background border-t p-4 md:relative md:border-0 md:p-0">
  <Button type="submit" className="w-full md:w-auto">
    {t('common.submit')}
  </Button>
</div>
```

---

## 7. Mobile Dialog/Modal Patterns

### Sheet vs Dialog

- **Dialog** (centered overlay): Use for confirmations, small forms (1-3 fields).
- **Sheet** (bottom drawer): Preferred on mobile for longer content, filters, multi-step forms.

shadcn provides both. On mobile, prefer Sheet for content > 200px tall:

```tsx
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const isMobile = useIsMobile();

// Render Sheet on mobile, Dialog on desktop
{isMobile ? (
  <Sheet open={open} onOpenChange={setOpen}>
    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
      {content}
    </SheetContent>
  </Sheet>
) : (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>{content}</DialogContent>
  </Dialog>
)}
```

### Rules
- Modals should not exceed 85vh on mobile.
- Long modal content must scroll.
- Close button (X) must be in the top-right, at least 44×44px.
- Submit/action buttons inside modals should be sticky at the bottom on mobile.

---

## 8. Typography Scaling

| Element | Mobile | Desktop |
|---------|--------|---------|
| Page title (h1) | text-xl (20px) | text-2xl (24px) |
| Section title (h2) | text-lg (18px) | text-lg (18px) |
| Body text | text-sm (14px) | text-sm (14px) |
| KPI value | text-xl (20px) | text-2xl (24px) |
| KPI label | text-xs (12px) | text-xs (12px) |
| Nav items | text-sm (14px) | text-sm (14px) |
| Button text | text-sm (14px) | text-sm (14px) |

The current PageShell uses `text-2xl` for titles regardless of breakpoint. Consider adding responsive scaling:

```tsx
<h1 className="text-xl md:text-2xl font-display font-semibold tracking-tight">
  {title}
</h1>
```

---

## 9. Content Padding and Safe Areas

### Main Content Padding

DashboardLayout: `p-4 md:p-6` — good.

### Card Content Padding

KpiCard: `p-4 sm:p-5` — good, responsive.

### Edge-to-Edge Content

Some content should extend to screen edges on mobile for more space:
```tsx
<div className="-mx-4 px-4 md:mx-0 md:px-0">
  {/* full-bleed section */}
</div>
```

### Safe Area (Notched Devices)

For PWA mode on notched phones, add safe area padding:
```css
@supports (padding: env(safe-area-inset-bottom)) {
  .sticky-footer {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }
}
```

---

## 10. Performance on Mobile

### Image Optimization

- Use responsive images with `srcset` or `sizes` attributes.
- Lazy load images below the fold: `loading="lazy"`.
- Crop thumbnails to appropriate sizes (don't send 2000px images to a 375px screen).

### Bundle Awareness

- Mobile users are often on slow networks. Keep initial bundle size small.
- Lazy load role-specific route modules (already done via React.lazy in route files).
- Avoid loading admin components for farmer users.

### Scroll Performance

- Avoid `position: fixed` on elements that contain scrollable content (causes jank on iOS).
- Use `will-change: transform` sparingly.
- Long lists: consider virtualization (react-window) for 100+ items.

---

## 11. Mobile Testing Checklist

For every new page or component, verify on a 375px viewport (iPhone SE/12/13/14):

- [ ] All touch targets are ≥ 44×44px
- [ ] Text is readable without zooming (≥ 14px body)
- [ ] No horizontal scroll on the page (unless intentional table scroll)
- [ ] Forms are usable: labels visible, inputs full-width, submit reachable
- [ ] Modals/dialogs don't overflow viewport
- [ ] Cards and grids stack to 1-2 columns
- [ ] Sidebar opens/closes correctly with overlay
- [ ] Header title doesn't overflow (truncated)
- [ ] Empty/loading/error states display correctly
- [ ] KPI cards are legible at 2-column width
