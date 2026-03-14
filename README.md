# AgriNext Gen

Multi-role agricultural supply-chain platform for Karnataka, India. Connects farmers, agents, logistics, buyers, and admins. Built on React + Supabase.

## Quick Start

```sh
git clone <YOUR_GIT_URL>
cd original_agrinext
npm install
cp .env.example .env   # Edit with your Supabase keys
npm run dev             # http://localhost:5173
```

## Environment Variables

See [`.env.example`](.env.example) for all variables. The minimum required:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key from Supabase Dashboard |

## Role Matrix

| Role | Key Routes | Description |
|------|------------|-------------|
| `farmer` | `/farmer/*` | Farm records, crops, listings, transport requests |
| `agent` | `/agent/*` | Field tasks, farmer assignments, crop verification |
| `logistics` | `/logistics/*` | Transport loads, trips, proof capture |
| `buyer` | `/marketplace/*` | Marketplace, orders |
| `admin` | `/admin/*` | Monitoring, data health, ops governance |

## Stack

- **Frontend**: Vite 5, React 18, TypeScript 5, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Postgres 17, Auth, Edge Functions, Storage)
- **State**: TanStack Query v5 + Dexie IndexedDB (offline)
- **i18n**: English + Kannada (bilingual)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Documentation

All documentation is indexed at **[docs/INDEX.md](docs/INDEX.md)**.

Key references:

- [Architecture & Features](docs/ARCHITECTURE.md) -- codebase structure and conventions
- [Auth Setup](docs/guides/AUTH_SETUP.md) -- phone login, SMTP, OAuth
- [Staging Setup](docs/guides/STAGING_SETUP.md) -- dummy users for testing
- [Deployment SOP](docs/all_imp_rules/DEPLOYMENT_SOP.md) -- production deployment
- [CLAUDE.md](CLAUDE.md) -- AI development context

## Troubleshooting (Windows)

### `npm.ps1 cannot be loaded` (PowerShell execution policy)

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### `Port 5173 is already in use`

`npm run dev` runs a preflight script that frees 5173 automatically. Manual recovery:

```powershell
netstat -ano | findstr LISTENING | findstr ":5173"
Stop-Process -Id <PID> -Force
```
