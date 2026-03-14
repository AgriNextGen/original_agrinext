/**
 * @function knowledge-service
 * @description Admin-protected Edge Function for knowledge base management,
 *   ingestion pipeline orchestration, and AI-powered admin insights.
 *
 * @auth verify_jwt = true (JWT required, admin role checked per route)
 *
 * @routes
 *   POST /sources       -- add knowledge source
 *   GET  /sources       -- list knowledge sources
 *   POST /crawl         -- trigger crawl + embed for a source
 *   POST /reindex       -- re-embed all chunks for a source
 *   GET  /documents     -- list documents for a source
 *   GET  /chunks        -- list chunks for a document
 *   POST /query         -- vector search query
 *   GET  /insights/summary  -- ingestion status + common intents
 *   POST /insights/query    -- AI-generated admin narrative
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";
import { successResponse, errorResponse } from "../_shared/errors.ts";
import { getRequestIdFromHeaders, logStructured } from "../_shared/request_context.ts";
import { crawlSource, chunkContent, computeChecksum, type KnowledgeSource } from "../_shared/knowledge_crawl.ts";
import { embedChunks } from "../_shared/knowledge_embeddings.ts";
import { searchKnowledge } from "../_shared/knowledge_retrieval.ts";
import { generateGeminiText } from "../_shared/gemini_client.ts";
import { parseJsonObject, trimText } from "../_shared/ai_response.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();

function getSubroute(pathname: string): string {
  const marker = "/knowledge-service";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return pathname;
  const sub = pathname.slice(idx + marker.length);
  return sub ? (sub.startsWith("/") ? sub : `/${sub}`) : "/";
}

async function getAuthUser(req: Request): Promise<{ id: string; role: string } | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace("Bearer ", "").trim();
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user?.id) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  return { id: data.user.id, role: roles?.role ?? "farmer" };
}

function requireAdmin(user: { id: string; role: string } | null): void {
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401, code: "unauthorized" });
  if (user.role !== "admin") throw Object.assign(new Error("Admin access required"), { status: 403, code: "forbidden" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqId = getRequestIdFromHeaders(req.headers);
  const startedAt = Date.now();
  const url = new URL(req.url);
  const route = getSubroute(url.pathname.replace(/\/+$/, ""));

  try {
    const user = await getAuthUser(req);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── POST /sources ────────────────────────────────────────────
    if (route === "/sources" && req.method === "POST") {
      requireAdmin(user);
      const body = await req.json();
      const { data, error } = await supabase.from("knowledge_sources").insert({
        source_name: body.source_name,
        source_type: body.source_type ?? "internal",
        base_url: body.base_url,
        trust_level: body.trust_level ?? 3,
        language: body.language ?? "en",
        crawl_frequency: body.crawl_frequency ?? "weekly",
        metadata: body.metadata ?? {},
      }).select().maybeSingle();
      if (error) return errorResponse("db_error", error.message, 500);
      return successResponse(data, 201);
    }

    // ── GET /sources ─────────────────────────────────────────────
    if (route === "/sources" && req.method === "GET") {
      requireAdmin(user);
      const { data, error } = await supabase.from("knowledge_sources").select("*").order("created_at", { ascending: false });
      if (error) return errorResponse("db_error", error.message, 500);
      return successResponse(data);
    }

    // ── POST /crawl ──────────────────────────────────────────────
    if (route === "/crawl" && req.method === "POST") {
      requireAdmin(user);
      const body = await req.json();
      const sourceId = body.source_id;
      if (!sourceId) return errorResponse("invalid_input", "source_id is required", 400);

      const { data: source } = await supabase.from("knowledge_sources").select("*").eq("id", sourceId).maybeSingle();
      if (!source) return errorResponse("not_found", "Source not found", 404);

      const { data: job } = await supabase.from("knowledge_ingestion_jobs").insert({
        source_id: sourceId, job_type: "crawl", status: "running", started_at: new Date().toISOString(),
      }).select("id").maybeSingle();

      try {
        const crawlResult = await crawlSource(source as KnowledgeSource, { requestId: reqId });
        const existingDoc = await supabase.from("knowledge_documents")
          .select("id, checksum").eq("source_id", sourceId).eq("canonical_url", source.base_url).maybeSingle();

        if (existingDoc.data?.checksum === crawlResult.checksum) {
          await supabase.from("knowledge_ingestion_jobs").update({
            status: "completed", completed_at: new Date().toISOString(), processed_items: 0,
            error_message: "Content unchanged (same checksum)",
          }).eq("id", job?.id);
          return successResponse({ status: "unchanged", checksum: crawlResult.checksum });
        }

        let docId: string;
        if (existingDoc.data) {
          await supabase.from("knowledge_documents").update({
            title: crawlResult.title, checksum: crawlResult.checksum, status: "pending",
            last_crawled_at: new Date().toISOString(),
          }).eq("id", existingDoc.data.id);
          docId = existingDoc.data.id;
          await supabase.from("knowledge_chunks").delete().eq("document_id", docId);
        } else {
          const { data: newDoc } = await supabase.from("knowledge_documents").insert({
            source_id: sourceId, title: crawlResult.title, canonical_url: source.base_url,
            language: source.language, checksum: crawlResult.checksum, status: "pending",
            last_crawled_at: new Date().toISOString(),
          }).select("id").maybeSingle();
          docId = newDoc!.id;
        }

        const chunks = chunkContent(crawlResult.content);
        const chunkRows = chunks.map((c) => ({
          document_id: docId, chunk_index: c.index, content: c.content,
          content_hash: c.contentHash, token_count: c.tokenCount,
        }));

        if (chunkRows.length > 0) {
          await supabase.from("knowledge_chunks").insert(chunkRows);
        }

        const { data: storedChunks } = await supabase.from("knowledge_chunks")
          .select("id, content").eq("document_id", docId);

        const embedResult = await embedChunks(
          (storedChunks ?? []).map((c: { id: string; content: string }) => ({ chunkId: c.id, content: c.content })),
          { requestId: reqId },
        );

        await supabase.from("knowledge_documents").update({ status: "indexed" }).eq("id", docId);
        await supabase.from("knowledge_ingestion_jobs").update({
          status: "completed", completed_at: new Date().toISOString(),
          total_items: chunks.length, processed_items: embedResult.succeeded,
        }).eq("id", job?.id);

        logStructured({ event: "crawl_complete", source_id: sourceId, chunks: chunks.length, embedded: embedResult.succeeded, request_id: reqId });
        return successResponse({ status: "completed", chunks: chunks.length, embedded: embedResult.succeeded, failed: embedResult.failed });
      } catch (error) {
        const errMsg = String((error as Error)?.message ?? error);
        logStructured({
          event: "crawl_failed",
          source_id: sourceId,
          request_id: reqId,
          error: errMsg,
        });
        await supabase.from("knowledge_ingestion_jobs").update({
          status: "failed", completed_at: new Date().toISOString(),
          error_message: errMsg,
        }).eq("id", job?.id);
        return errorResponse("crawl_failed", errMsg, 500);
      }
    }

    // ── POST /reindex ────────────────────────────────────────────
    if (route === "/reindex" && req.method === "POST") {
      requireAdmin(user);
      const body = await req.json();
      const sourceId = body.source_id;
      if (!sourceId) return errorResponse("invalid_input", "source_id is required", 400);

      const { data: chunks } = await supabase.from("knowledge_chunks")
        .select("id, content, knowledge_documents!inner(source_id)")
        .eq("knowledge_documents.source_id", sourceId);

      if (!chunks?.length) return successResponse({ status: "no_chunks", reindexed: 0 });

      const result = await embedChunks(
        chunks.map((c: any) => ({ chunkId: c.id, content: c.content })),
        { requestId: reqId },
      );

      return successResponse({ status: "completed", reindexed: result.succeeded, failed: result.failed });
    }

    // ── GET /documents ───────────────────────────────────────────
    if (route === "/documents" && req.method === "GET") {
      requireAdmin(user);
      const sourceId = url.searchParams.get("source_id");
      let query = supabase.from("knowledge_documents").select("*").order("created_at", { ascending: false });
      if (sourceId) query = query.eq("source_id", sourceId);
      const { data, error } = await query.limit(100);
      if (error) return errorResponse("db_error", error.message, 500);
      return successResponse(data);
    }

    // ── GET /chunks ──────────────────────────────────────────────
    if (route === "/chunks" && req.method === "GET") {
      requireAdmin(user);
      const documentId = url.searchParams.get("document_id");
      if (!documentId) return errorResponse("invalid_input", "document_id is required", 400);
      const { data, error } = await supabase.from("knowledge_chunks")
        .select("id, chunk_index, content, token_count, content_hash, created_at")
        .eq("document_id", documentId).order("chunk_index");
      if (error) return errorResponse("db_error", error.message, 500);
      return successResponse(data);
    }

    // ── POST /query ──────────────────────────────────────────────
    if (route === "/query" && req.method === "POST") {
      requireAdmin(user);
      const body = await req.json();
      const query = String(body.query ?? "").trim();
      if (!query) return errorResponse("invalid_input", "query is required", 400);

      const results = await searchKnowledge(query, {
        language: body.language,
        minTrustLevel: body.min_trust_level,
        maxResults: body.max_results ?? 5,
        threshold: body.threshold ?? 0.7,
        requestId: reqId,
      });

      return successResponse({
        query,
        results: results.map((r) => ({
          chunk_id: r.chunkId,
          content: r.content,
          similarity: r.similarity,
          document_title: r.documentTitle,
          source_name: r.sourceName,
          trust_level: r.trustLevel,
        })),
        total: results.length,
      });
    }

    // ── GET /insights/summary ────────────────────────────────────
    if (route === "/insights/summary" && req.method === "GET") {
      requireAdmin(user);

      const [sourcesRes, docsRes, jobsRes, chatsRes] = await Promise.all([
        supabase.from("knowledge_sources").select("id, source_name, is_active, trust_level"),
        supabase.from("knowledge_documents").select("id, status"),
        supabase.from("knowledge_ingestion_jobs").select("id, status, job_type").order("created_at", { ascending: false }).limit(20),
        supabase.from("chat_messages").select("metadata").eq("role", "user").order("created_at", { ascending: false }).limit(100),
      ]);

      const sources = sourcesRes.data ?? [];
      const docs = docsRes.data ?? [];
      const jobs = jobsRes.data ?? [];

      const intentCounts: Record<string, number> = {};
      for (const msg of chatsRes.data ?? []) {
        const intent = (msg.metadata as Record<string, unknown>)?.intent;
        if (typeof intent === "string") {
          intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
        }
      }

      return successResponse({
        sources: { total: sources.length, active: sources.filter((s: any) => s.is_active).length },
        documents: {
          total: docs.length,
          indexed: docs.filter((d: any) => d.status === "indexed").length,
          pending: docs.filter((d: any) => d.status === "pending").length,
          failed: docs.filter((d: any) => d.status === "failed").length,
        },
        recent_jobs: jobs.slice(0, 10),
        common_intents: Object.entries(intentCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      });
    }

    // ── POST /insights/query ─────────────────────────────────────
    if (route === "/insights/query" && req.method === "POST") {
      requireAdmin(user);
      const body = await req.json();
      const query = String(body.query ?? "").trim();
      if (!query) return errorResponse("invalid_input", "query is required", 400);

      const [sourcesRes, docsRes] = await Promise.all([
        supabase.from("knowledge_sources").select("source_name, source_type, trust_level, is_active, language"),
        supabase.from("knowledge_documents").select("title, status, source_id, last_crawled_at").limit(50),
      ]);

      const gemini = await generateGeminiText({
        systemPrompt: "You are an admin analytics AI for an agricultural platform. Provide concise, data-driven summaries. Do not fabricate data.",
        userPrompt: [
          `Admin query: ${query}`,
          "Platform knowledge base data:",
          `Sources: ${JSON.stringify(sourcesRes.data ?? [])}`,
          `Documents: ${JSON.stringify(docsRes.data ?? [])}`,
          'Return JSON: {"summary":"<analytical narrative>","recommendations":["<action item>"]}',
        ].join("\n"),
        temperature: 0.3,
        maxOutputTokens: 512,
        timeoutMs: 12000,
        responseMimeType: "application/json",
      });

      const parsed = parseJsonObject(gemini.text);
      return successResponse({
        summary: trimText(parsed?.summary ?? gemini.text, 2000),
        recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
      });
    }

    return errorResponse("not_found", `Unknown route: ${route}`, 404);
  } catch (error) {
    logStructured({
      request_id: reqId, endpoint: "knowledge-service", route,
      status: "error", latency_ms: Date.now() - startedAt,
      error: String((error as Error)?.message ?? error),
    });
    const status = Number((error as { status?: number })?.status ?? 500);
    const code = String((error as { code?: string })?.code ?? "internal");
    return errorResponse(code, String((error as Error)?.message ?? error), Number.isFinite(status) ? status : 500);
  }
});
