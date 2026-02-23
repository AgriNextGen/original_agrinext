# Developer Mode: Role Switcher

Summary
- Adds a developer-only active role override stored server-side in `public.dev_role_overrides`.
- Frontend reads/sets the override via Supabase Edge Functions only. The override affects routing/UI only and expires automatically.

How it works
- A migration creates `public.dev_role_overrides` (supabase/migrations/*_dev_role_override.sql).
- Two Edge Functions are provided:
  - `dev-get-active-role` (GET) — returns current override (if any) and the real role.
  - `dev-switch-role` (POST) — upserts or clears the override (expires after 8 hours).
- The frontend calls these functions using the authenticated user's session token. The functions use the Supabase service role key server-side to read/write the overrides.

Security & safety
- The table has RLS enabled and policies that deny direct client access; only service-role operations (Edge Functions) can modify it.
- The Edge Functions require the environment variable `DEV_TOOLS_ENABLED="true"` to be set; otherwise they return 404.
- Access is additionally restricted to admin users or entries in `public.dev_allowlist` (server-side check in Edge Functions).
- Optionally set `DEV_TOOLS_SECRET` and supply `x-dev-secret` header for non-browser callers; client-side `VITE_DEV_TOOLS_SECRET` is deprecated and not treated as a security control.
- DO NOT enable `DEV_TOOLS_ENABLED` in production. Always set it only for staging or local environments.

Enabling (staging/dev)
1. Apply migration: use Supabase CLI to apply the new migration file.
2. Deploy Edge Functions and set secrets:
   - `DEV_TOOLS_ENABLED=true`
   - `DEV_TOOLS_SECRET=<optional-secret>`
   - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
3. On the frontend (Vite), set `VITE_DEV_TOOLS_ENABLED=true`. Optionally set `VITE_DEV_TOOLS_SECRET` to send from the browser (note: client-side secret is not secure).
4. Ensure the caller user is admin or present in `public.dev_allowlist`.

Notes
- The override does NOT change `public.user_roles.role` (the canonical source-of-truth) — it only affects frontend routing/UX.
- The override is temporary and expires after 8 hours by default.
