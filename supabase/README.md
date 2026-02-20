# Supabase MVP Scaffold

This folder contains:
- CLI config: `supabase/config.toml`
- SQL migrations aligned to MVP scope
- Seed data for roles
- Edge function stubs: `health`, `notify`

## Run locally

```bash
supabase start
supabase db reset
supabase functions serve --env-file ../.env
```

## Migrations included

1. `202602160001_init_extensions.sql`
2. `202602160002_roles_profiles.sql`
3. `202602160003_mvp_core_tables.sql`
4. `202602160004_mvp_logistics_market_tables.sql`
5. `202602160005_mvp_rls.sql`
