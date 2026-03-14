import { supabase } from '@/integrations/supabase/client';

/**
 * Standard API response envelope matching docs/all_imp_rules/API_CONTRACTS.md
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * Call a Supabase RPC and return raw data (legacy pattern).
 * Use `rpcStandard` for the standardized { success, data/error } envelope.
 */
export async function rpcJson(fn: string, params: any = {}): Promise<any> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

/**
 * Call a Supabase RPC and return raw data (legacy pattern).
 * Use `rpcStandard` for the standardized { success, data/error } envelope.
 */
export async function rpcMutate(fn: string, params: any = {}): Promise<any> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) throw error;
  return data;
}

/**
 * Call a Supabase RPC and normalize the response to the standard
 * API contract format: { success: true, data } or { success: false, error }.
 *
 * Maps Supabase SDK errors to the platform error contract defined in
 * docs/all_imp_rules/API_CONTRACTS.md Section 2.
 */
export async function rpcStandard<T = unknown>(
  fn: string,
  params: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await supabase.rpc(fn, params);

    if (error) {
      const code = mapSupabaseErrorCode(error.code);
      return {
        success: false,
        error: {
          code,
          message: error.message,
        },
      };
    }

    return { success: true, data: data as T };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return {
      success: false,
      error: { code: 'INTERNAL', message },
    };
  }
}

function mapSupabaseErrorCode(pgCode: string | undefined): string {
  if (!pgCode) return 'INTERNAL';
  switch (pgCode) {
    case '23505': return 'CONFLICT';
    case '42501': return 'FORBIDDEN';
    case 'PGRST116': return 'NOT_FOUND';
    case 'PGRST301': return 'NOT_FOUND';
    case '23503': return 'VALIDATION_ERROR';
    case '22P02': return 'VALIDATION_ERROR';
    default: return 'INTERNAL';
  }
}

export function makeCursor(updated_at: string | null, id: string | null) {
  if (!updated_at || !id) return null;
  return { updated_at, id };
}

export function parseCursor(cursor: any) {
  if (!cursor) return null;
  return { updated_at: cursor.updated_at, id: cursor.id };
}

