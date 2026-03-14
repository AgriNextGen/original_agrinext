/**
 * Embedding pipeline: generate embeddings via Gemini, store in pgvector.
 *
 * Uses the Gemini text-embedding-004 model (768 dimensions).
 *
 * Usage:
 *   import { generateEmbedding, embedChunks, storeEmbedding } from "../_shared/knowledge_embeddings.ts";
 */
import { logStructured } from "./request_context.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type EmbeddingResult = {
  embedding: number[];
  model: string;
};

export type ChunkForEmbedding = {
  chunkId: string;
  content: string;
};

// ── Config ─────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_TIMEOUT_MS = 15000;
const BATCH_DELAY_MS = 100;

function getGeminiApiKey(): string {
  const key = (
    Deno.env.get("gemini_api_key") ??
    Deno.env.get("GEMINI_API_KEY") ??
    ""
  ).trim();
  if (!key) throw new Error("GEMINI_API_KEY is required for embeddings");
  return key;
}

// ── generateEmbedding ──────────────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const trimmed = text.trim().slice(0, 8000);
  if (!trimmed) throw new Error("Cannot embed empty text");

  const apiKey = getGeminiApiKey();
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), EMBEDDING_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: trimmed }] },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Embedding API failed: ${res.status} ${errText.slice(0, 200)}`);
    }

    const body = await res.json();
    const values = body?.embedding?.values;

    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${values?.length ?? 0}`,
      );
    }

    return { embedding: values as number[], model: EMBEDDING_MODEL };
  } finally {
    clearTimeout(timer);
  }
}

// ── embedChunks ────────────────────────────────────────────────────────

export async function embedChunks(
  chunks: ChunkForEmbedding[],
  options?: { requestId?: string },
): Promise<{ succeeded: number; failed: number; errors: string[] }> {
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase runtime not configured for embedding storage");
  }

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    try {
      const { embedding } = await generateEmbedding(chunk.content);
      await storeEmbedding(chunk.chunkId, embedding, { supabaseUrl, serviceRoleKey });
      succeeded++;
    } catch (error) {
      failed++;
      const msg = String((error as Error)?.message ?? error);
      errors.push(`chunk ${chunk.chunkId}: ${msg}`);
      logStructured({
        event: "embed_chunk_failed",
        chunk_id: chunk.chunkId,
        error: msg,
        request_id: options?.requestId,
      });
    }

    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { succeeded, failed, errors };
}

// ── storeEmbedding ─────────────────────────────────────────────────────

export async function storeEmbedding(
  chunkId: string,
  embedding: number[],
  runtime?: { supabaseUrl: string; serviceRoleKey: string },
): Promise<void> {
  const supabaseUrl = runtime?.supabaseUrl ?? (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = runtime?.serviceRoleKey ?? (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  const embeddingStr = `[${embedding.join(",")}]`;

  const res = await fetch(`${supabaseUrl}/rest/v1/knowledge_embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      chunk_id: chunkId,
      embedding: embeddingStr,
      embedding_model: EMBEDDING_MODEL,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to store embedding: ${res.status} ${errText.slice(0, 200)}`);
  }
}
