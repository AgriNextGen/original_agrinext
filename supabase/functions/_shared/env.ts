/**
 * Safe environment variable helpers for Deno Edge Functions.
 *
 * Usage:
 *   const apiKey = getRequiredEnv("GEMINI_API_KEY");   // throws EnvError if missing
 *   const secret = getOptionalEnv("DEV_TOOLS_SECRET"); // returns null if missing
 *
 * Set secrets in Supabase Dashboard → Project Settings → Edge Functions → Secrets.
 */
export class EnvError extends Error {
  code: "missing_secret" = "missing_secret";
  secret: string;
  constructor(name: string) {
    super(`Required secret "${name}" is not set`);
    this.secret = name;
    this.name = "EnvError";
  }
}

export function getRequiredEnv(name: string): string {
  const val = Deno.env.get(name);
  if (!val || val.length === 0) {
    throw new EnvError(name);
  }
  return val;
}

export function getOptionalEnv(name: string): string | null {
  const val = Deno.env.get(name);
  return val && val.length > 0 ? val : null;
}

