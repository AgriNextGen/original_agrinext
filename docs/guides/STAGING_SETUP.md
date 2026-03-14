# Staging Dummy Users (All Roles)

Use these credentials to log in and test every role: farmer, agent, logistics, buyer, admin.

## Create dummy users (one-time)

The script `scripts/staging/provision-dummy-users.mjs` creates one auth user per role and upserts `profiles`, `user_roles`, and role-specific tables (`buyers`, `transporters`, `admin_users`).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Project URL (e.g. `https://xxx.supabase.co`). Fallback: `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key from Supabase Dashboard > Settings > API. **Never use in frontend.** |
| `ALLOW_NON_STAGING` | For local/dev | Set to `true` to run against a project not in the default allowed staging refs. |

### Run command

```sh
npm run staging:provision-dummy-users -- --demo-tag dummy_20260305_1200
```

Optional:

- Custom password: `--password 'YourPassword'`
- Custom output file: `--output artifacts/staging/demo-users-mine.json`
- Dry run (no DB changes): `--dry-run`

Example with custom password and non-staging project:

```sh
ALLOW_NON_STAGING=true npm run staging:provision-dummy-users -- --demo-tag dummy_20260305_1200 --password 'Dummy@12345'
```

After a successful run, credentials are written to `artifacts/staging/demo-users-<demo-tag>.json`.

## Login credentials (default password: Dummy@12345)

| Role     | Phone         | Full name        | Login role to select | Dashboard after login   |
|----------|---------------|------------------|----------------------|--------------------------|
| Farmer   | +919900000101 | Basavaraju Gowda | Farmer               | /farmer/dashboard       |
| Agent    | +919900000102 | Shwetha Kumar    | Agent                | /agent/dashboard        |
| Logistics| +919900000103 | Manjunath N      | Logistics            | /logistics/dashboard    |
| Buyer    | +919900000104 | Ayesha Fathima   | Buyer                | /marketplace/dashboard   |
| Admin    | +919900000105 | Raghavendra S    | Admin                | /admin/dashboard        |

**Default password for all:** `Dummy@12345` (unless you set `--password`).

## How to log in

1. Start the app: `npm run dev` and open the Login page.
2. Enter **phone**: e.g. `9900000101` or `+919900000101` (for farmer).
3. Enter **password**: `Dummy@12345` (or the one you used with `--password`).
4. Select the **role** (Farmer / Agent / Logistics / Buyer / Admin).
5. Click Sign in. You should be redirected to that role's dashboard.
6. Repeat with the other phones (102-105) and corresponding roles to test all five.

## Demo tag format

The `--demo-tag` value must match: `dummy_YYYYMMDD_HHMM` (e.g. `dummy_20260305_1200`).
