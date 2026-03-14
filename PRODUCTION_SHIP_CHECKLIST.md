# AgriNext Gen — Production Ship Checklist

Use this checklist before every production deployment.

---

## Pre-Deploy

### Supabase Project

- [ ] Production Supabase project created and accessible
- [ ] All migrations applied (`supabase db push` or via Supabase Dashboard)
- [ ] RLS enabled on every `public` schema table — no exceptions
- [ ] Auth redirect URLs include the production frontend URL (Dashboard → Auth → URL Configuration)
- [ ] CORS allowlist in Edge Function `_shared/cors.ts` includes the production origin
- [ ] Supabase Auth settings: phone auth enabled, email confirmations disabled (phone-first flow)

### Edge Functions

Deploy all functions the app depends on:

```
supabase functions deploy signup-by-phone
supabase functions deploy login-by-phone
supabase functions deploy complete-role-onboard
supabase functions deploy storage-sign-upload-v1
supabase functions deploy storage-sign-read-v1
supabase functions deploy storage-confirm-upload-v1
supabase functions deploy storage-delete-v1
supabase functions deploy get-weather
supabase functions deploy ai-gateway
supabase functions deploy tts-elevenlabs
supabase functions deploy create-payment-order
supabase functions deploy payment-webhook
supabase functions deploy job-worker
supabase functions deploy finance-cron
supabase functions deploy finance-reconcile
supabase functions deploy finance-admin-api
supabase functions deploy admin-enqueue
supabase functions deploy admin-jobs-summary
supabase functions deploy admin-finance-summary
supabase functions deploy logistics-orchestrator
```

**Do NOT deploy `dev-*` functions to production** (`dev-switch-role`, `dev-get-active-role`, `dev-create-acting-session`, `dev-revoke-acting-session`).

### Edge Function Secrets (Supabase Dashboard → Settings → Edge Functions)

- [ ] `GEMINI_API_KEY` — Google Gemini (for `ai-gateway`)
- [ ] `ELEVENLABS_API_KEY` — ElevenLabs TTS (for `tts-elevenlabs`)
- [ ] `RAZORPAY_KEY_ID` — Razorpay (for `create-payment-order`)
- [ ] `RAZORPAY_KEY_SECRET` — Razorpay
- [ ] `RAZORPAY_WEBHOOK_SECRET` — Razorpay webhook validation
- [ ] `WORKER_SECRET` — for `job-worker` and `payment-webhook` auth
- [ ] `DEV_TOOLS_ENABLED` — set to `false` or leave unset for production
- [ ] `DEV_TOOLS_SECRET` — leave unset for production

### Environment Variables (Frontend Host)

Set these in your deployment platform (Vercel, Netlify, etc.):

| Variable | Required | Notes |
|----------|----------|-------|
| `VITE_SUPABASE_URL` | Yes | Production Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key (same as `VITE_SUPABASE_ANON_KEY`) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Same value as publishable key; both must be set |
| `VITE_DEV_TOOLS_ENABLED` | — | Must be `false` or unset for production |
| `VITE_ENABLE_PRICE_FORECASTS` | — | `true` to enable market price forecasts |
| `VITE_GOOGLE_MAPS_API_KEY` | — | Optional; maps degrade gracefully without it |

The app will refuse to start if `VITE_SUPABASE_URL` and at least one of the key variables is missing.

### Build Verification

- [ ] `npm run build` completes with no errors
- [ ] No `.env` file committed to the repository
- [ ] `dist/` output contains `index.html` and JS/CSS chunks
- [ ] Build size is reasonable (no unexpected large bundles)

---

## Deploy

### Frontend

- [ ] Deploy the `dist/` folder to your hosting platform
- [ ] Verify environment variables are set in the platform dashboard
- [ ] Confirm the production URL resolves and loads the app

### Edge Functions

- [ ] All production functions deployed (see list above)
- [ ] All secrets set in Supabase Dashboard
- [ ] `payment-webhook` URL registered with Razorpay (if payments are live)

---

## Post-Deploy Smoke Tests

### Auth Flow

- [ ] Open production URL — landing page loads, no console errors
- [ ] Sign up with a new phone number — registration completes
- [ ] Log in with the new account — redirects to correct role dashboard
- [ ] Log out — returns to landing page
- [ ] Log back in — language preference persists

### Role Dashboards

Test each role that has user accounts:

- [ ] **Farmer:** Dashboard loads; crop list visible; can navigate to crop diary
- [ ] **Agent:** Dashboard loads; assigned farmers list visible; can view tasks
- [ ] **Logistics:** Dashboard loads; available loads visible; can view trips
- [ ] **Buyer:** Dashboard loads; marketplace listings visible; can browse
- [ ] **Admin:** Dashboard loads; system health visible; can view users

### Critical Features

- [ ] Language toggle works (English ↔ Kannada) on every dashboard
- [ ] Language persists after page refresh
- [ ] Protected routes redirect unauthenticated users to `/login`
- [ ] Role mismatch redirects to correct dashboard (e.g. farmer accessing `/agent/*`)
- [ ] No `/dev-console` access in production (should be hidden/disabled)

### Error Handling

- [ ] No blank white pages on any dashboard (null-access crashes)
- [ ] No unhandled console errors during normal navigation
- [ ] Network errors show user-friendly messages (not raw errors)

---

## Rollback Plan

If critical issues are found after deploy:

1. **Frontend:** Redeploy the previous `dist/` build from your hosting platform
2. **Edge Functions:** Redeploy the previous function version via `supabase functions deploy --legacy-bundle`
3. **Database:** Never run destructive migrations; if a migration caused issues, deploy a corrective migration (additive only)

---

## Notes

- This checklist applies to both **staging** and **production** deploys — use staging Supabase URL/keys for staging
- Keep this document updated as new Edge Functions or env vars are added
- For the full deployment SOP, see `docs/all_imp_rules/DEPLOYMENT_SOP.md`
