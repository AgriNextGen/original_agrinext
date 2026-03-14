# Header Architecture — Role-Aware Dashboard Header

> Rules for making DashboardHeader and DashboardSidebar role-aware.
> Eliminates the current problem where farmer-specific hooks run for all roles.

---

## 1. Current Problem

**File:** `src/components/dashboard/DashboardHeader.tsx`

Lines 31–32 unconditionally call:
```tsx
const { data: notifications } = useFarmerNotifications();
const { data: profile } = useFarmerProfile();
```

These hooks query `notifications` and `profiles` filtered by `user.id`, which happens to work for all roles because the queries are generic enough. But the semantics are wrong:
- The query key is `['farmer-notifications', user.id]` — misleading for agent/admin.
- `useFarmerProfile` may return farmer-specific fields that are irrelevant for other roles.
- Invalidation uses `queryKey: ['farmer-notifications', user.id]` — collides if role-specific notification logic is added later.

**File:** `src/components/dashboard/DashboardSidebar.tsx`

Line 48 unconditionally calls:
```tsx
const { data: notifications } = useFarmerNotifications();
```

The unread badge count is always farmer notifications, regardless of role.

---

## 2. Target Architecture

### Generic Hooks

Replace role-specific hooks with role-agnostic versions:

#### useNotifications (role-agnostic)

```tsx
// src/hooks/useNotifications.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}
```

**Key differences from useFarmerNotifications:**
- Query key is `['notifications', userId]` — not `['farmer-notifications', userId]`.
- No role prefix in the key; works for any role.
- Same underlying query (notifications table has no role column; user_id is sufficient).

#### useUserProfile (role-agnostic)

```tsx
// src/hooks/useUserProfile.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, preferred_language')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 300_000,
  });
}
```

**Key differences from useFarmerProfile:**
- Query key is `['user-profile', userId]`.
- Selects only the columns needed by the header (no role-specific fields).
- Usable by all roles.

---

## 3. DashboardHeader Refactor

### Before

```tsx
const { data: notifications } = useFarmerNotifications();
const { data: profile } = useFarmerProfile();
```

### After

```tsx
import { useNotifications } from '@/hooks/useNotifications';
import { useUserProfile } from '@/hooks/useUserProfile';

const { data: notifications } = useNotifications();
const { data: profile } = useUserProfile();
```

### Realtime Subscription

The current realtime channel in DashboardHeader (lines 48–70) subscribes to `notifications` table inserts for the user. The invalidation must also change:

**Before:** `queryClient.invalidateQueries({ queryKey: ['farmer-notifications', user.id] });`

**After:** `queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });`

### Role-Specific Navigation

The header already has role-specific path helpers (`getSettingsPath`, `getNotificationPath`). These should be consolidated:

```tsx
const ROLE_PATHS: Record<string, { settings: string; notifications: string }> = {
  farmer:    { settings: ROUTES.FARMER.SETTINGS,       notifications: ROUTES.FARMER.NOTIFICATIONS },
  agent:     { settings: ROUTES.AGENT.PROFILE,         notifications: ROUTES.AGENT.DASHBOARD },
  logistics: { settings: ROUTES.LOGISTICS.PROFILE,     notifications: ROUTES.LOGISTICS.DASHBOARD },
  buyer:     { settings: ROUTES.MARKETPLACE.PROFILE,   notifications: ROUTES.MARKETPLACE.DASHBOARD },
  admin:     { settings: ROUTES.ADMIN.DASHBOARD,       notifications: ROUTES.ADMIN.OPS_INBOX },
};

const paths = ROLE_PATHS[userRole ?? 'farmer'];
```

Use `paths.settings` and `paths.notifications` instead of separate `getSettingsPath()` / `getNotificationPath()` functions.

---

## 4. DashboardSidebar Refactor

### Notification Badge

**Before:** Line 48 calls `useFarmerNotifications()` unconditionally.

**After:** Use `useNotifications()` and only render the badge for roles that have a notifications page:

```tsx
const { data: notifications } = useNotifications();
const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0;
```

Only farmer has a dedicated `/farmer/notifications` page. For other roles, the badge can appear on the sidebar item closest to notifications (e.g. Agent: Today, Admin: Ops Inbox) or be omitted until a notifications page is added for that role.

---

## 5. Profile Dropdown — Role-Aware Content

The profile dropdown currently shows:
1. Full name (from profile)
2. Email (from auth user)
3. "Profile Settings" link
4. "Sign Out"

Improve with role context:

```tsx
<DropdownMenuLabel>
  <div className="flex flex-col space-y-1">
    <p className="text-sm font-medium">{profile?.full_name ?? t('common.user')}</p>
    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
  </div>
</DropdownMenuLabel>
```

Adding the role label (e.g. "Farmer", "Agent") helps users confirm which role they're acting as, especially when dev role switching is active.

---

## 6. Search Input

The header has a search input that is currently non-functional (no value, no onChange, no handler).

### Options

1. **Remove it** until search is implemented. This avoids user confusion.
2. **Wire it to a command palette** (e.g. cmdk) that searches pages, farmers, crops, etc.
3. **Make it role-scoped** (farmer: search crops/farmlands; admin: search entities).

**Recommended for this phase:** Remove the search input from the header. Add it back when a search backend or command palette is implemented. This is a UX honesty improvement — showing non-functional UI is worse than omitting it.

If the team wants to keep the search visible as a placeholder, add a `disabled` state with tooltip: "Search coming soon".

---

## 7. Header Composition Summary

```
┌──────────────────────────────────────────────────────┐
│  ☰ (mobile)  │  Page Title  │  Sync  │  🔔  │  👤  │
└──────────────────────────────────────────────────────┘
```

| Element | Source | Role-Aware |
|---------|--------|------------|
| Hamburger (☰) | DashboardLayout state | No |
| Page Title | DashboardLayout `title` prop | No |
| SyncIndicator | Offline queue | No |
| Notification bell + badge | `useNotifications()` | Yes (generic hook) |
| Notification dropdown | notifications data | Yes (role-specific "View All" path) |
| Profile avatar + dropdown | `useUserProfile()` | Yes (role-specific settings path) |

---

## 8. Migration Checklist

- [ ] Create `src/hooks/useNotifications.ts` with role-agnostic query key
- [ ] Create `src/hooks/useUserProfile.ts` with role-agnostic query key
- [ ] Update DashboardHeader imports to use new hooks
- [ ] Update DashboardSidebar imports to use new hooks
- [ ] Update realtime subscription invalidation to `['notifications', user.id]`
- [ ] Consolidate getSettingsPath/getNotificationPath into ROLE_PATHS map
- [ ] Add role label to profile dropdown
- [ ] Remove or disable non-functional search input
- [ ] Verify no other components import `useFarmerNotifications` or `useFarmerProfile` for header/sidebar purposes
