/**
 * preview-all-roles.mjs
 *
 * Gets a real auth token for each dummy account via the Node.js fetch (no CORS
 * restriction), injects the Supabase session directly into the browser's
 * localStorage, then navigates to the role dashboard and screenshots it.
 *
 * This approach avoids Playwright headless Chrome's inability to reach the
 * Supabase edge runtime directly — credentials are confirmed valid via the
 * separate verify-login.mjs script.
 *
 * Usage:  node scripts/staging/preview-all-roles.mjs
 * Output: output/playwright/role-<roleName>.png
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

const BASE_URL    = "http://localhost:5173";
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/^"|"$/g, "");
const ANON_KEY    = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").replace(/^"|"$/g, "");
const OUT_DIR     = path.resolve("output/playwright");
fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCOUNTS = [
  { phone: "+919900000101", role: "farmer",    name: "Basavaraju Gowda",  dashboard: "/farmer/dashboard"      },
  { phone: "+919900000102", role: "agent",     name: "Shwetha Kumar",     dashboard: "/agent/dashboard"       },
  { phone: "+919900000103", role: "logistics", name: "Manjunath N",       dashboard: "/logistics/dashboard"   },
  { phone: "+919900000104", role: "buyer",     name: "Ayesha Fathima",    dashboard: "/marketplace/dashboard" },
  { phone: "+919900000105", role: "admin",     name: "Raghavendra S",     dashboard: "/admin/dashboard"       },
];
const PASSWORD = "Dummy@12345";

// ─── Step 1: get real tokens for each account via Node.js (no CORS) ──────────

async function fetchToken(phone) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/login-by-phone`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`login-by-phone returned HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return { access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in ?? 3600 };
}

// ─── Step 2: inject session into browser localStorage ────────────────────────

async function injectSession(page, tokens, supabaseProjectRef) {
  const storageKey = `sb-${supabaseProjectRef}-auth-token`;
  const sessionObj = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: "bearer",
    expires_in: tokens.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
  };
  await page.evaluate(
    ({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); },
    { key: storageKey, value: sessionObj }
  );
}

// ─── Step 3: navigate and screenshot ─────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runAccount(browser, account, tokens, projectRef) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-IN" });
  const page = await context.newPage();

  try {
    // Open the app root first (needed to set localStorage on the right origin)
    await page.goto(BASE_URL, { waitUntil: "commit" });
    await injectSession(page, tokens, projectRef);
    console.log(`  Session injected into localStorage`);

    // Navigate to the role dashboard
    await page.goto(`${BASE_URL}${account.dashboard}`, { waitUntil: "networkidle", timeout: 20000 });
    console.log(`  Navigated to: ${page.url()}`);

    // Wait for loading state ("Setting up your account...") to resolve
    const deadline = Date.now() + 18000;
    while (Date.now() < deadline) {
      const isReady = await page.evaluate(() => {
        const txt = document.body?.innerText ?? "";
        const spinning = document.querySelectorAll(".animate-spin").length;
        return !txt.includes("Setting up your account") && spinning === 0;
      }).catch(() => false);
      if (isReady) break;
      await sleep(400);
    }
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await sleep(1500);

    const finalUrl = page.url();
    const screenshotPath = path.join(OUT_DIR, `role-${account.role}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  ✅ Screenshot: ${screenshotPath}`);
    return { ok: true, url: finalUrl, screenshotPath };

  } catch (err) {
    const screenshotPath = path.join(OUT_DIR, `role-${account.role}-error.png`);
    await page.screenshot({ path: screenshotPath }).catch(() => {});
    console.log(`  ❌ ${err.message.split("\n")[0]}`);
    return { ok: false, url: page.url(), error: err.message.split("\n")[0], screenshotPath };
  } finally {
    await context.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(62));
  console.log("AgriNext Gen — All-Role Dashboard Preview");
  console.log("=".repeat(62));

  // Extract project ref from SUPABASE_URL (e.g. "rmtkkzfzdmpjlqexrbme")
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
  console.log(`Supabase project: ${projectRef}`);
  console.log(`App:              ${BASE_URL}\n`);

  // Phase 1: Get all tokens via Node.js
  console.log("Phase 1 — Obtaining auth tokens via Node.js...\n");
  const tokenMap = new Map();
  for (const acc of ACCOUNTS) {
    process.stdout.write(`  [${acc.role.padEnd(10)}] ${acc.phone}  →  `);
    try {
      const tokens = await fetchToken(acc.phone);
      tokenMap.set(acc.role, tokens);
      console.log(`token obtained (expires in ${tokens.expires_in}s)`);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  // Phase 2: Browser screenshots
  console.log("\nPhase 2 — Browser screenshots...\n");
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const acc of ACCOUNTS) {
    console.log(`[${acc.role.padEnd(10)}] ${acc.name}`);
    const tokens = tokenMap.get(acc.role);
    if (!tokens) {
      console.log("  ⚠  Skipped — no token\n");
      results.push({ ...acc, ok: false, error: "no token" });
      continue;
    }
    const result = await runAccount(browser, acc, tokens, projectRef);
    results.push({ ...acc, ...result });
    console.log();
  }

  await browser.close();

  // Summary
  console.log("=".repeat(62));
  console.log("SUMMARY");
  console.log("=".repeat(62));
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon}  [${r.role.padEnd(10)}]  ${r.name.padEnd(22)}  →  ${r.ok ? r.url : r.error}`);
    console.log(`     ${r.screenshotPath}`);
  }

  const ok = results.filter(r => r.ok).length;
  console.log(`\n${ok}/${results.length} dashboards captured.`);

  if (ok < results.length) process.exit(1);
}

main().catch(err => {
  console.error("preview-all-roles failed:", err.message);
  process.exit(1);
});
