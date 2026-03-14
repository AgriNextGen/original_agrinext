/**
 * API response types for AgriNext Edge Functions and RPC calls.
 *
 * These supplement the auto-generated `src/integrations/supabase/types.ts`.
 * Use these for Edge Function request/response shapes and RPC return types.
 *
 * Standard Edge Function response envelope:
 *   { success: true, data: T }
 *   { success: false, error: string, code: string }
 */

// ---------------------------------------------------------------------------
// Standard response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface SignupResponse {
  user_id: string;
  role: string;
}

export interface LoginResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    token_type: string;
  };
  user: {
    id: string;
    email: string;
  };
}

// ---------------------------------------------------------------------------
// Dev tools
// ---------------------------------------------------------------------------

export interface DevActiveRoleResponse {
  role: string;
  isDevOverride: boolean;
}

export interface DevSwitchRoleResponse {
  activeRole: string;
  switchedAt: string;
}

// ---------------------------------------------------------------------------
// AI Gateway
// ---------------------------------------------------------------------------

export interface AiGatewayResponse {
  text: string;
  audio_url?: string;
  language: string;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export interface SignedUploadResponse {
  signed_url: string;
  token: string;
  path: string;
}

// ---------------------------------------------------------------------------
// Transport / Trip
// ---------------------------------------------------------------------------

export interface AcceptLoadResponse {
  trip_id: string;
}

export interface TripStatusUpdateResponse {
  trip_id: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface CreatePaymentOrderResponse {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

// ---------------------------------------------------------------------------
// Admin / Jobs
// ---------------------------------------------------------------------------

export interface JobEnqueueResponse {
  job_id: string;
}

export interface JobsSummaryResponse {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  last_processed_at: string | null;
}
