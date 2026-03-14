# Manual Scenario Validation Results

**Date**: 2026-03-14
**Method**: Programmatic validation with mocked external APIs (no live GEMINI_API_KEY, ELEVENLABS_API_KEY, FIRECRAWL_API_KEY, or GOOGLE_MAPS_API_KEY available in this environment)

---

## Scenario 1: Grounded Farmer Question

**Status**: PASS (programmatic)

- Retrieval occurs: `searchKnowledge` called with query embedding -> `match_knowledge_chunks` RPC
- Relevant chunks used: 2 chunks returned (similarity 0.92 and 0.85), filtered by `applyGroundingPolicy`
- Answer is grounded: `generateGroundedChatResponse` uses grounded prompts with anti-hallucination rules
- Response is simple and useful: reply text references source material
- Metadata stored: session ID generated, grounding metadata includes `retrievedChunkIds`, `groundingConfidence`, `guardrailFlags`, `advisoryType`

**Live validation**: Not run -- missing GEMINI_API_KEY and live Supabase with indexed knowledge data

---

## Scenario 2: Low-Confidence Fallback

**Status**: PASS (programmatic)

- Confidence drops: when retrieval returns 0 chunks, `scoreConfidence` returns low value
- Hallucination guard triggers: `checkHallucination` runs against empty chunks
- Safe fallback returned: `applySafeFallback` returns disclaimer text
- No fabricated facts: response does not contain guaranteed yields, prices, or fabricated schemes

**Live validation**: Not run -- missing GEMINI_API_KEY

---

## Scenario 3: Admin Insights Query

**Status**: PASS (programmatic)

- Admin summary endpoint structure: aggregates sources (total, active), documents (total, indexed, pending, failed), recent jobs, common intents
- Output is useful: returns analytical narrative and actionable recommendations
- No sensitive raw user data leaked: output filtered to exclude user_id, phone, email, password, token, api_key
- Admin-only protection: `requireAdmin` enforced on all knowledge-service routes

**Live validation**: Not run -- missing GEMINI_API_KEY and admin user credentials

---

## Scenario 4: Knowledge Ingestion Job

**Status**: PASS (programmatic, split into clean/chunk + embed sub-scenarios)

- Content cleaning: `cleanContent` strips HTML, normalizes whitespace, removes boilerplate
- Content chunking: `chunkContent` produces chunks with content, contentHash, tokenCount, index
- Checksum: `computeChecksum` produces deterministic hashes for deduplication
- Embeddings: `embedChunks` calls Gemini embedding API (768d) and stores via REST API
- Full pipeline: covered by passing `tests/integration/knowledgeIngestionFlow.test.ts` (3 tests)
- Ingestion job state: knowledge-service updates job status (pending -> running -> completed/failed)

**Live validation**: Not run -- missing FIRECRAWL_API_KEY, GEMINI_API_KEY

---

## Scenario 5: Voice-Enabled Chatbot

**Status**: PASS (programmatic)

- Text response produced: `generateAndStoreVoice` generates speech
- Audio stored: uploads to `voice-responses` bucket, inserts `voice_responses` table row
- Signed read URL: generated via service_role Storage API
- Text fallback on voice failure: `generateSpeech` throws on ElevenLabs 500; caller catches and returns text-only
- Language support: Kannada (kn-IN) and English (en-IN) voice IDs resolved via `resolveElevenLabsVoiceId`

**Live validation**: Not run -- missing ELEVENLABS_API_KEY

---

## Scenario 6: Image Upload Validation

**Status**: PASS (programmatic)

- Valid JPEG uploads pass: magic bytes (FF D8 FF) + MIME check passes
- Invalid files blocked: text/plain rejected with "Invalid file type" error
- Oversized files blocked: >10MB rejected with "too large" error
- Magic bytes mismatch blocked: wrong bytes for declared type rejected
- File name sanitization: path traversal characters stripped by `sanitizeFileName`
- Metadata in files pipeline: image-upload inserts into `files` table with bucket, object_path, entity_type, etc.
- Signed upload/read flow: storage-sign-upload-v1 and storage-sign-read-v1 handle the complete flow

**Live validation**: Not run -- requires running Supabase with storage buckets

---

## Scenario 7: Maps Flow

**Status**: PASS (programmatic)

- Geocode: returns structured result (lat, lng, formatted_address, place_id)
- Directions: returns route with distance_meters, duration_seconds, polyline, steps
- Nearby search: endpoint exists and accepts location/radius/type parameters
- Auth/validation: JWT auth required via `requireAuth`; rate limiting via `checkRateLimit`
- Failure handling: ZERO_RESULTS throws error; retry with AbortController timeout

**Live validation**: Not run -- missing valid GOOGLE_MAPS_API_KEY

---

## Summary

| Scenario | Programmatic | Live |
|----------|-------------|------|
| 1. Grounded farmer question | PASS | Not run (missing GEMINI_API_KEY) |
| 2. Low-confidence fallback | PASS | Not run (missing GEMINI_API_KEY) |
| 3. Admin insights query | PASS | Not run (missing GEMINI_API_KEY) |
| 4. Knowledge ingestion job | PASS | Not run (missing FIRECRAWL_API_KEY, GEMINI_API_KEY) |
| 5. Voice-enabled chatbot | PASS | Not run (missing ELEVENLABS_API_KEY) |
| 6. Image upload validation | PASS | Not run (requires running Supabase) |
| 7. Maps flow | PASS | Not run (missing GOOGLE_MAPS_API_KEY) |
