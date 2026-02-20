# SECRETS AND ENV STANDARD

Canonical server-side secret names (lowercase) for Edge Functions:

- `gemini_api_key`
- `perplexity_api_key` (optional)
- `firecrawl_api_key`
- `elevenlabs_api_key`
- `google_maps_api_key` (server-side usage only; the JS SDK uses `VITE_GOOGLE_MAPS_API_KEY` as a browser key)

Rules:
- Never put provider API keys in `VITE_` env vars except for browser-restricted keys (e.g. `VITE_GOOGLE_MAPS_API_KEY` for the JS Maps SDK).
- All Edge Functions must read secrets via `supabase/functions/_shared/env.ts::getRequiredEnv()` or `getOptionalEnv()` and never log secret values.
- If a required secret is missing, functions must fail with `{ error: { code: \"missing_secret\", message, request_id } }`.

Testing:
- Use the `env-check` Edge Function to verify presence of lowercase secrets (curl examples in EXTERNAL_API_ROUTING.md).

