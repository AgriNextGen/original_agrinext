# Icon System

> Official icon guidelines for the AgriNext Gen platform.
> All icons use the Lucide React library. No other icon libraries.
> Icons are functional UI elements, not decoration.

---

## 1. Icon Library

**Library:** [Lucide React](https://lucide.dev/) (`lucide-react`)

Lucide provides a consistent set of stroke-based icons at 24×24 native viewbox with 2px stroke width. All icons are SVG and tree-shakeable.

### Import Pattern

```tsx
import { Sprout, Truck, Users, Bell } from 'lucide-react';
```

Always import individual icons. Never import a wildcard or barrel export.

---

## 2. Size Scale

Three standard sizes cover all use cases:

| Name | Pixels | Tailwind Classes | Context |
|------|--------|-----------------|---------|
| **Small** | 16×16 | `h-4 w-4` | Inline with text, button icons, dropdown arrows, select chevrons, breadcrumb separators |
| **Medium** | 20×20 | `h-5 w-5` | Navigation items, header icons, KpiCard icons, section header icons, table action icons |
| **Large** | 24×24 | `h-6 w-6` | Standalone emphasis, close buttons in large dialogs |

### Extended Sizes (Special Cases Only)

| Name | Pixels | Tailwind Classes | Context |
|------|--------|-----------------|---------|
| **XS** | 14×14 | `h-3.5 w-3.5` | Trend indicators (TrendingUp/Down in KpiCard), tight inline contexts |
| **XL** | 48×48 | `h-12 w-12` | Empty state illustrations, onboarding prompts |

---

## 3. Size by Context

| Context | Size | Classes | Example Icons |
|---------|------|---------|---------------|
| Sidebar nav items | Medium | `h-5 w-5` | LayoutDashboard, Sprout, Truck |
| Header actions (bell, search, menu) | Medium | `h-5 w-5` | Bell, Search, Menu, X |
| Button with icon + text | Small | `h-4 w-4` | Plus, Download, Pencil (via `[&_svg]:size-4` in button base) |
| Icon-only button | Medium | `h-5 w-5` | Menu, X, Search |
| KpiCard icon box | Medium | `h-5 w-5` | Sprout, CheckCircle, Truck |
| Section header (CardTitle) | Medium | `h-5 w-5` | Activity, Sparkles, MapPin |
| Table cell actions | Small | `h-4 w-4` | Pencil, Trash2, Eye |
| Badge/status icon | Small | `h-4 w-4` | AlertTriangle, CheckCircle |
| Select/dropdown chevron | Small | `h-4 w-4` | ChevronDown, ChevronUp, Check |
| Empty state (EmptyState) | XL | `h-12 w-12` | Sprout, Package, Inbox |
| DataState states | Medium | `h-5 w-5` | Loader2, Inbox, AlertTriangle |
| Trend indicator (KpiCard) | XS | `h-3.5 w-3.5` | TrendingUp, TrendingDown, Minus |
| Dialog close button | Small | `h-4 w-4` | X |
| Notification badge dot | — | `h-4 w-4` (the count badge, not icon) | — |

---

## 4. Placement Rules

### Icon + Text (Inline)

Icon to the left of text with consistent gap:

```tsx
<div className="flex items-center gap-2">
  <Icon className="h-4 w-4" />
  <span>Label</span>
</div>
```

| Gap | Class | Context |
|-----|-------|---------|
| 8px | `gap-2` | Buttons, small inline pairs, badge icons |
| 12px | `gap-3` | Navigation items, section headers |

### Icon in Container (KpiCard)

Icon placed inside a background box:

```tsx
<div className="rounded-lg bg-muted p-2.5">
  <Icon className="h-5 w-5" />
</div>
```

The container is `rounded-lg` with `p-2.5` (10px) padding, giving a ~40px total touch target.

### Icon-Only Buttons

```tsx
<Button variant="ghost" size="icon" aria-label="Open menu">
  <Menu className="h-5 w-5" />
</Button>
```

- Always provide `aria-label` for accessibility.
- Button `size="icon"` renders `h-10 w-10` (40px).
- For mobile, add `min-h-[44px] min-w-[44px]` to meet touch target guidelines.
- Icon inside is `h-5 w-5`.

### Icon at End (Trailing Icon)

For elements where the icon follows text (e.g. external link, expand):

```tsx
<div className="flex items-center gap-1.5">
  <span>View details</span>
  <ChevronRight className="h-4 w-4" />
</div>
```

Use `gap-1.5` (6px) for trailing icons — tighter than leading.

### Icon as Status Indicator

In tables and lists, status icons sit next to status text:

```tsx
<div className="flex items-center gap-1.5">
  <CheckCircle className="h-4 w-4 text-success" />
  <span className="text-sm">Completed</span>
</div>
```

Use semantic colors on status icons: `text-success`, `text-warning`, `text-destructive`, `text-info`.

---

## 5. Color Rules for Icons

| Context | Color | Class |
|---------|-------|-------|
| Nav item (inactive) | Inherits from text | `text-sidebar-foreground/70` (via parent) |
| Nav item (active) | Inherits from text | Role-specific active text color (via parent) |
| Header icons | Foreground | Default (inherits `text-foreground`) |
| Section header icon | Muted | `text-muted-foreground` |
| KpiCard icon | Priority-based | `text-primary`, `text-success`, `text-warning`, `text-info`, `text-muted-foreground` |
| Empty state icon | Muted | `text-muted-foreground/60` |
| DataState loading | Muted | `text-muted-foreground` (with `animate-spin`) |
| DataState error | Destructive | `text-destructive` |
| Button icon | Inherits button text color | — |
| Table action icon | Muted, primary on hover | `text-muted-foreground hover:text-foreground` |
| Success status | Success | `text-success` |
| Warning status | Warning | `text-warning` |
| Error status | Destructive | `text-destructive` |

### Rules

- Never assign a static color to a nav icon — let it inherit from the active/inactive state.
- Always use semantic color classes, not raw palette colors (e.g. `text-destructive`, not `text-red-500`).
- Icons in buttons inherit the button text color — do not set icon color separately.

---

## 6. Stroke Width

All Lucide icons default to 2px stroke width. This is the standard for AgriNext Gen.

- Do NOT modify `strokeWidth` props on icons.
- If an icon looks too heavy at `h-4 w-4`, the issue is icon choice, not stroke width. Choose a simpler icon.
- If an icon looks too light at `h-12 w-12` (empty state), the visual weight comes from the surrounding `bg-muted/50 p-4 rounded-full` container, not from thickening the stroke.

---

## 7. Semantic Icon Assignment

Each concept maps to one specific icon. This prevents the same icon from representing different things.

### Navigation Icons (from NAVIGATION_ARCHITECTURE.md)

| Concept | Icon | Used In |
|---------|------|---------|
| Dashboard / Overview | `LayoutDashboard` | All roles |
| Crops | `Sprout` | Farmer, Admin |
| Farmlands | `LandPlot` | Farmer |
| Transport / Logistics | `Truck` | Farmer, Agent, Admin, Logistics |
| Listings / Shopping | `ShoppingBag` | Farmer, Buyer, Admin |
| Orders / Packages | `Package` | Farmer, Buyer, Logistics, Admin |
| Earnings / Finance | `DollarSign` | Farmer, Admin |
| Notifications | `Bell` | Farmer |
| Settings / Profile | `Settings` | All roles |
| Tasks / Clipboard | `ClipboardList` | Agent, Admin |
| People / Users | `Users` | Agent, Admin |
| Agent Management | `UserCog` | Admin |
| All Farmers (search) | `UserSearch` | Agent |
| Location / Map | `MapPin` | Agent, Logistics |
| Calendar / Day | `CalendarDays` | Farmer, Agent |
| Inbox | `Inbox` | Admin |
| Tickets | `Ticket` | Admin |
| AI / Bot | `Bot` | Admin |
| AI / Sparkle | `Sparkles` | Admin |
| Jobs / Work | `Briefcase` | Admin |
| Payouts | `Banknote` | Admin |
| Refunds | `RotateCcw` | Admin |
| Disputes / Warning | `AlertTriangle` | Admin |
| System Health | `Activity` | Admin |
| Database / Data | `Database` | Admin |
| Testing | `TestTube` | Admin |
| Completed / Done | `CheckCircle` | Logistics |
| Vehicles | `CarFront` | Logistics |
| Pending / Time | `Clock` | Admin |

### Action Icons

| Action | Icon |
|--------|------|
| Add / Create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Close | `X` |
| Search | `Search` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| Refresh | `RefreshCw` |
| Download | `Download` |
| Upload | `Upload` |
| Share | `Share2` |
| Copy | `Copy` |
| External link | `ExternalLink` |
| Expand | `ChevronDown` |
| Collapse | `ChevronUp` |
| Navigate forward | `ChevronRight` |
| Navigate back | `ChevronLeft` |
| More options | `MoreHorizontal` or `MoreVertical` |
| Eye / View | `Eye` |
| Log out | `LogOut` |
| Phone | `Phone` |

### Status Icons

| Status | Icon |
|--------|------|
| Success / Complete | `CheckCircle` |
| Warning / Caution | `AlertTriangle` |
| Error / Failure | `XCircle` or `AlertTriangle` |
| Info / Notice | `Info` |
| Loading | `Loader2` (with `animate-spin`) |
| Empty / No data | `Inbox` |
| Pending / Waiting | `Clock` |

---

## 8. Animated Icons

Only one icon has standard animation:

```tsx
<Loader2 className="h-5 w-5 animate-spin" />
```

Used in DataState loading state and button loading states.

### Rules

- Only `Loader2` uses `animate-spin`.
- Do NOT animate other icons (e.g. pulsing Bell, bouncing Plus).
- For button loading states, replace the button icon with `Loader2 animate-spin` and disable the button.

---

## 9. Anti-Patterns

- Do NOT use icons from libraries other than Lucide (no Font Awesome, Heroicons, Material Icons).
- Do NOT use icons without text labels unless in a well-established icon-only context (close button, hamburger menu) with `aria-label`.
- Do NOT use the same icon for two different navigation items in the same sidebar.
- Do NOT resize icons with non-standard Tailwind classes (e.g. `h-[18px] w-[18px]`). Stay on the scale: 3.5, 4, 5, 6, or 12.
- Do NOT use filled icon variants. Lucide icons are outline-only by design.
- Do NOT change `strokeWidth` on icons.
- Do NOT use icon-only buttons without `aria-label`.
- Do NOT use decorative icons (`Sparkles`, `Star`) for functional navigation — save them for AI or premium features.
