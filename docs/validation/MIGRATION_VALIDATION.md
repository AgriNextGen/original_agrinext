# Database + Migration Validation

**Date**: 2026-03-14

---

## Migration File Inventory

Total migration files: 108

### Phase 1-3 Specific Migrations (ordered by execution)

| Migration | Content | Status |
|-----------|---------|--------|
| `202603141700_audit_fixes.sql` | Logistics RPCs, status guards (pre-existing fix) | OK |
| `202603141700_phase1_chat_sessions_and_geocoding_cache.sql` | chat_sessions, chat_messages, geocoding_cache tables | OK |
| `202603141800_p0_fix_booking_and_capacity.sql` | Booking duplicate guard, capacity RPCs (pre-existing fix) | OK |
| `202603141800_phase2_voice_storage_and_image_buckets.sql` | voice-responses/crop-images/disease-images buckets, voice_responses table | OK |
| `202603141900_phase3_knowledge_rag_tables.sql` | pgvector extension, knowledge_sources/documents/chunks/embeddings tables, match_knowledge_chunks RPC | OK |
| `202603141900_phase4_transport_dashboard_earnings.sql` | Transport dashboard (unrelated to Phase 1-3) | OK |
| `202603150001_p0_fix_crop_media_schema.sql` | Crop media schema fix | OK |
| `202603150002_p0_fix_crop_activity_logs_schema.sql` | Activity logs fix | OK |
| `202603150003_p1_create_ai_transport_logs.sql` | AI transport logs | OK |
| `202603150004_p1_create_ai_agent_logs.sql` | AI agent logs | OK |
| `202603150005_p0_fix_user_profiles_rls.sql` | User profiles RLS fix | OK |

### Timestamp Collision Analysis

Three timestamp pairs share prefixes. Supabase runs migrations in alphabetical order within each timestamp:

1. `202603141700_audit_fixes` runs before `202603141700_phase1_chat...` (alphabetical: "audit" < "phase1") -- **Safe**: no dependencies between them.
2. `202603141800_p0_fix_booking...` runs before `202603141800_phase2_voice...` (alphabetical: "p0" < "phase2") -- **Safe**: no dependencies.
3. `202603141900_phase3_knowledge...` runs before `202603141900_phase4_transport...` (alphabetical: "phase3" < "phase4") -- **Safe**: no dependencies.

---

## Table Verification

### Phase 1 Tables

| Table | PK | Indexes | RLS | Policies | updated_at | Trigger |
|-------|----|---------|----|----------|------------|---------|
| chat_sessions | uuid gen_random_uuid | user_id, created_at DESC | YES | SELECT/INSERT/UPDATE/DELETE by owner + service_role ALL | YES | trg_chat_sessions_updated_at |
| chat_messages | uuid gen_random_uuid | session_id, (session_id, created_at ASC) | YES | SELECT/INSERT by session owner + service_role ALL | NO (append-only) | N/A |
| geocoding_cache | uuid gen_random_uuid | query_hash UNIQUE, expires_at | YES | service_role ALL only | NO (cache) | N/A |

### Phase 2 Tables

| Table | PK | Indexes | RLS | Policies | FK |
|-------|----|---------|----|----------|-----|
| voice_responses | uuid gen_random_uuid | user_id, session_id, created_at DESC | YES | SELECT by owner + service_role ALL | message_id -> chat_messages, session_id -> chat_sessions, user_id -> auth.users |

### Phase 2 Storage Buckets

| Bucket | Public | Size Limit | Allowed MIME | ON CONFLICT |
|--------|--------|------------|-------------|-------------|
| voice-responses | false | 10MB | audio/mpeg, mp3, wav, ogg | DO NOTHING |
| crop-images | false | 10MB | image/jpeg, png, webp | DO NOTHING |
| disease-images | false | 10MB | image/jpeg, png, webp | DO NOTHING |

Storage policies: voice_responses_select_own, crop_images_select_own, disease_images_select_own (user reads own files by folder path).

### Phase 3 Tables

| Table | PK | Indexes | RLS | Policies | FK | Standard Cols |
|-------|----|---------|----|----------|-----|-------------|
| knowledge_sources | uuid | N/A | YES | service_role ALL | N/A | created_at, updated_at (trigger) |
| knowledge_documents | uuid | source_id, status | YES | service_role ALL | source_id -> knowledge_sources | created_at, updated_at (trigger) |
| knowledge_chunks | uuid | document_id, content_hash | YES | service_role ALL | document_id -> knowledge_documents | created_at |
| knowledge_embeddings | uuid | IVFFlat on embedding | YES | service_role ALL | chunk_id -> knowledge_chunks (UNIQUE) | created_at |
| knowledge_ingestion_jobs | uuid | source_id, status | YES | service_role ALL | source_id -> knowledge_sources | created_at |

### Phase 3 pgvector

| Item | Status |
|------|--------|
| Extension creation | `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions` |
| Column type | `extensions.vector(768)` |
| Index type | IVFFlat with `extensions.vector_cosine_ops`, lists=100 |
| RPC function | `match_knowledge_chunks(extensions.vector(768), float, int, text, int)` |
| Cosine distance | `1 - (ke.embedding <=> query_embedding)` |

### Pre-existing Tables (verified present in earlier migrations)

| Table | Migration |
|-------|-----------|
| files | 202602250002_phase_d_storage_foundation.sql |
| profiles | 202602160002_roles_profiles.sql |
| user_roles | 202602160002_roles_profiles.sql |
| farmlands | 202602160003_mvp_core_tables.sql |
| crops | 202602160003_mvp_core_tables.sql |
| listings | 202602160003_mvp_core_tables.sql |
| transport_requests | 202602160003_mvp_core_tables.sql |
| trips | 202602160003_mvp_core_tables.sql |
| rate_limits | 202602230001_rate_limit_table.sql |

---

## Duplicate System Check

| Check | Result |
|-------|--------|
| Duplicate chat tables | NONE -- single chat_sessions + chat_messages |
| Duplicate knowledge tables | NONE -- single knowledge_sources -> documents -> chunks -> embeddings pipeline |
| Duplicate file tables | NONE -- single public.files table |
| Duplicate storage buckets | NONE -- ON CONFLICT DO NOTHING prevents duplicates |

---

## Issues Found

None. All Phase 1-3 migrations are structurally sound:
- All tables use `IF NOT EXISTS`
- All have RLS enabled
- All have appropriate policies
- Standard columns (created_at, updated_at) present where needed
- Foreign keys correctly reference parent tables with CASCADE deletes
- pgvector extension, column type, index, and RPC are correctly configured

---

## Validation Result: PASS
