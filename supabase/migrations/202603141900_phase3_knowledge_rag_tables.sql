-- Phase 3: Knowledge RAG tables, pgvector, and vector search RPC
-- Migration: 202603141900_phase3_knowledge_rag_tables.sql

-- ============================================================
-- 1. Enable pgvector extension
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- 2. knowledge_sources — trusted content source registry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text NOT NULL DEFAULT 'internal'
    CHECK (source_type IN ('government', 'extension', 'faq', 'internal', 'research')),
  base_url text,
  trust_level int NOT NULL DEFAULT 3 CHECK (trust_level BETWEEN 1 AND 5),
  language text NOT NULL DEFAULT 'en',
  is_active boolean NOT NULL DEFAULT true,
  crawl_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (crawl_frequency IN ('daily', 'weekly', 'monthly', 'manual')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_sources"
  ON public.knowledge_sources FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 3. knowledge_documents — crawled documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  title text,
  canonical_url text,
  language text DEFAULT 'en',
  checksum text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'indexed', 'failed', 'stale')),
  last_crawled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source_id ON public.knowledge_documents(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON public.knowledge_documents(status);

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_documents"
  ON public.knowledge_documents FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 4. knowledge_chunks — chunked content for embedding
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  token_count int,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_content_hash ON public.knowledge_chunks(content_hash);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_chunks"
  ON public.knowledge_chunks FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 5. knowledge_embeddings — vector embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id uuid NOT NULL UNIQUE REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
  embedding extensions.vector(768) NOT NULL,
  embedding_model text NOT NULL DEFAULT 'text-embedding-004',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_ivfflat
  ON public.knowledge_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_embeddings"
  ON public.knowledge_embeddings FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 6. knowledge_ingestion_jobs — crawl/embed job tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('crawl', 'embed', 'reindex')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_items int,
  processed_items int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_source_id ON public.knowledge_ingestion_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_jobs_status ON public.knowledge_ingestion_jobs(status);

ALTER TABLE public.knowledge_ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to knowledge_ingestion_jobs"
  ON public.knowledge_ingestion_jobs FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- ============================================================
-- 7. Vector search RPC function
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding extensions.vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_language text DEFAULT NULL,
  min_trust_level int DEFAULT 1
)
RETURNS TABLE (
  chunk_id uuid,
  content text,
  similarity float,
  document_id uuid,
  document_title text,
  source_name text,
  source_type text,
  trust_level int,
  chunk_metadata jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id AS chunk_id,
    kc.content,
    1 - (ke.embedding <=> query_embedding) AS similarity,
    kd.id AS document_id,
    kd.title AS document_title,
    ks.source_name,
    ks.source_type,
    ks.trust_level,
    kc.metadata AS chunk_metadata
  FROM public.knowledge_embeddings ke
  JOIN public.knowledge_chunks kc ON kc.id = ke.chunk_id
  JOIN public.knowledge_documents kd ON kd.id = kc.document_id
  JOIN public.knowledge_sources ks ON ks.id = kd.source_id
  WHERE ks.is_active = true
    AND ks.trust_level >= min_trust_level
    AND kd.status = 'indexed'
    AND (filter_language IS NULL OR kd.language = filter_language)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============================================================
-- 8. Auto-update triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_sources_updated_at
  BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_updated_at();

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_knowledge_updated_at();
