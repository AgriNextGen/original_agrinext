# Authentication Setup Guide

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

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → [SMTP Settings](https://supabase.com/dashboard/project/_/auth/smtp)
2. Enable **Custom SMTP** and enter your provider's credentials (host, port, user, password)
3. Optionally adjust rate limits under **Authentication** → **Rate Limits**

### Providers suitable for India

| Provider | Notes |
|----------|-------|
| **ZeptoMail** (Zoho) | India-focused, DLT-compliant, good deliverability |
| **Resend** | Simple setup, good for transactional email |
| **AWS SES** | Scalable, pay-per-use |

### Disable email confirmation (recommended for phone-only)

Since most users sign up with phone only (synthetic email), **disable email confirmation** so users get a session immediately without checking email:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Providers**
2. Click **Email**
3. Turn off **Confirm email**
4. Save

Direct link: [Auth Providers](https://supabase.com/dashboard/project/rmtkkzfzdmpjlqexrbme/auth/providers)

This reduces rate limit hits and improves UX for phone-only signups. The signup endpoint can still count toward the limit; custom SMTP is the main fix for production volume.

---

## Google OAuth

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://localhost:8080` (development; add 8081, 8082, etc. if dev server uses alternate ports)
   - `https://yourdomain.com` (production)
7. Add **Authorized redirect URIs**:
   - `https://rmtkkzfzdmpjlqexrbme.supabase.co/auth/v1/callback`
8. Copy **Client ID** and **Client Secret**

### 2. Supabase Dashboard

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google
3. Paste Client ID and Client Secret
4. Save

### 3. Site URL and Redirect URLs

In **Authentication** → **URL Configuration**:
- **Site URL**: Your app URL (e.g. `https://yourdomain.com`)
- **Redirect URLs**: Add:
  - Your production URL (e.g. `https://yourdomain.com`)
  - `http://localhost:8080/**` (covers 8080 and subpaths)
  - For dev servers that may use alternate ports (8081–8090), add `http://localhost:8081`, `http://localhost:8082`, etc., or use `http://localhost:*/**` if your Supabase project supports wildcards

---

## Testing

- **Phone + Password**: Select role, enter phone (e.g. 9876543210), enter password, click Sign In
- **Google**: Click "Continue with Google" on Signup (optional). After OAuth, you are redirected to your dashboard

---

## Deprecated: Phone OTP (MSG91)

Phone OTP (SMS-based) is no longer used. The app uses **phone + password** instead. The `send-sms` Edge Function and MSG91 integration can be removed if not needed for other features.
