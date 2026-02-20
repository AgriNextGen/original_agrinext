# AgriNext Gen

Multi-role agri-platform for farmer operations, agent workflows, logistics, marketplace trading, and admin governance. Built on React + Supabase.

## Architecture

- **Frontend**: Vite, React 18, TypeScript, Tailwind, shadcn UI
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **State**: TanStack Query + local component state

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment details.

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local DB and migrations)

### Install and Run

```sh
# Clone and install
git clone <YOUR_GIT_URL>
cd original_agrinext
npm install

# Copy env template and set values
cp .env.example .env
# Edit .env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY

# Start dev server
npm run dev
```

App runs at `http://localhost:8080`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key from Supabase Dashboard → Settings → API |

## Role Matrix

| Role | Description | Key Routes |
|------|-------------|------------|
| `farmer` | Farm records, crops, listings, transport requests | `/farmer/*` |
| `agent` | Field tasks, farmer assignments, crop verification | `/agent/*` |
| `logistics` | Transport loads, trips, proof capture | `/logistics/*` |
| `buyer` | Marketplace, orders | `/marketplace/*` |
| `admin` | Monitoring, seed data, data health | `/admin/*` |

## Edge Function Catalog

| Function | Purpose | Auth |
|----------|---------|------|
| `accept-load` | Transporter accepts transport request | JWT |
| `update-trip-status` | Transporter updates trip status | JWT |
| `agent-create-task` | Agent creates task | JWT |
| `agent-update-task-status` | Agent updates task status | JWT |
| `agent-update-crop-status` | Agent updates crop status | JWT |
| `send-sms` | MSG91 SMS webhook for Phone OTP | Webhook (no JWT) |
| `notify` | Notification queue | JWT |
| `health` | Health check | Public |

## Migrations and Deploy

### Apply Migrations

```sh
# Link to your Supabase project (first time)
supabase link --project-ref <PROJECT_REF>

# Push migrations
supabase db push
```

### Deploy Edge Functions

```sh
supabase functions deploy accept-load
supabase functions deploy update-trip-status
supabase functions deploy agent-create-task
supabase functions deploy agent-update-task-status
supabase functions deploy agent-update-crop-status
supabase functions deploy send-sms --no-verify-jwt
supabase functions deploy notify
supabase functions deploy health --no-verify-jwt
```

### Production Build

```sh
npm run build
# Output: dist/
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Documentation

- [Auth Setup (Google, Phone OTP)](docs/AUTH_SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
