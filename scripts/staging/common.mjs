import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

export function requireEnv(name, fallback = null) {
  const value = process.env[name] ?? (fallback ? process.env[fallback] : undefined);
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}${fallback ? ` (or ${fallback})` : ""}`);
  }
  return String(value).trim();
}

export function getSupabaseConfig() {
  const url = requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL").replace(/^"|"$/g, "");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY").replace(/^"|"$/g, "");
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").replace(/^"|"$/g, "");
  return { url, serviceRoleKey, anonKey };
}

export function assertStagingEnvironment() {
  const { url } = getSupabaseConfig();
  let hostname = "";
  let projectRef = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
    projectRef = hostname.split(".")[0] ?? "";
  } catch (_err) {
    throw new Error(`Invalid SUPABASE_URL: ${url}`);
  }

  const envAllowedRefs = (process.env.STAGING_ALLOWED_REFS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const envAllowedHosts = (process.env.STAGING_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const defaultAllowedRefs = ["rmtkkzfzdmpjlqexrbme"];

  const isStageLikeName = /(staging|stage|dev|test|sandbox)/i.test(hostname);
  const isAllowedRef = [...defaultAllowedRefs, ...envAllowedRefs].includes(projectRef);
  const isAllowedHost = envAllowedHosts.includes(hostname);
  const allowUnsafe = process.env.ALLOW_NON_STAGING === "true" || hasFlag("--allow-non-staging");

  if (!(isStageLikeName || isAllowedRef || isAllowedHost || allowUnsafe)) {
    throw new Error(
      `Refusing to run on non-staging project (${hostname}). Set STAGING_ALLOWED_REFS/hosts or ALLOW_NON_STAGING=true to override.`,
    );
  }

  return { hostname, projectRef, allowUnsafe };
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createAnonClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!anonKey) {
    throw new Error("Missing anon key: SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY");
  }
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function nowIsoCompact() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

export function generateDemoTag(prefix = "dummy") {
  return `${prefix}_${nowIsoCompact()}`;
}

export function normalizePhone(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length > 10) return `+91${digits.slice(-10)}`;
  throw new Error(`Invalid phone: ${raw}`);
}

export function authEmailFromPhone(phone) {
  const normalized = normalizePhone(phone);
  return `${normalized.replace(/\D/g, "")}@agrinext.local`;
}

export function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJsonFile(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function argValue(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

export function hasFlag(flag) {
  return process.argv.includes(flag);
}

export function shortId(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 10);
}

export async function fetchWithAuth(url, key, options = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };
  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);
  return { response, body };
}

export async function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
  return result.data;
}
