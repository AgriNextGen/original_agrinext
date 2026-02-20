# EXTERNAL API ROUTING

Pattern:

- Frontend -> Supabase Edge Function -> External Provider

Guidelines:

- Frontend must never call external provider APIs directly. Use Supabase Edge Functions as the gateway for AI and other secret-backed integrations.
- Frontend authentication: always send JWT in `Authorization: Bearer <token>` and use Supabase publishable anon key where required.
- Edge Functions must validate input, check required secrets with `getRequiredEnv`, and return stable error shape `{ error: { code, message, request_id } }`.

AI Gateway:

- `supabase/functions/ai-gateway/index.ts` supports:
  - `/gemini/chat` -> uses `gemini_api_key`
  - `/firecrawl/fetch` -> uses `firecrawl_api_key`
  - `/elevenlabs/tts` -> uses `elevenlabs_api_key`

Testing examples and smoke tests are in the project README and in SECRETS_AND_ENV_STANDARD.md.

