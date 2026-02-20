# AgriNextGen MVP Backend (DEPRECATED)

> **Migration complete (2026-02-16):** The app now uses Supabase exclusively. This backend is no longer required. See [MIGRATION.md](../MIGRATION.md).

This package previously provided:
- A minimal Express gateway with MVP endpoint stubs.
- Contract definitions in `backend/contracts/openapi.mvp.yaml`.
- Uniform `501 NOT_IMPLEMENTED` responses for unfinished handlers.

## Local run

```bash
cd backend
npm install
npm run dev
```

Server URL: `http://localhost:4000`

## Scope

- Stable path + method contracts for MVP.
- No business logic yet.
- Next step is handler-by-handler implementation against Supabase tables.
