# Developer Tools Guide

## Role Switcher (Dev Only)

Allows developers to test different roles without creating new accounts.

### How it works

- A `dev_role_overrides` table stores temporary role overrides (server-side).
- Two Edge Functions handle the override:
  - `dev-get-active-role` (GET) -- returns current override (if any) and the real role.
  - `dev-switch-role` (POST) -- upserts or clears the override (expires after 8 hours).
- The frontend reads/sets the override via these Edge Functions using the authenticated user's session token.

### Security

- The table has RLS enabled; only service-role operations (Edge Functions) can modify it.
- Edge Functions require `DEV_TOOLS_ENABLED="true"` environment variable; otherwise they return 404.
- Access is restricted to admin users or entries in `dev_allowlist` (server-side check).
- Optionally set `DEV_TOOLS_SECRET` and supply `x-dev-secret` header for non-browser callers.
- **Never enable `DEV_TOOLS_ENABLED` in production.**

### Enabling (staging/dev)

1. Apply migration: `supabase db push` (includes `dev_role_overrides` table creation)
2. Deploy Edge Functions and set secrets:
   - `DEV_TOOLS_ENABLED=true`
   - `DEV_TOOLS_SECRET=<optional-secret>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
3. On the frontend, set `VITE_DEV_TOOLS_ENABLED=true`
4. Ensure the caller user is admin or present in `dev_allowlist`

### Important notes

- The override does **not** change `user_roles.role` (the canonical source-of-truth) -- it only affects frontend routing/UX.
- The override is temporary and expires after 8 hours by default.

---

## Dev Console

The Dev Console is available at `/dev-console` when:
- `VITE_DEV_TOOLS_ENABLED=true` is set in the frontend environment
- The current user has the `admin` role

It provides access to role switching, system diagnostics, and debugging tools.
