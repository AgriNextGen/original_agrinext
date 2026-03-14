# Architecture Audit Checklist

**Date**: 2026-03-14
**Scope**: Phases 1-3 backend (Supabase + Gemini + Maps + ElevenLabs + Firecrawl/RAG + Guardrails + Admin Insights)

Legend: PASS = implemented correctly | PARTIAL = partially implemented | MISSING = not found | RISK = duplicated or risky

---

## A. Core Backend

| Item | Status | Evidence |
|------|--------|----------|
| Supabase auth (phone-first) | PASS | `login-by-phone`, `signup-by-phone` Edge Functions; JWT validation in ai-gateway, maps-service, knowledge-service, image-upload, tts-elevenlabs |
| Database schema | PASS | 108 migrations in `supabase/migrations/`; chat_sessions, chat_messages, voice_responses, knowledge_*, geocoding_cache, files tables |
| Role-aware auth / middleware | PASS | knowledge-service: `getAuthUser` + `requireAdmin`; ai-gateway: role-scoped prompts via context_type; image-upload: JWT auth |
| Structured logging | PASS | `logStructured` from `_shared/request_context.ts` used in ai-gateway, knowledge-service, maps-service, voice_service, image-upload |
| Rate limiting | PASS | ai-gateway: 120/60s; maps-service: 60/3600s; storage-sign-upload: 200/3600s; image-upload: 30/3600s; all via `consume_rate_limit` RPC |
| API gateway / chat flow | PASS | ai-gateway routes: `/chat/message`, `/voice/generate`, `/knowledge/query`, `/chat/summarize`, `/agent-ai`, `/transport-ai`, `/marketplace-ai` |

## B. AI Layer

| Item | Status | Evidence |
|------|--------|----------|
| Gemini client | PASS | `_shared/gemini_client.ts`: `generateGeminiText`, `getGeminiModel`; timeout (AbortController), conversation support, response parsing |
| Prompt builder | PASS | `_shared/ai_prompts.ts` (farmer/role system prompts), `_shared/knowledge_prompts.ts` (grounded prompts with anti-hallucination rules) |
| Context loader | PASS | `_shared/ai_context.ts`: `buildFarmerContext` loads crops, farmlands, weather; `resolveElevenLabsVoiceId` |
| Response parser | PASS | `_shared/ai_response.ts`: `normalizeAssistantOutput`, `parseJsonObject`, `trimText`, `geminiErrorMessage` |
| Grounded response policy | PASS | `_shared/ai_chat.ts`: `generateGroundedChatResponse` → searchKnowledge → applyGroundingPolicy → assembleGroundingContext → Gemini with grounded prompts |
| Advisory engine | PASS | `_shared/advisory_engine.ts`: `generateAdvisory` with guardrails integration (scoreConfidence, checkHallucination, checkUnsafeAdvice, applySafeFallback) |

## C. Maps Layer

| Item | Status | Evidence |
|------|--------|----------|
| Geocoding | PASS | `_shared/maps_client.ts`: `geocodeAddress` with DB cache (`geocoding_cache` table) |
| Route lookup | PASS | `getDirections` in maps_client; exposed via `maps-service /route` |
| Nearby search | PASS | `searchNearby` in maps_client; exposed via `maps-service /nearby` |
| Caching | PARTIAL | Geocoding cached in DB; directions/nearby not cached (acceptable for MVP, volume is low) |
| Auth + rate limiting | PASS | maps-service: JWT auth, rate limit 60/3600s |
| Error handling | PASS | `fetchWithRetry` with 2 attempts, AbortController timeout, structured logging on failure |

## D. Voice Layer

| Item | Status | Evidence |
|------|--------|----------|
| ElevenLabs client | PASS | `_shared/voice_service.ts`: `generateSpeech` (with retry, timeout, voice settings) |
| Voice generation endpoint | PASS | ai-gateway `/voice/generate` (standalone); tts-elevenlabs (returns base64); ai-gateway `/chat/message` with auto-voice |
| Storage-backed audio persistence | PASS | `generateAndStoreVoice` uploads to `voice-responses` bucket; inserts into `voice_responses` table with metadata |
| Signed URL access | PASS | voice_service creates signed URL via service_role Storage API; tts-elevenlabs returns base64 fallback |
| Text fallback on voice failure | PASS | ai_chat.ts: voice generation failure does not block text response return |

## E. File/Image Layer

| Item | Status | Evidence |
|------|--------|----------|
| Existing storage pipeline (reused) | PASS | `storage-sign-upload-v1`, `storage-sign-read-v1`, `storage-confirm-upload-v1`; `public.files` table |
| Image validation | PASS | `_shared/image_validator.ts`: `validateImageFile` (MIME, magic bytes, size); `sanitizeFileName`, `getExtensionForType` |
| Image upload endpoint | PASS | `image-upload/index.ts`: multipart + JSON base64; validates, uploads to Storage, inserts files row, returns signed URL |
| Metadata persistence | PASS | files table (bucket, object_path, owner_user_id, entity_type, entity_id, purpose, mime_type, size_bytes, status) |
| Signed upload/read flow | PASS | Frontend: storage-sign-upload-v1 → signed URL upload → storage-confirm-upload-v1; read: storage-sign-read-v1 |

## F. Knowledge Layer

| Item | Status | Evidence |
|------|--------|----------|
| Firecrawl ingestion | PASS | `_shared/knowledge_crawl.ts`: `crawlSource` (Firecrawl API v1/scrape, markdown+html), 30s timeout, error handling |
| Source registry | PASS | `knowledge_sources` table (source_name, source_type, base_url, trust_level, language, crawl_frequency); CRUD in knowledge-service |
| Content cleaning | PASS | `cleanContent` strips HTML, normalizes whitespace, removes boilerplate |
| Content chunking | PASS | `chunkContent` splits by paragraphs/headings, respects max token limit per chunk, generates content hashes |
| Embeddings | PASS | `_shared/knowledge_embeddings.ts`: `generateEmbedding` (Gemini text-embedding-004, 768d), `embedChunks` (batch with delay), `storeEmbedding` |
| Vector retrieval | PASS | `_shared/knowledge_retrieval.ts`: `searchKnowledge` → `match_knowledge_chunks` RPC (cosine similarity) |
| pgvector setup | PASS | Migration `202603141900`: `CREATE EXTENSION vector`, `knowledge_embeddings.embedding extensions.vector(768)`, IVFFlat index |
| Context assembly | PASS | `assembleGroundingContext` (token-limited, sorted by similarity); `applyGroundingPolicy` (trust + similarity filters per intent/role) |
| Duplicate prevention | PASS | knowledge-service crawl: checksum comparison prevents re-crawling unchanged content |

## G. Guardrails

| Item | Status | Evidence |
|------|--------|----------|
| Hallucination prevention | PASS | `checkHallucination`: factual claim regex patterns (dosages, schemes, prices) cross-checked against retrieved chunks |
| Unsafe advice blocking | PASS | `checkUnsafeAdvice`: detects guaranteed outcomes, dangerous chemical mixing, safety dismissal, toxic ingestion |
| Confidence scoring | PASS | `scoreConfidence`: weighted formula (similarity 35%, trust 25%, chunk count 20%, source diversity 10%, evidence 10%) |
| Low-confidence fallback | PASS | `applySafeFallback`: returns disclaimer in EN/KN when confidence < 0.4 or guardrails fail |
| Escalation-safe responses | PASS | Fallback text advises consulting local agri officer; no raw model output when guardrails fail |
| Configurable thresholds | PASS | `GUARDRAIL_THRESHOLDS` exported as const: minConfidence 0.4, highConfidence 0.75, minSimilarity 0.7, minChunksForStrong 2 |

## H. Admin Tools

| Item | Status | Evidence |
|------|--------|----------|
| Admin insights endpoints | PASS | knowledge-service GET `/insights/summary` (sources, documents, jobs, common intents); POST `/insights/query` (Gemini narrative) |
| Safe data filtering | PASS | Summary returns aggregate counts and intent names only; query sends source metadata only, no raw PII |
| Admin-only protection | PASS | `requireAdmin` enforced on all knowledge-service routes |
| No raw data leakage | PASS | insights/query response is trimmed to 2000 chars; Gemini prompt: "Do not fabricate data" |

---

## Summary

| Category | Items | PASS | PARTIAL | MISSING | RISK |
|----------|-------|------|---------|---------|------|
| A. Core Backend | 6 | 6 | 0 | 0 | 0 |
| B. AI Layer | 6 | 6 | 0 | 0 | 0 |
| C. Maps Layer | 6 | 5 | 1 | 0 | 0 |
| D. Voice Layer | 5 | 5 | 0 | 0 | 0 |
| E. File/Image Layer | 5 | 5 | 0 | 0 | 0 |
| F. Knowledge Layer | 9 | 9 | 0 | 0 | 0 |
| G. Guardrails | 6 | 6 | 0 | 0 | 0 |
| H. Admin Tools | 4 | 4 | 0 | 0 | 0 |
| **Total** | **47** | **46** | **1** | **0** | **0** |

### Partial Items

1. **Maps caching (C)**: Only geocoding is cached in DB; directions and nearby search are not cached. Acceptable for MVP scale; document as future optimization.

### No Missing or Risky Items

All 47 audited items are implemented. No duplicate parallel systems detected. The single RAG pipeline (knowledge_sources -> documents -> chunks -> embeddings) is clean and non-duplicated.
