# AgriNext Production Deployment Guide

## Overview

AgriNext uses **Supabase** for backend (auth, database, storage, Edge Functions). The frontend is a Vite React SPA that can be deployed to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Prerequisites

- Supabase project (already configured: `rmtkkzfzdmpjlqexrbme`)
- Node.js 18+
- Supabase CLI (for Edge Functions)

---

## 1. Environment Variables

Copy `.env.example` to `.env` and set:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://rmtkkzfzdmpjlqexrbme.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key from Supabase Dashboard → Settings → API |

Get keys from: **Supabase Dashboard** → **Settings** → **API**.

---

## 2. Edge Functions (Deployed)

The following Edge Functions are deployed and used by the app:

| Function | Purpose | JWT |
|----------|---------|-----|
| `send-sms` | MSG91 SMS for Phone OTP | No (webhook) |
| `accept-load` | Transporter accepts transport request | Yes |
| `update-trip-status` | Transporter updates trip status | Yes |
| `agent-update-task-status` | Agent updates task status | Yes |
| `agent-update-crop-status` | Agent updates crop status | Yes |

### Redeploy Edge Functions

```bash
cd supabase
supabase functions deploy send-sms --no-verify-jwt
supabase functions deploy accept-load
supabase functions deploy update-trip-status
supabase functions deploy agent-update-task-status
supabase functions deploy agent-update-crop-status
```

---

## 3. Production Build

```bash
npm install
npm run build
```

Output: `dist/` folder. Serve it with any static file server.

### Build Optimizations (vite.config.ts)

- **Chunking**: Vendor, Supabase, and React Query split for better caching
- **Target**: ES2020 for modern browsers
- **Minification**: Enabled

---

## 4. Deploy Frontend

### Vercel

```bash
npx vercel
# Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel env vars
```

### Netlify

```bash
npm run build
# Upload dist/ or connect repo; build command: npm run build; publish directory: dist
```

### Cloudflare Pages

```bash
npm run build
# Connect repo; build command: npm run build; output directory: dist
```

---

## 5. Post-Deploy Checklist

1. **Supabase Auth URLs**
   - **Site URL**: Your production URL (e.g. `https://agrinext.vercel.app`)
   - **Redirect URLs**: Add production URL and `http://localhost:8080`

2. **Google OAuth** (if used)
   - Add production domain to Authorized JavaScript origins and redirect URIs in Google Cloud Console

3. **Phone OTP** (if used)
   - Ensure `send-sms` secrets are set: `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `SEND_SMS_HOOK_SECRETS`

4. **Storage**
   - Buckets: `soil-reports`, `crop-media`, `traceability-media`, `voice_media`, `trip-proofs`
   - RLS policies are applied; no extra config needed if using anon key

---

## 6. Scalability Notes

- **Database**: Supabase Postgres scales with plan; use connection pooling for high concurrency
- **Edge Functions**: Auto-scale; cold starts ~200–500ms
- **Storage**: CDN-backed; suitable for media uploads
- **Auth**: Supabase handles session refresh and token management

---

## 7. Monitoring

- **Supabase Dashboard**: Logs, API usage, database metrics
- **Edge Functions**: Logs in Supabase Dashboard → Edge Functions → Logs
- **Frontend**: Add error tracking (e.g. Sentry) for production debugging
