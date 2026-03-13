# AgriNext Gen — AI Development Guide

> **Read this first.** This file is the authoritative context for every Claude Code / Cursor session.
> Canonical enterprise rules live in `docs/all_imp_rules/` — this file summarises them for fast AI onboarding.

---

## 1. What This App Is

AgriNext Gen is a **multi-role agricultural supply-chain platform** for Karnataka (India), connecting:

| Role | Key Responsibility | Route Prefix |
|------|--------------------|--------------|
| `farmer` | Crop records, listings, transport requests | `/farmer/*` |
| `agent` | Field verification, task management, farmer assignments | `/agent/*` |
| `logistics` | Accept loads, execute trips with proof | `/logistics/*` |
| `buyer` | Browse listings, place market orders | `/marketplace/*` |
| `admin` | Monitoring, data health, ops governance | `/admin/*` |

Region: Karnataka, India. Primary language: Kannada + English (bilingual). Phone-first UX (PWA, low-bandwidth).

---

## 2. Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui |
| State | TanStack Query v5 (React Query) + Dexie IndexedDB (offline) |
| Backend | Supabase (Postgres 17, Auth, Edge Functions, Storage) |
| Edge Functions | Deno runtime, jsr imports |
| Routing | React Router v6 |
| Forms | react-hook-form + zod |
| i18n | Custom hook (`useLanguage`) + `src/i18n/en.ts` / `src/i18n/kn.ts` |
| Charts | Recharts |
| Maps | Google Maps JS API Loader |
| Payments | Razorpay |
| AI | Google Gemini (via `supabase/functions/ai-gateway`) + ElevenLabs TTS |

---

## 3. Auth System (Phone-First — CRITICAL)

### How it works

- Users sign up via **phone + password** (NOT email). Email is **never real**.
- Synthetic email format: `91XXXXXXXXXX@agrinext.local` (derived from phone number).
- Auth is handled entirely by Edge Functions `signup-by-phone` and `login-by-phone`.
- JWT is issued by Supabase Auth after Edge Function validates credentials.
- **Never use `supabase.auth.signUp()` with email on the frontend** — all auth goes through Edge Functions.

### Auth context (`src/hooks/useAuth.tsx`)

```ts
const { user, session, userRole, realRole, activeRole, isDevOverride } = useAuth();
```

- `userRole` — legacy field used across the app; equals `activeRole` when override is active
- `realRole` — canonical role from `profiles` / `user_roles` table (never overridden)
- `activeRole` — what the app treats as the current role (may differ in dev)
- `isDevOverride` — true when a dev acting session is active

### Dev Role Switching (never in production)

- Edge functions `dev-switch-role` / `dev-get-active-role` allow switching roles without new accounts.
- Requires `VITE_DEV_TOOLS_ENABLED=true` + `x-dev-secret` header.
- Sessions expire in 8 hours. Stored in `dev_acting_sessions` table.

---

## 4. Database Architecture (Multi-Schema)

### Schema Groups

| Schema | Purpose | Who Accesses |
|--------|---------|--------------|
| `public` | All operational app data | Frontend via anon key + RLS |
| `secure` | Tier-4 regulated data (KYC, financials, payments) | Edge Functions only (service_role) |
| `analytics` | Aggregated reporting, BI | Admin Edge Functions + read replicas |

### ABSOLUTE RULES — Never Break These

1. **Never expose `service_role` key to frontend** — only Edge Functions use it.
2. **All tables must have RLS enabled** — no exceptions.
3. **All state transitions must go through RPC or Edge Functions** — never raw `.update()` for state fields.
4. **Tier-4 data stays in `secure` schema** — KYC docs, payment details, settlement data.
5. **All sensitive actions must write audit logs** — append-only, never delete.
6. **No destructive migrations** — always `ALTER`, never `DROP` on production data columns.

### Key Tables in `public` Schema

```
profiles               -- user display info, language preference
user_roles             -- role assignment per user
agent_farmer_assignments -- which agent covers which farmers
farmlands              -- farmer land parcels
crops                  -- crop records (linked to farmland)
crop_activity_logs     -- append-only crop event log
listings               -- produce listings for marketplace
transport_requests     -- farmer requests for transport
trips                  -- logistics trip execution
trip_location_events   -- GPS events during trip (partitioned)
transport_status_events -- state machine events for transport
vehicles               -- transporter vehicle registry
market_orders          -- buyer purchase orders
notifications          -- in-app notifications
rate_limits            -- API abuse prevention
```

### Standard Column Pattern
Every table must have:
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

---

## 5. RLS Rules (Summary)

- Farmers see only their own `farmlands`, `crops`, `listings`, `transport_requests`
- Agents see only their assigned farmers (via `agent_farmer_assignments`)
- Logistics see only trips assigned to their user/vehicle
- Buyers see only approved listings and their own `market_orders`
- Admin has read access to everything but all write actions must be audited
- **Use RLS helper functions** like `auth.uid()` and `get_current_profile_id()` — do not embed user IDs in queries

Full RLS matrix: `docs/all_imp_rules/ENTERPRISE_RLS_POLICY_MATRIX.md`

---

## 6. Edge Functions (20 Deployed)

Runtime: Deno. Imports: `jsr:` prefix. All in `supabase/functions/`.

Shared utilities available at `supabase/functions/_shared/`:

| Utility | What it does |
|---------|-------------|
| `cors.ts` | Standard CORS headers |
| `errors.ts` | Typed error classes, standard error response format |
| `env.ts` | Safe environment variable loading |
| `request_context.ts` | JWT parsing, user ID extraction |
| `gemini_client.ts` | Google Gemini API client |
| `ai_context.ts` | Builds structured context for AI prompts |
| `ai_prompts.ts` | Prompt templates (farmer, agent, logistics) |
| `ai_lang.ts` | Language-aware AI response formatting |
| `ai_response.ts` | Standardised AI response formatter |

**Always check `_shared/` before writing new utilities in a function.**

### Function Catalog

| Function | Auth | Purpose |
|----------|------|---------|
| `signup-by-phone` | No JWT | User registration (phone + password) |
| `login-by-phone` | No JWT | Phone auth with rate limiting + lockout |
| `storage-sign-upload-v1` | JWT | Generate signed URL for private storage upload |
| `storage-sign-read-v1` | JWT | Generate signed URL for private storage read |
| `get-weather` | JWT | Weather data for farmer location |
| `tts-elevenlabs` | JWT | Text-to-speech via ElevenLabs |
| `ai-gateway` | JWT | Routes AI requests to Gemini; rate-limited |
| `create-payment-order` | JWT | Create Razorpay payment order |
| `payment-webhook` | No JWT (HMAC sig) | Razorpay payment event webhook |
| `job-worker` | No JWT (secret header) | Background async job processor |
| `finance-cron` | No JWT (cron) | Scheduled finance tasks |
| `finance-reconcile` | No JWT (custom auth) | Payment reconciliation |
| `finance-admin-api` | No JWT (custom auth) | Finance admin operations |
| `admin-enqueue` | JWT | Admin enqueues background jobs |
| `admin-jobs-summary` | JWT | Admin job statistics |
| `admin-finance-summary` | JWT | Admin financial summary |
| `dev-switch-role` | JWT | DEV ONLY: Switch acting role |
| `dev-get-active-role` | JWT | DEV ONLY: Query active role |
| `dev-create-acting-session` | JWT | DEV ONLY: Create acting session |
| `dev-revoke-acting-session` | JWT | DEV ONLY: Revoke acting session |

### Edge Function Standard Response Format
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "HUMAN_READABLE", "code": "ERROR_CODE" }
```
Full standard: `docs/all_imp_rules/ENTERPRISE_EDGE_FUNCTION_STANDARD.md`

---

## 7. Frontend File Map

```
src/
├── App.tsx                          # Router: 100+ routes, all role sections
├── main.tsx                         # React DOM entry
├── index.css                        # Global Tailwind styles
│
├── hooks/
│   ├── useAuth.tsx                  # Auth context (CRITICAL - read before auth changes)
│   ├── useLanguage.tsx              # i18n context
│   ├── useCropDiary.tsx             # Crop diary data + mutations
│   ├── useSoilReports.tsx           # Soil reports
│   ├── useFarmerEarnings.tsx        # Earnings
│   ├── useMarketData.tsx            # Market prices
│   ├── useTrips.tsx                 # Logistics trips
│   ├── useRealtimeSubscriptions.tsx # Supabase realtime channels
│   └── use{Role}Dashboard.tsx       # Per-role dashboard data hooks
│
├── pages/
│   ├── farmer/                      # 11 farmer pages
│   ├── agent/                       # 8 agent pages
│   ├── logistics/                   # 7 logistics pages
│   ├── marketplace/                 # 5 buyer pages
│   ├── admin/                       # 21 admin pages
│   ├── Auth/                        # Login, Signup, OAuthCallback
│   ├── Onboard/                     # Role selection
│   ├── common/                      # PendingSync, UploadsManager
│   └── trace/                       # ListingTrace (public, no auth)
│
├── components/
│   ├── ui/                          # shadcn/ui primitives (auto-generated, don't edit)
│   ├── farmer/                      # Farmer-specific components
│   ├── agent/                       # Agent-specific components
│   ├── logistics/                   # Logistics components
│   ├── admin/                       # Admin components
│   ├── crop-diary/                  # Crop diary feature components
│   ├── geo/                         # GeoDistrictSelect, GeoMarketSelect, GeoStateSelect
│   ├── listings/                    # Listing/traceability components
│   ├── layout/                      # PageShell
│   ├── shared/                      # EmptyState, PageHeader
│   ├── dev/                         # DevConsole (guarded by VITE_DEV_TOOLS_ENABLED)
│   └── marketing/                   # HeroSection, FeaturesSection, CTASection, etc.
│
├── lib/
│   ├── utils.ts                     # cn() Tailwind merge helper
│   ├── auth.ts                      # Auth utility functions
│   ├── readApi.ts                   # Supabase RPC query wrappers
│   ├── routes.ts                    # Type-safe route constants (ROUTES.FARMER.DASHBOARD)
│   ├── constants.ts                 # App-wide constants (roles, keys, config)
│   ├── storage-upload.ts            # Supabase Storage upload helpers
│   └── offlineQueue.ts              # Offline action queue
│
├── types/
│   ├── domain.ts                    # App enum types (roles, statuses)
│   └── api.ts                       # RPC response shapes
│
├── i18n/
│   ├── en.ts                        # English translations (source of truth)
│   ├── kn.ts                        # Kannada translations
│   ├── index.ts                     # Translation engine (with Kannada encoding repair)
│   └── aliases.ts                   # Translation key aliases
│
├── offline/
│   ├── idb.ts                       # Dexie IndexedDB schema
│   ├── queryPersister.ts            # React Query cache → IndexedDB
│   ├── actionQueue.ts               # Queued mutations for offline
│   ├── uploadQueue.ts               # Upload queue for offline
│   └── network.ts                   # Network status detection
│
├── layouts/
│   └── DashboardLayout.tsx          # Mobile-responsive dashboard shell
│
└── integrations/
    ├── supabase/
    │   ├── client.ts                # Supabase client (anon key only)
    │   └── types.ts                 # AUTO-GENERATED from DB schema (do not edit)
    └── googleMaps/
        └── loader.ts                # Google Maps API loader
```

---

## 8. i18n Pattern

**Always add keys to BOTH files simultaneously.** Never add to one without the other.

```ts
// In a component:
const { t } = useLanguage();
return <span>{t('farmer.dashboard.title')}</span>;

// In src/i18n/en.ts:
farmer: { dashboard: { title: 'My Dashboard' } }

// In src/i18n/kn.ts:
farmer: { dashboard: { title: 'ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' } }
```

The translation engine auto-detects mojibake (corrupted Kannada) and attempts UTF-8 recovery. Dev warnings fire for missing keys.

---

## 9. React Query Pattern

- All data fetching uses `useQuery` / `useMutation` from TanStack Query.
- Query keys follow the pattern: `['entity', 'action', ...params]`
- Offline: React Query cache is persisted to IndexedDB via `src/offline/queryPersister.ts`
- **Never use `useEffect` + `fetch` for data — always use React Query.**

```ts
const { data, isLoading } = useQuery({
  queryKey: ['crops', farmerId],
  queryFn: () => supabase.from('crops').select('*').eq('farmer_id', farmerId),
});
```

---

## 10. Migration Rules

### Naming Convention
```
YYYYMMDDHHmm_descriptive_name.sql
Example: 202603071003_p1b_fix_crop_diary_null_defaults.sql
```

### Severity Prefixes
- `p0_` = Critical security/crash fix
- `p1a_` / `p1b_` = High priority bug fix
- `phase_` / `stage_` = Feature phase migration

### Rules
1. **Never DROP** a production column — use `ALTER COLUMN ... SET DEFAULT` + backfill NULLs instead.
2. **Always backfill NULLs** before adding a NOT NULL constraint.
3. **Add DEFAULT before NOT NULL** — two separate steps.
4. **One migration per logical change** — don't bundle unrelated changes.
5. **Test with `supabase db reset`** locally before pushing.

### Nullable Column Pattern (critical pitfall)
```sql
-- Step 1: backfill existing NULLs
UPDATE crops SET health_status = 'normal' WHERE health_status IS NULL;
UPDATE crops SET growth_stage = 'seedling' WHERE growth_stage IS NULL;

-- Step 2: set DEFAULT (so new rows never get NULL)
ALTER TABLE crops ALTER COLUMN health_status SET DEFAULT 'normal';
ALTER TABLE crops ALTER COLUMN growth_stage SET DEFAULT 'seedling';

-- Step 3 (optional): add NOT NULL if needed
ALTER TABLE crops ALTER COLUMN health_status SET NOT NULL;
```

---

## 11. Known Pitfalls (CRITICAL — Read Before Touching These Areas)

### Pitfall 1: `strictNullChecks` is OFF
`tsconfig.app.json` has `"strictNullChecks": false`. This means TypeScript will **not** warn you about null/undefined access. You must manually null-check anything from the DB.

```ts
// BAD — will crash at runtime if healthStatus is null
const icon = healthStatusConfig[crop.health_status].icon;

// GOOD
const icon = healthStatusConfig[crop.health_status ?? 'normal'].icon;
```

### Pitfall 2: `crops.health_status` and `crops.growth_stage` are nullable
These columns were added without defaults. Old rows may have NULL. Always use `?? 'fallback'`.
- `health_status ?? 'normal'`
- `growth_stage ?? 'seedling'`
Fixed in migration `202603071003_p1b_fix_crop_diary_null_defaults.sql` but still apply defensively.

### Pitfall 3: Auth uses phone, not email
`supabase.auth.signUp({ email })` should **never** be called from the frontend for real auth. Use `login-by-phone` / `signup-by-phone` Edge Functions.

### Pitfall 4: `types.ts` is auto-generated (257KB)
`src/integrations/supabase/types.ts` is regenerated by `supabase gen types`. **Never edit it manually.** Run `supabase gen types typescript --local > src/integrations/supabase/types.ts` to regenerate.

### Pitfall 5: No ErrorBoundary on most pages
Most pages don't have React ErrorBoundary. A single null access in a component tree causes a blank page. Always null-check values from DB queries.

### Pitfall 6: Dual lock files
Both `package-lock.json` (npm) and `bun.lockb` (bun) exist. Use `npm` for all package operations — the CI/CD pipeline uses npm.

---

## 12. Component Conventions

- **One component per file.** File name = component name (PascalCase).
- **Hooks are in `src/hooks/`**, not inside component files.
- **Domain components** go in their role folder (`farmer/`, `agent/`, etc.).
- **Shared cross-role components** go in `src/components/shared/`.
- **Never edit `src/components/ui/`** — these are shadcn/ui auto-generated.
- **Always use `cn()` from `src/lib/utils.ts`** for conditional Tailwind classes.

### Adding a New Page
1. Create `src/pages/{role}/MyPage.tsx`
2. Add route in `src/App.tsx` inside the role's `<Routes>` section
3. Add route constant in `src/lib/routes.ts`
4. Add nav link in the role's sidebar/nav component
5. Add i18n keys to `src/i18n/en.ts` + `src/i18n/kn.ts`

### Adding a New Feature with DB Changes
1. Create migration: `supabase/migrations/YYYYMMDDHHmm_feature_name.sql`
2. Run `supabase db reset` locally to verify
3. Regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
4. Implement hook in `src/hooks/`
5. Implement UI component + page
6. Deploy: `supabase db push` then `supabase functions deploy {function}` if needed

---

## 13. Commit Message Convention

**Format:** `type(scope): short description`

| Type | When to use |
|------|------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `migration` | DB migration |
| `chore` | Config, tooling, cleanup |
| `docs` | Documentation only |
| `refactor` | Code restructure (no behavior change) |
| `test` | Test files |
| `security` | Security fix |

**Examples:**
```
feat(farmer): add crop diary photo gallery
fix(crop-diary): null healthStatus crash on blank health_status column
migration: p1b fix crop diary null defaults
security(rls): enable RLS on 18 missing tables
chore: remove deprecated backend/ directory
```

**Do NOT use:** "new imp", "new update", "bug fix", "fix", "changes" — these are meaningless for git blame.

---

## 14. Environment Variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...          # anon key
VITE_SUPABASE_ANON_KEY=eyJ...                  # same as publishable
VITE_DEV_TOOLS_ENABLED=true                    # enables /dev-console + role switcher
VITE_ENABLE_PRICE_FORECASTS=true               # feature flag for market forecasts
VITE_GOOGLE_MAPS_API_KEY=...
```

Edge function secrets (set in Supabase Dashboard → Settings → Edge Functions):
- `GEMINI_API_KEY` — Google Gemini
- `ELEVENLABS_API_KEY` — TTS
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `DEV_TOOLS_ENABLED`, `DEV_TOOLS_SECRET`
- `WORKER_SECRET` — for job-worker and payment-webhook

---

## 15. Authoritative Reference Docs

All rules in `docs/all_imp_rules/` override anything else:

| Document | What it governs |
|----------|----------------|
| `PRODUCT_OVERVIEW.md` | Product domain, personas, workflows |
| `ENTERPRISE_DATA_ARCHITECTURE.md` | DB schema, schema groups, migration discipline |
| `ENTERPRISE_SECURITY_MODEL_V2_1.md` | Threat model, security controls |
| `ENTERPRISE_RLS_POLICY_MATRIX.md` | Exact RLS policy per table |
| `ENTERPRISE_EDGE_FUNCTION_STANDARD.md` | Edge function patterns, security, response format |
| `API_CONTRACTS.md` | Full API request/response contracts (462 lines) |
| `DEPLOYMENT_SOP.md` | Deployment procedures and environment separation |
| `RATE_LIMITING_AND_ABUSE_DETECTION.md` | Rate limiting implementation |
| `SECRETS_AND_ENV_STANDARD.md` | Secrets management |
| `EXTERNAL_API_ROUTING.md` | External API integration rules |

---

## 16. What NOT to Do (AI Safety Rules)

- Do NOT call Supabase from Edge Functions with the **anon key** — use service_role for server-side DB writes.
- Do NOT add `.select('*')` on tables with sensitive columns — be explicit.
- Do NOT skip RLS on new tables — `ALTER TABLE x ENABLE ROW LEVEL SECURITY` is mandatory.
- Do NOT use string literals for routes in new code — use `ROUTES` constants from `src/lib/routes.ts`.
- Do NOT modify `src/integrations/supabase/types.ts` manually — always regenerate.
- Do NOT commit to `main` directly — always use a feature branch.
- Do NOT add raw `console.log` with user data — use structured logging.
