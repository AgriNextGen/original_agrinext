/**
 * Smoke tests for deployed Supabase Edge Functions.
 *
 * Requires environment:
 *   VITE_SUPABASE_URL    – project URL (read from .env)
 *   SMOKE_TEST_JWT       – a valid user JWT (set before running)
 *
 * Run:  SMOKE_TEST_JWT="ey..." npx vitest run tests/edge-functions-smoke.test.ts
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ??
  "https://rmtkkzfzdmpjlqexrbme.supabase.co";

const JWT = process.env.SMOKE_TEST_JWT ?? "";

const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

const authHeaders = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${JWT}`,
  "Content-Type": "application/json",
  ...extra,
});

describe("env-check", () => {
  it("returns 401 without JWT", async () => {
    const res = await fetch(fnUrl("env-check"));
    expect(res.status).toBe(401);
  });

  it("returns boolean presence map with valid JWT", async () => {
    if (!JWT) return; // skip when no JWT supplied

    const res = await fetch(fnUrl("env-check"), { headers: authHeaders() });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.env).toBe("object");

    const expectedKeys = [
      "gemini_api_key",
      "perplexity_api_key",
      "firecrawl_api_key",
      "elevenlabs_api_key",
      "google_maps_api_key",
    ];
    for (const k of expectedKeys) {
      expect(typeof body.env[k]).toBe("boolean");
    }
  });
});

describe("ai-gateway", () => {
  it("returns 401 without JWT", async () => {
    const res = await fetch(fnUrl("ai-gateway/gemini/chat"));
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown route with JWT", async () => {
    if (!JWT) return;

    const res = await fetch(fnUrl("ai-gateway/unknown"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });

  it("/gemini/chat returns 200 or missing_secret with JWT", async () => {
    if (!JWT) return;

    const res = await fetch(fnUrl("ai-gateway/gemini/chat"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ message: "ping" }),
    });
    const body = await res.json();
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(body.ok).toBe(true);
      expect(body.route).toBe("gemini/chat");
    } else {
      expect(body.error.code).toBe("missing_secret");
    }
  });

  it("/firecrawl/fetch returns 200 or missing_secret with JWT", async () => {
    if (!JWT) return;

    const res = await fetch(fnUrl("ai-gateway/firecrawl/fetch"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const body = await res.json();
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(body.ok).toBe(true);
      expect(body.route).toBe("firecrawl/fetch");
    } else {
      expect(body.error.code).toBe("missing_secret");
    }
  });

  it("/elevenlabs/tts returns 200 or missing_secret with JWT", async () => {
    if (!JWT) return;

    const res = await fetch(fnUrl("ai-gateway/elevenlabs/tts"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ text: "hello" }),
    });
    const body = await res.json();
    expect([200, 500]).toContain(res.status);

    if (res.status === 200) {
      expect(body.ok).toBe(true);
      expect(body.route).toBe("elevenlabs/tts");
    } else {
      expect(body.error.code).toBe("missing_secret");
    }
  });
});

const STUB_FUNCTIONS = [
  "gemini-chat",
  "tts-elevenlabs",
  "farmer-assistant",
  "admin-ai",
  "agent-ai",
  "marketplace-ai",
  "transport-ai",
  "sync-karnataka-mandi-prices",
  "rebuild-farmer-segments",
  "seed-test-data",
  "seed-mysuru-demo",
  "save-agent-voice-note",
];

describe("stub functions return 501", () => {
  for (const fn of STUB_FUNCTIONS) {
    it(`${fn} returns 501 not_implemented`, async () => {
      if (!JWT) return;

      const res = await fetch(fnUrl(fn), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const body = await res.json();
      expect(res.status).toBe(501);
      expect(body.error.code).toBe("not_implemented");
    });
  }
});

describe("public-listing-trace (no JWT required)", () => {
  it("returns 501 not_implemented without JWT", async () => {
    const res = await fetch(fnUrl("public-listing-trace"), {
      method: "GET",
    });
    const body = await res.json();
    expect(res.status).toBe(501);
    expect(body.error.code).toBe("not_implemented");
  });
});

describe("internal worker/admin functions reject missing worker secret", () => {
  for (const fn of ["job-worker", "finance-cron", "finance-admin-api", "finance-reconcile"]) {
    it(`${fn} rejects without x-worker-secret`, async () => {
      const res = await fetch(fnUrl(fn), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect([401, 403, 404, 405]).toContain(res.status);
    });
  }
});

describe("payment-webhook signature enforcement", () => {
  it("rejects invalid or missing signature", async () => {
    const res = await fetch(fnUrl("payment-webhook"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "test" }),
    });
    expect([401, 403, 404, 405]).toContain(res.status);
  });
});
