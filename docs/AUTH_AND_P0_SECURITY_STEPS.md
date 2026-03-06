# Auth debug + Phase 0 security — implementation steps

Follow these in order. Migrations and code changes are already in the repo.

---

## 1. Apply migrations (Supabase)

Apply these migrations **in order** in your Supabase project (Dashboard → SQL Editor, or `supabase db push` if linked):

| Order | File |
|-------|------|
| 1 | `supabase/migrations/202603070001_fix_login_attempt_limit.sql` |
| 2 | `supabase/migrations/202603070002_p0_enable_rls_18_tables.sql` |
| 3 | `supabase/migrations/202603070003_p0_fix_profiles_self_update.sql` |
| 4 | `supabase/migrations/202603070004_p0_fix_signup_role_guard.sql` |

**Via CLI (after `supabase link` and with DB access):**

```bash
npx supabase db push
```

**Via Dashboard:** Open each file, copy contents, run in SQL Editor.

---

## 2. Run auth diagnostic and fixes (SQL)

Open **`scripts/auth-and-security/run_auth_and_rls_steps.sql`** in the Supabase SQL Editor and run in order:

1. Pre-flight RLS query — note any `rowsecurity = false`.
2. A1 Query 1 and 2 — note account IDs and phones that are locked or missing roles.
3. Uncomment and run **A2** with the UUIDs of locked accounts from step 2.
4. Run **A2 Verification** — expect 0 rows.
5. For each account with 0 roles in A1 Query 2, run **A3** (once per account) with the correct phone and role.
6. Run **A3 Verification** — expect 0 rows.
7. Run **A4** (buyers insert) once — safe if no missing buyers.
8. After migration 2 is applied, run **B1 Verification** — all 18 tables should show `rowsecurity = true`.

---

## 3. Deploy Edge Functions

Deploy the updated functions (from project root):

```bash
npx supabase functions deploy payment-webhook
npx supabase functions deploy storage-sign-upload-v1
npx supabase functions deploy job-worker
npx supabase functions deploy finance-cron
npx supabase functions deploy finance-admin-api
npx supabase functions deploy finance-reconcile
```

---

## 4. Manual verification

- **A6:** Open `/onboard/role-select` in an incognito window → should redirect to `/login`.
- **A7:** Log in with each test role (farmer, agent, admin, logistics, buyer); confirm dashboards load. Test rate limit: 5 wrong passwords → no lock; 10 wrong → lockout.
- **B1:** As a non-admin user, try `INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');` → should fail with RLS error.
- **B2:** As a normal user, try `UPDATE profiles SET kyc_status = 'verified' WHERE id = auth.uid();` → should fail. `UPDATE profiles SET full_name = 'Test' WHERE id = auth.uid();` → should succeed.
- **B3:** Sign up with `role: 'admin'` in metadata → DB should show `user_roles.role = 'farmer'`.

---

## Summary of code changes already in repo

- **Migrations:** Login threshold 10 (A5), RLS on 18 tables (B1), profiles self-update trigger (B2), signup role guard farmer/buyer only (B3).
- **payment-webhook:** `.schema("secure").from("webhook_events")` and RPC schema fixes.
- **finance-admin-api:** `.schema("admin").rpc(...)` for all admin RPCs.
- **finance-cron:** `.rpc("enqueue_job_v1", ...)`.
- **storage-sign-upload-v1:** `.rpc('consume_rate_limit')`, `.schema('audit').rpc('log_security_event_v1')`, `.schema('audit').rpc('log_workflow_event_v1')`.
- **job-worker:** All schema-dotted calls fixed; `provider_refund_id: \`manual:${refundId}\``.
- **finance-reconcile:** `.rpc("enqueue_job_v1", ...)`.
