# Navigation Architecture

> Canonical sidebar structure for all five roles in AgriNext Gen.
> Replaces the current flat list approach; introduces grouped sections for Admin.

---

## 1. Principles

1. **Grouped navigation for 8+ items.** Roles with fewer than 8 nav items use a flat list. Roles with 8+ items (Admin, Farmer) use labeled section groups.
2. **One icon per concept.** No two items in the same sidebar share the same icon.
3. **Consistent last items.** Every role sidebar ends with Profile/Settings, then Sign Out.
4. **i18n for all labels.** Every label uses `t('nav.xxx')` — never hardcoded English.
5. **Badge support.** Any nav item can show a numeric badge (e.g. notifications, pending items).

---

## 2. Sidebar Structure by Role

### Farmer (10 items, 2 groups)

```
── My Farm ─────────────────────
   My Day              CalendarDays    /farmer/my-day
   Dashboard           LayoutDashboard /farmer/dashboard
   Crops               Sprout          /farmer/crops
   Farmlands           LandPlot        /farmer/farmlands

── Market & Logistics ──────────
   Transport            Truck          /farmer/transport
   Listings             ShoppingBag    /farmer/listings
   Orders               Package        /farmer/orders
   Earnings             DollarSign     /farmer/earnings

── ─────────────────────────────
   Notifications (badge) Bell         /farmer/notifications
   Settings              Settings     /farmer/settings
```

**Changes from current:**
- Added two section labels: "My Farm" and "Market & Logistics".
- Notifications and Settings remain ungrouped at the bottom.
- No icon changes needed; current icons are already unique.

---

### Agent (8 items, flat with divider)

```
   Today               CalendarDays    /agent/today
   Dashboard           LayoutDashboard /agent/dashboard
   My Tasks            ClipboardList   /agent/tasks
   ─ divider ─
   My Farmers          Users           /agent/my-farmers
   All Farmers         UserSearch*     /agent/farmers       ← icon change
   Transport           Truck           /agent/transport
   Service Area        MapPin          /agent/service-area
   ─ divider ─
   Profile             Settings        /agent/profile
```

**Changes from current:**
- "Farmers & Crops" renamed to "All Farmers" for clarity; icon changed from `Users` (duplicate) to `UserSearch` or `UsersRound`.
- Dividers separate daily work, network, and account sections.

---

### Logistics (7 items, flat)

```
   Dashboard           LayoutDashboard /logistics/dashboard
   Available Loads     Package         /logistics/loads
   Active Trips        Truck           /logistics/trips
   Completed           CheckCircle     /logistics/completed    ← icon fix
   My Vehicles         CarFront*       /logistics/vehicles     ← icon fix
   Service Area        MapPin          /logistics/service-area
   ─ divider ─
   Profile             Settings        /logistics/profile
```

**Changes from current:**
- "Completed" icon changed from `CropIcon` (semantically wrong) to `CheckCircle`.
- "My Vehicles" icon changed from `LandPlot` to `CarFront` or `Bus`.
- Divider before Profile.

---

### Buyer / Marketplace (4 items, flat)

```
   Dashboard           LayoutDashboard /marketplace/dashboard
   Browse Products     ShoppingBag     /marketplace/browse
   My Orders           Package         /marketplace/orders
   ─ divider ─
   Profile             Settings        /marketplace/profile
```

No structural changes needed. Already clean.

---

### Admin (22 items, 6 groups)

This is the most significant restructure. The current flat list of 22 items is reorganized into six collapsible groups.

```
── Overview ────────────────────
   Dashboard           LayoutDashboard /admin/dashboard
   Ops Inbox (badge)   Inbox           /admin/ops
   Tickets (badge)     Ticket          /admin/tickets

── Network ─────────────────────
   Farmers             Users           /admin/farmers
   Agents              UserCog*        /admin/agents         ← icon change
   Transporters        Truck           /admin/transporters
   Buyers              ShoppingBag     /admin/buyers

── Operations ──────────────────
   All Crops           Sprout          /admin/crops
   Transport           Package         /admin/transport
   Orders              ClipboardList   /admin/orders
   Pending Updates     Clock*          /admin/pending-updates ← icon change
   Disputes            AlertTriangle   /admin/disputes

── AI & Intelligence ───────────
   AI Review           Bot             /admin/ai-review
   AI Console          Sparkles        /admin/ai-console

── Finance ─────────────────────
   Finance Overview    DollarSign      /admin/finance
   Finance Ops         Briefcase       /admin/finance/ops
   Payouts             Banknote        /admin/finance/payouts
   Refunds             RotateCcw       /admin/finance/refunds

── System ──────────────────────
   System Health       Activity        /admin/system-health
   Data Health         Database        /admin/data-health
   Jobs                Briefcase       /admin/jobs
   Seed Data           TestTube        /admin/seed-data
   Mysuru Demo         TestTube        /admin/mysuru-demo
```

**Changes from current:**
- 22 flat items reorganized into 6 labeled groups.
- "Agents" icon changed from `Sparkles` (same as AI Console) to `UserCog`.
- "Pending Updates" icon changed from `ClipboardList` (same as Orders) to `Clock`.
- Groups should be collapsible in the sidebar; default all expanded.
- Seed Data and Mysuru Demo should be hidden in production (DEV_TOOLS_ENABLED only).

---

## 3. Implementation Pattern

### Grouped Sidebar Data Structure

Replace the current flat array with a grouped structure:

```tsx
interface NavGroup {
  label?: string;         // omit for ungrouped items (Profile, Sign Out)
  items: NavItem[];
  collapsible?: boolean;  // default false; true for Admin groups
  defaultOpen?: boolean;  // default true
}

interface NavItem {
  icon: LucideIcon;
  label: string;          // always t('nav.xxx')
  href: string;           // always ROUTES.XXX.YYY
  badge?: number;
  devOnly?: boolean;      // hide in production
}
```

### Active State Detection

Current: exact match `location.pathname === item.href`.

Improved: prefix match for parent items:
```tsx
const isActive = location.pathname === item.href
  || location.pathname.startsWith(item.href + '/');
```
This ensures `/farmer/crops/abc123` highlights "Crops" in the sidebar.

---

## 4. Icon Guidelines

### Assignment Rules
- Each icon appears at most once per role sidebar.
- Use the icon that most closely represents the concept (e.g. `Truck` for transport, `Users` for people).
- Do NOT use decorative icons (`Sparkles`) for functional items unless the item is AI-related.

### Size and Style
- All nav icons: `h-5 w-5` (20px).
- Color inherits from the link text (active vs inactive states).
- No filled/solid variants; all outline (Lucide default).

### Icon Inventory (Deduplicated)

| Icon | Used By |
|------|---------|
| CalendarDays | Farmer: My Day, Agent: Today |
| LayoutDashboard | All: Dashboard |
| Sprout | Farmer: Crops, Admin: All Crops |
| LandPlot | Farmer: Farmlands |
| Truck | Farmer/Agent/Admin: Transport, Logistics: Active Trips, Admin: Transporters |
| ShoppingBag | Farmer: Listings, Buyer: Browse, Admin: Buyers |
| Package | Farmer: Orders, Logistics: Available Loads, Admin: Transport |
| DollarSign | Farmer: Earnings, Admin: Finance |
| Bell | Farmer: Notifications |
| Settings | All: Settings/Profile |
| ClipboardList | Agent: My Tasks, Admin: Orders |
| Users | Agent/Admin: Farmers |
| UserCog | Admin: Agents (changed) |
| UserSearch | Agent: All Farmers (changed) |
| MapPin | Agent/Logistics: Service Area |
| Inbox | Admin: Ops Inbox |
| Ticket | Admin: Tickets |
| Bot | Admin: AI Review |
| Sparkles | Admin: AI Console |
| Briefcase | Admin: Jobs, Finance Ops |
| Banknote | Admin: Payouts |
| RotateCcw | Admin: Refunds |
| AlertTriangle | Admin: Disputes |
| Activity | Admin: System Health |
| Database | Admin: Data Health |
| TestTube | Admin: Seed Data, Mysuru Demo |
| CheckCircle | Logistics: Completed (changed) |
| CarFront | Logistics: My Vehicles (changed) |
| Clock | Admin: Pending Updates (changed) |

---

## 5. Naming Conventions

### Navigation Labels
- Use short, action-oriented labels (2-3 words max).
- Prefer "My X" for personal items (My Day, My Tasks, My Farmers, My Vehicles, My Orders).
- Use bare nouns for admin management pages (Farmers, Agents, Orders).
- All labels go through `t('nav.xxx')`.

### i18n Key Pattern
```
nav.dashboard       → "Dashboard"
nav.myDay           → "My Day"
nav.allFarmers      → "All Farmers"
nav.systemHealth    → "System Health"
```

Group labels (Admin):
```
nav.group.overview     → "Overview"
nav.group.network      → "Network"
nav.group.operations   → "Operations"
nav.group.ai           → "AI & Intelligence"
nav.group.finance      → "Finance"
nav.group.system       → "System"
```
