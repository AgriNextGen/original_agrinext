import { z } from "zod";

export const AppRoleSchema = z.enum(["farmer", "agent", "logistics", "buyer", "admin"]);

export const SignupErrorCodeSchema = z.enum([
  "PHONE_ALREADY_EXISTS",
  "EMAIL_ALREADY_EXISTS",
  "ROLE_CLOSED",
  "SIGNUP_DISABLED",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
  "INTERNAL",
]);

export const SignupByPhoneRequestSchema = z.object({
  role: AppRoleSchema,
  phone: z.string().min(10),
  password: z.string().min(8),
  full_name: z.string().min(2),
  email: z.string().email().optional(),
  profile_metadata: z.object({
    village: z.string().optional(),
    district: z.string().optional(),
    preferred_language: z.string().optional(),
  }).optional(),
});

export const SignupByPhoneResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    user_id: z.string().uuid(),
    role: AppRoleSchema,
    phone: z.string(),
    auth_email: z.string().email(),
    dashboard_route: z.string().startsWith("/"),
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_in: z.number().int().positive(),
    request_id: z.string().min(1),
  }),
  z.object({
    ok: z.literal(false),
    error_code: SignupErrorCodeSchema,
    message: z.string().min(1),
    request_id: z.string().optional(),
  }),
]);

export const CreateDummyUserRequestSchema = z.object({
  role: AppRoleSchema,
  phone: z.string().min(10),
  password: z.string().min(8),
  full_name: z.string().min(2),
  dashboard_path: z.string().startsWith("/"),
  profile_metadata: z.object({
    village: z.string().optional(),
    district: z.string().optional(),
    preferred_language: z.string().optional(),
  }).default({}),
});

export const SeedProfileDataRequestSchema = z.object({
  demo_tag: z.string().regex(/^dummy_\d{8}_\d{4}$/, "demo_tag must look like dummy_YYYYMMDD_HHMM"),
  users: z.array(z.object({
    user_id: z.string().uuid(),
    role: AppRoleSchema,
    phone: z.string().min(10),
  })).min(1),
  richness: z.enum(["minimal", "standard", "rich"]).default("rich"),
});

export const SmokeTestStepSchema = z.object({
  role: AppRoleSchema.or(z.literal("shared")),
  step: z.string(),
  ok: z.boolean(),
  status: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const SmokeTestResultSchema = z.object({
  executed_at: z.string(),
  demo_tag: z.string(),
  project_url: z.string().url(),
  summary: z.object({
    total_steps: z.number().int().nonnegative(),
    passed_steps: z.number().int().nonnegative(),
    failed_steps: z.number().int().nonnegative(),
  }),
  steps: z.array(SmokeTestStepSchema),
  evidence: z.object({
    signup: z.array(z.object({
      role: AppRoleSchema,
      phone: z.string(),
      email: z.string().email(),
      user_id: z.string().uuid().nullable(),
      status: z.number(),
      ok: z.boolean(),
      note: z.string().nullable().optional(),
    })).optional(),
    role_matrix: z.record(AppRoleSchema, z.object({
      login_ok: z.boolean(),
      session_ok: z.boolean(),
      rpc_ok: z.boolean(),
      status_codes: z.array(z.number()).default([]),
    })).optional(),
  }).optional(),
});

export function validateSchema(schema, payload, label) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const reason = parsed.error.issues.map((item) => `${item.path.join(".")}: ${item.message}`).join("; ");
    throw new Error(`${label} schema validation failed: ${reason}`);
  }
  return parsed.data;
}
