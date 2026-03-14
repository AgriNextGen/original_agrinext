/**
 * Knowledge retrieval: vector search, context assembly, grounding policy.
 *
 * Usage:
 *   import { searchKnowledge, assembleGroundingContext, applyGroundingPolicy } from "../_shared/knowledge_retrieval.ts";
 */
import { generateEmbedding } from "./knowledge_embeddings.ts";
import { logStructured } from "./request_context.ts";
import type { ChatIntent } from "./ai_chat.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type RetrievedChunk = {
  chunkId: string;
  content: string;
  similarity: number;
  documentId: string;
  documentTitle: string;
  sourceName: string;
  sourceType: string;
  trustLevel: number;
};

export type SearchKnowledgeOptions = {
  language?: string;
  minTrustLevel?: number;
  maxResults?: number;
  threshold?: number;
  requestId?: string;
};

export type GroundingContext = {
  text: string;
  chunkIds: string[];
  sourceCount: number;
  avgSimilarity: number;
};

// ── searchKnowledge ────────────────────────────────────────────────────

export async function searchKnowledge(
  query: string,
  options?: SearchKnowledgeOptions,
): Promise<RetrievedChunk[]> {
  const startedAt = Date.now();
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  if (!supabaseUrl || !serviceRoleKey) return [];

  const trimmed = query.trim().slice(0, 2000);
  if (!trimmed) return [];

  let queryEmbedding: number[];
  try {
    const result = await generateEmbedding(trimmed);
    queryEmbedding = result.embedding;
  } catch (error) {
    logStructured({
      event: "knowledge_search_embedding_failed",
      error: String((error as Error)?.message ?? error),
      request_id: options?.requestId,
    });
    return [];
  }

  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const matchCount = Math.min(options?.maxResults ?? 5, 10);
  const threshold = options?.threshold ?? 0.7;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/match_knowledge_chunks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query_embedding: embeddingStr,
        match_threshold: threshold,
        match_count: matchCount,
        filter_language: options?.language ?? null,
        min_trust_level: options?.minTrustLevel ?? 1,
      }),
    });

    if (!res.ok) {
      logStructured({
        event: "knowledge_search_rpc_failed",
        status: res.status,
        request_id: options?.requestId,
      });
      return [];
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) return [];

    logStructured({
      event: "knowledge_search_complete",
      results: rows.length,
      latency_ms: Date.now() - startedAt,
      request_id: options?.requestId,
    });

    return rows.map((row: Record<string, unknown>) => ({
      chunkId: String(row.chunk_id ?? ""),
      content: String(row.content ?? ""),
      similarity: Number(row.similarity ?? 0),
      documentId: String(row.document_id ?? ""),
      documentTitle: String(row.document_title ?? ""),
      sourceName: String(row.source_name ?? ""),
      sourceType: String(row.source_type ?? ""),
      trustLevel: Number(row.trust_level ?? 1),
    }));
  } catch (error) {
    logStructured({
      event: "knowledge_search_error",
      error: String((error as Error)?.message ?? error),
      request_id: options?.requestId,
    });
    return [];
  }
}

// ── assembleGroundingContext ────────────────────────────────────────────

export function assembleGroundingContext(
  chunks: RetrievedChunk[],
  maxTokens = 2000,
): GroundingContext {
  if (!chunks.length) {
    return { text: "", chunkIds: [], sourceCount: 0, avgSimilarity: 0 };
  }

  const sorted = [...chunks].sort((a, b) => b.similarity - a.similarity);
  const lines: string[] = [];
  const chunkIds: string[] = [];
  const sources = new Set<string>();
  let totalTokens = 0;

  for (const chunk of sorted) {
    const approxTokens = Math.ceil(chunk.content.split(/\s+/).length * 1.3);
    if (totalTokens + approxTokens > maxTokens) break;

    lines.push(
      `[Source: ${chunk.sourceName} | Trust: ${chunk.trustLevel}/5 | Relevance: ${(chunk.similarity * 100).toFixed(0)}%]\n${chunk.content}`,
    );
    chunkIds.push(chunk.chunkId);
    sources.add(chunk.sourceName);
    totalTokens += approxTokens;
  }

  const avgSimilarity =
    sorted.slice(0, chunkIds.length).reduce((sum, c) => sum + c.similarity, 0) /
    Math.max(chunkIds.length, 1);

  return {
    text: lines.join("\n\n---\n\n"),
    chunkIds,
    sourceCount: sources.size,
    avgSimilarity,
  };
}

// ── applyGroundingPolicy ───────────────────────────────────────────────

const INTENT_TRUST_MAP: Partial<Record<ChatIntent, number>> = {
  pest_disease: 3,
  crop_advice: 2,
  irrigation: 2,
  market_price: 2,
  weather_query: 1,
  transport: 1,
  general: 1,
};

export function applyGroundingPolicy(
  chunks: RetrievedChunk[],
  intent: ChatIntent,
  role?: string,
): RetrievedChunk[] {
  const minTrust = INTENT_TRUST_MAP[intent] ?? 1;

  let filtered = chunks.filter((c) => c.trustLevel >= minTrust);

  if (role === "admin" || role === "agent") {
    filtered = filtered.filter((c) => c.similarity >= 0.65);
  } else {
    filtered = filtered.filter((c) => c.similarity >= 0.7);
  }

  return filtered.slice(0, 5);
}
