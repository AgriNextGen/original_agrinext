# Edge Functions Reference

> Runtime: Deno. All functions in `supabase/functions/{name}/index.ts`.
> Full standard: `/docs/all_imp_rules/ENTERPRISE_EDGE_FUNCTION_STANDARD.md`

---

## Shared Utilities (`_shared/`)

**Always check here before writing new utilities inside a function.**

| File | Exports | Purpose |
|------|---------|---------|
| `cors.ts` | `corsHeaders` | Standard CORS headers object — add to every response |
| `errors.ts` | `AppError`, `errorResponse()` | Typed errors; never return raw error messages |
| `env.ts` | `getEnv(key)` | Safe env var loading (throws if missing in prod) |
| `request_context.ts` | `getRequestContext(req)` | Parses JWT, extracts `userId`, `role` |
| `gemini_client.ts` | `GeminiClient` | Google Gemini API client (text + multimodal) |
| `ai_context.ts` | `buildAiContext()` | Builds structured context object for AI prompts |
| `ai_prompts.ts` | `PROMPTS.*` | Prompt templates per role (farmer, agent, logistics) |
| `ai_lang.ts` | `getAiLanguage()` | Detects user language preference for AI responses |
| `ai_response.ts` | `formatAiResponse()` | Standardises AI response format |

---

## Standard Response Format

All functions must return:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human readable message", "code": "ERROR_CODE" }
```

HTTP status codes: `200` success, `400` bad input, `401` unauthorized, `403` forbidden, `429` rate limited, `500` server error.

---

## Function Catalog

### Auth Functions (No JWT)

#### `signup-by-phone`
- **Auth:** `verify_jwt = false`
- **Purpose:** Register a new user with phone + password. Creates Supabase Auth user with synthetic email (`91XXXXXXXXXX@agrinext.local`).
- **Request:** `POST` `{ phone, password, full_name, role, profile_metadata? }`
- **Response:** `{ success, data: { user_id, role } }`
- **Guards:** Role-based signup lockdown, rate limiting, duplicate phone/email check
- **Notes:** Only entry point for user creation. Never use Supabase Auth email signup from frontend.

#### `login-by-phone`
- **Auth:** `verify_jwt = false`
- **Purpose:** Authenticate user with phone + password. Returns JWT session.
- **Request:** `POST` `{ phone, password }`
- **Response:** `{ success, data: { session, user } }`
- **Guards:** Login lockout (max attempts enforced), rate limiting, phone normalisation (+91 format)
- **Notes:** Tracks failed attempts in `login_attempts` table.

---

### User Action Functions (JWT Required)

#### `accept-load`
- **Auth:** `verify_jwt = true`
- **Purpose:** Transporter accepts an open transport request. Creates a trip.
- **Request:** `POST` `{ transport_request_id }`
- **Response:** `{ success, data: { trip_id } }`
- **Guards:** Role = logistics, request must be in REQUESTED state, idempotent

#### `update-trip-status`
- **Auth:** `verify_jwt = true`
- **Purpose:** Advance trip through state machine (ASSIGNED → EN_ROUTE → PICKED_UP → IN_TRANSIT → DELIVERED → CLOSED).
- **Request:** `POST` `{ trip_id, new_status, proof_media_url?, geo_lat?, geo_lng? }`
- **Response:** `{ success, data: { trip_id, status } }`
- **Guards:** Role = logistics, ownership check, proof required for PICKED_UP and DELIVERED

#### `agent-update-task-status`
- **Auth:** `verify_jwt = true`
- **Purpose:** Agent marks a task complete/in-progress/blocked.
- **Request:** `POST` `{ task_id, status, notes? }`
- **Response:** `{ success, data: { task_id } }`
- **Guards:** Role = agent, agent must be assigned to the farmer linked to this task

#### `agent-update-crop-status`
- **Auth:** `verify_jwt = true`
- **Purpose:** Agent updates crop status with evidence media.
- **Request:** `POST` `{ crop_id, new_status, evidence_url?, notes? }`
- **Response:** `{ success, data: { crop_id } }`
- **Guards:** Role = agent, agent must be assigned to the crop's farmer

#### `storage-sign-upload-v1`
- **Auth:** `verify_jwt = true`
- **Purpose:** Generate a signed URL for uploading to Supabase private Storage.
- **Request:** `POST` `{ bucket, path, content_type, file_size_bytes }`
- **Response:** `{ success, data: { signed_url, token, path } }`
- **Guards:** Bucket allowlist, file size limit, content type check

#### `get-weather`
- **Auth:** `verify_jwt = true`
- **Purpose:** Fetch weather data for a farmer's location.
- **Request:** `GET` `?lat=&lng=` or `?district=`
- **Response:** `{ success, data: { temp, humidity, forecast, ... } }`

#### `tts-elevenlabs`
- **Auth:** `verify_jwt = true`
- **Purpose:** Convert text to speech using ElevenLabs API (for Kannada/English voice UX).
- **Request:** `POST` `{ text, language, voice_id? }`
- **Response:** `{ success, data: { audio_url } }`

#### `ai-gateway`
- **Auth:** `verify_jwt = true`
- **Purpose:** Route AI requests to Google Gemini. Role-aware context injection.
- **Request:** `POST` `{ message, context_type?, language? }`
- **Response:** `{ success, data: { text, audio_url? } }`
- **Guards:** Rate limited (120 req/60s per user), role-scoped prompts
- **Notes:** Uses `_shared/gemini_client.ts` + `_shared/ai_prompts.ts` + `_shared/ai_context.ts`

#### `create-payment-order`
- **Auth:** `verify_jwt = true`
- **Purpose:** Create a Razorpay payment order for a marketplace transaction.
- **Request:** `POST` `{ order_id, amount_paise, currency? }`
- **Response:** `{ success, data: { razorpay_order_id, amount, currency, key_id } }`

---

### Webhook Functions (No JWT, Signature Verified)

#### `payment-webhook`
- **Auth:** `verify_jwt = false` + Razorpay HMAC-SHA256 signature
- **Purpose:** Handle Razorpay payment events (payment.captured, payment.failed, etc.).
- **Request:** Razorpay webhook body + `x-razorpay-signature` header
- **Response:** `{ success: true }`
- **Guards:** Signature verification (HMAC), idempotency key per event

---

### Background Job Functions

#### `job-worker`
- **Auth:** `verify_jwt = false` + `x-worker-secret` header
- **Purpose:** Process queued background jobs (email sends, notifications, reconciliation tasks).
- **Request:** `POST` (triggered by cron/webhook) `{ batch_size? }`
- **Response:** `{ success, data: { processed, failed } }`
- **Guards:** `x-worker-secret` must match `WORKER_SECRET` env var

---

### Finance Functions

#### `finance-cron`
- **Auth:** `verify_jwt = false` (cron-triggered)
- **Purpose:** Scheduled finance tasks (settlement calculations, reconciliation triggers).

#### `finance-reconcile`
- **Auth:** Custom auth (not JWT)
- **Purpose:** Reconcile payment records against Razorpay ledger.

#### `finance-admin-api`
- **Auth:** Custom auth (not JWT)
- **Purpose:** Finance admin operations (manual adjustments, refund triggers).

---

### Admin Functions (JWT Required, Admin Role)

#### `admin-enqueue`
- **Auth:** `verify_jwt = true`, role = admin
- **Purpose:** Enqueue a background job.
- **Request:** `POST` `{ job_type, payload, run_at?, idempotency_key?, priority?, max_attempts? }`
- **Response:** `{ success, data: { job_id } }`

#### `admin-jobs-summary`
- **Auth:** `verify_jwt = true`, role = admin
- **Purpose:** Get job queue statistics (pending, running, failed counts).
- **Request:** `GET`
- **Response:** `{ success, data: { pending, running, completed, failed, ... } }`

#### `admin-finance-summary`
- **Auth:** `verify_jwt = true`, role = admin
- **Purpose:** Get financial summary (total settlements, pending payouts, etc.).
- **Request:** `GET` `?from=&to=`
- **Response:** `{ success, data: { total_volume, pending_payouts, ... } }`

---

### Dev-Only Functions (Never call from production UI)

> These are disabled when `DEV_TOOLS_ENABLED != true`. Guarded by `x-dev-secret` header.

#### `dev-switch-role`
- **Auth:** `verify_jwt = true` + `x-dev-secret` header
- **Purpose:** Switch the acting role for testing without creating separate accounts.
- **Request:** `POST` `{ targetRole: "farmer" | "agent" | "logistics" | "buyer" | "admin" }`
- **Response:** `{ success, data: { activeRole, switchedAt } }`
- **Notes:** Creates/updates `dev_acting_sessions` with 8-hour expiry.

#### `dev-get-active-role`
- **Auth:** `verify_jwt = true` + `x-dev-secret` header
- **Purpose:** Query current active role (real or acting).
- **Request:** `GET`
- **Response:** `{ success, data: { role, isDevOverride } }`

#### `dev-create-acting-session`
- **Auth:** `verify_jwt = true` + `x-dev-secret` header
- **Purpose:** Create a dev acting session to impersonate another user/role.
- **Request:** `POST` `{ acting_as_role, expires_hours? }`
- **Response:** `{ success, data: { session_id, expires_at } }`

#### `dev-revoke-acting-session`
- **Auth:** `verify_jwt = true` + `x-dev-secret` header
- **Purpose:** Revoke the current dev acting session.
- **Request:** `POST` `{}`
- **Response:** `{ success: true }`

---

## Deploying Functions

```bash
# Deploy single function
supabase functions deploy {function-name}

# Deploy function without JWT verification
supabase functions deploy signup-by-phone --no-verify-jwt

# Deploy all functions
supabase functions deploy

# View logs
supabase functions logs {function-name}
```

## Creating a New Function

1. Create directory: `supabase/functions/{my-function}/index.ts`
2. Import shared utils from `../_shared/`
3. Follow the response format: `{ success, data }` or `{ success: false, error, code }`
4. Add JWT setting to `supabase/config.toml` under `[functions.my-function]`
5. Add to this README
