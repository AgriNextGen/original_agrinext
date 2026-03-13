# Authentication Setup Guide

> Canonical security rules: `docs/all_imp_rules/ENTERPRISE_SECURITY_MODEL_V2_1.md`

## Primary Auth: Role + Phone + Password

AgriNext uses **role**, **phone number**, and **password** for both signup and login. Email is optional at signup.

### Signup Flow

1. Select role (Farmer, Buyer, Agent, Logistics)
2. Enter name, phone, password (required)
3. Email is optional (used for account recovery)

### Login Flow

1. Select role (Farmer, Buyer, Agent, Logistics)
2. Enter phone number and password
3. Sign in redirects to the role-specific dashboard

### Deploy login-by-phone Edge Function

The login flow uses an Edge Function to authenticate by phone:

```bash
supabase functions deploy login-by-phone --no-verify-jwt
```

This function is required for login. It looks up users by phone, verifies role, and exchanges credentials for a session.

### Database

- `profiles.auth_email` stores the Supabase Auth identifier (user email or synthetic `{phone}@agrinext.local`)
- Apply migrations: `supabase db push` or run migrations in order

---

## Custom SMTP (Production)

Supabase's built-in SMTP is for testing only and enforces a strict **email rate limit** (~3 emails/hour) on signup, password recovery, and email change. This limit applies even when using synthetic emails (e.g. `919980092461@agrinext.local`), since the signup request counts against the quota regardless of whether an email is actually sent.

For production, configure **custom SMTP** to raise the limit to ~30+ emails/hour and improve deliverability.

### Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) > **Authentication** > [SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp)
2. Enable **Custom SMTP** and enter your provider's credentials (host, port, user, password)
3. Optionally adjust rate limits under **Authentication** > **Rate Limits**

### Providers suitable for India

| Provider | Notes |
|----------|-------|
| **ZeptoMail** (Zoho) | India-focused, DLT-compliant, good deliverability |
| **Resend** | Simple setup, good for transactional email |
| **AWS SES** | Scalable, pay-per-use |

### Disable email confirmation (recommended for phone-only)

Since most users sign up with phone only (synthetic email), **disable email confirmation** so users get a session immediately without checking email:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) > your project > **Authentication** > **Providers**
2. Click **Email**
3. Turn off **Confirm email**
4. Save

---

## Google OAuth

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://localhost:8080` (development)
   - `https://yourdomain.com` (production)
7. Add **Authorized redirect URIs**:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
8. Copy **Client ID** and **Client Secret**

### 2. Supabase Dashboard

1. Go to **Authentication** > **Providers** > **Google**
2. Enable Google
3. Paste Client ID and Client Secret
4. Save

### 3. Site URL and Redirect URLs

In **Authentication** > **URL Configuration**:
- **Site URL**: Your app URL (e.g. `https://yourdomain.com`)
- **Redirect URLs**: Add your production URL and `http://localhost:8080/**`

---

## Testing

- **Phone + Password**: Select role, enter phone (e.g. 9876543210), enter password, click Sign In
- **Google**: Click "Continue with Google" on Signup (optional). After OAuth, you are redirected to your dashboard

---

## Deprecated: Phone OTP (MSG91)

Phone OTP (SMS-based) is no longer used. The app uses **phone + password** instead.

---

## P0 Security Verification Checklist

Follow these steps after applying security migrations.

### 1. Apply migrations (in order)

| Order | File |
|-------|------|
| 1 | `supabase/migrations/202603070001_fix_login_attempt_limit.sql` |
| 2 | `supabase/migrations/202603070002_p0_enable_rls_18_tables.sql` |
| 3 | `supabase/migrations/202603070003_p0_fix_profiles_self_update.sql` |
| 4 | `supabase/migrations/202603070004_p0_fix_signup_role_guard.sql` |

```bash
npx supabase db push
```

### 2. Run auth diagnostic

Open `scripts/auth-and-security/run_auth_and_rls_steps.sql` in the Supabase SQL Editor:

1. Pre-flight RLS query -- note any `rowsecurity = false`
2. A1 Query 1 and 2 -- note locked accounts or missing roles
3. Run **A2** with UUIDs of locked accounts, then **A2 Verification** (expect 0 rows)
4. Run **A3** for role-less accounts, then **A3 Verification** (expect 0 rows)
5. Run **A4** (buyers insert)
6. After migration 2, run **B1 Verification** -- all 18 tables should show `rowsecurity = true`

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy payment-webhook
npx supabase functions deploy storage-sign-upload-v1
npx supabase functions deploy job-worker
npx supabase functions deploy finance-cron
npx supabase functions deploy finance-admin-api
npx supabase functions deploy finance-reconcile
```

### 4. Manual verification

- **A6:** Open `/onboard/role-select` incognito -- should redirect to `/login`
- **A7:** Log in with each test role; confirm dashboards load. Test rate limit: 5 wrong passwords = no lock; 10 wrong = lockout
- **B1:** As non-admin, try `INSERT INTO user_roles ... VALUES (auth.uid(), 'admin')` -- should fail
- **B2:** As normal user, try updating `kyc_status` -- should fail. Updating `full_name` -- should succeed
- **B3:** Sign up with `role: 'admin'` in metadata -- DB should show `user_roles.role = 'farmer'`

### Summary of security code changes

- **Migrations:** Login threshold 10 (A5), RLS on 18 tables (B1), profiles self-update trigger (B2), signup role guard farmer/buyer only (B3)
- **payment-webhook:** `.schema("secure").from("webhook_events")` and RPC schema fixes
- **finance-admin-api:** `.schema("admin").rpc(...)` for all admin RPCs
- **storage-sign-upload-v1:** `.rpc('consume_rate_limit')`, schema-qualified audit calls
- **job-worker:** All schema-dotted calls fixed
