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

