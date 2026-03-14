/**
 * Knowledge crawl service: Firecrawl ingestion, content cleaning, chunking.
 *
 * Reuses the existing Firecrawl API key pattern from ai-gateway.
 *
 * Usage:
 *   import { crawlSource, cleanContent, chunkContent, computeChecksum } from "../_shared/knowledge_crawl.ts";
 */
import { logStructured } from "./request_context.ts";

// ── Types ──────────────────────────────────────────────────────────────

export type KnowledgeSource = {
  id: string;
  source_name: string;
  source_type: string;
  base_url: string;
  trust_level: number;
  language: string;
};

export type CrawlResult = {
  title: string;
  content: string;
  url: string;
  checksum: string;
};

export type ContentChunk = {
  index: number;
  content: string;
  contentHash: string;
  tokenCount: number;
};

// ── Content cleaning ───────────────────────────────────────────────────

const STRIP_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /<nav[\s\S]*?<\/nav>/gi,
  /<header[\s\S]*?<\/header>/gi,
  /<footer[\s\S]*?<\/footer>/gi,
  /<aside[\s\S]*?<\/aside>/gi,
  /<!--[\s\S]*?-->/g,
];

export function cleanContent(rawHtml: string): string {
  let text = rawHtml;

  for (const pattern of STRIP_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\t+/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

// ── Checksum ───────────────────────────────────────────────────────────

export async function computeChecksum(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Chunking ───────────────────────────────────────────────────────────

function estimateTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function chunkContent(
  text: string,
  maxTokens = 500,
  overlapTokens = 50,
): ContentChunk[] {
  if (!text.trim()) return [];

  const sentences = text.split(/(?<=[.!?।\n])\s+/).filter((s) => s.trim());
  const chunks: ContentChunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);

    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      const chunkText = currentChunk.join(" ").trim();
      chunks.push({
        index: chunkIndex,
        content: chunkText,
        contentHash: simpleHash(chunkText),
        tokenCount: currentTokens,
      });
      chunkIndex++;

      const overlapSentences: string[] = [];
      let overlapCount = 0;
      for (let i = currentChunk.length - 1; i >= 0 && overlapCount < overlapTokens; i--) {
        overlapSentences.unshift(currentChunk[i]);
        overlapCount += estimateTokenCount(currentChunk[i]);
      }
      currentChunk = overlapSentences;
      currentTokens = overlapCount;
    }

    currentChunk.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(" ").trim();
    if (chunkText) {
      chunks.push({
        index: chunkIndex,
        content: chunkText,
        contentHash: simpleHash(chunkText),
        tokenCount: currentTokens,
      });
    }
  }

  return chunks;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `ch_${Math.abs(hash).toString(36)}`;
}

// ── Firecrawl crawl ────────────────────────────────────────────────────

export async function crawlSource(
  source: KnowledgeSource,
  options?: { requestId?: string },
): Promise<CrawlResult> {
  const apiKey = (
    Deno.env.get("firecrawl_api_key") ??
    Deno.env.get("FIRECRAWL_API_KEY") ??
    ""
  ).trim();

  if (!apiKey) {
    throw Object.assign(new Error("Firecrawl API key not configured"), {
      code: "missing_secret",
    });
  }

  const firecrawlUrl = (
    Deno.env.get("FIRECRAWL_API_URL") ?? "https://api.firecrawl.dev/v1/scrape"
  ).trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), 30000);

  try {
    const res = await fetch(firecrawlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: source.base_url,
        formats: ["markdown", "html"],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const errMsg = `Firecrawl failed: ${res.status} ${errText.slice(0, 200)}`;
      logStructured({
        event: "crawl_source_failed",
        source_id: source.id,
        request_id: options?.requestId,
        error: errMsg,
      });
      throw new Error(errMsg);
    }

    const body = await res.json();
    const data = body?.data ?? body;
    const rawContent = String(data?.markdown ?? data?.html ?? data?.content ?? "");

    if (!rawContent.trim()) {
      logStructured({
        event: "crawl_source_failed",
        source_id: source.id,
        request_id: options?.requestId,
        error: "Firecrawl returned empty content",
      });
      throw new Error("Firecrawl returned empty content");
    }

    const cleaned = cleanContent(rawContent);
    const checksum = await computeChecksum(cleaned);

    logStructured({
      event: "crawl_source_complete",
      source_id: source.id,
      source_name: source.source_name,
      content_length: cleaned.length,
      request_id: options?.requestId,
    });

    return {
      title: String(data?.metadata?.title ?? data?.title ?? source.source_name),
      content: cleaned,
      url: source.base_url,
      checksum,
    };
  } finally {
    clearTimeout(timer);
  }
}
