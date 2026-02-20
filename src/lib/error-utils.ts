/**
 * Error utility functions for consistent error handling across the app
 */

/**
 * Extract a user-friendly error message from various error types
 * Handles Supabase errors, Edge Function errors, and generic JS errors
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle Error objects
  if (error instanceof Error) {
    // Check for Supabase-specific error properties
    const supaError = error as { code?: string; details?: string; hint?: string; message: string };
    
    // Handle specific Supabase error codes
    if (supaError.code === 'PGRST116') {
      return 'No matching record found';
    }
    if (supaError.code === '23505') {
      return 'This record already exists';
    }
    if (supaError.code === '42501' || supaError.message?.includes('row-level security')) {
      return 'You don\'t have permission to perform this action';
    }
    
    // Return the message with hint if available
    if (supaError.hint) {
      return `${supaError.message} (${supaError.hint})`;
    }
    
    return supaError.message;
  }

  // Handle objects with error/message properties
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.msg === 'string') return obj.msg;
    
    // Handle nested error object
    if (obj.error && typeof obj.error === 'object') {
      const nestedError = obj.error as Record<string, unknown>;
      if (typeof nestedError.message === 'string') return nestedError.message;
    }
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Create a retry toast action
 */
export function createRetryAction(retryFn: () => void) {
  return {
    label: 'Retry',
    onClick: retryFn,
  };
}

/**
 * File size validation
 */
export const FILE_SIZE_LIMITS = {
  IMAGE_MAX_MB: 15,
  IMAGE_COMPRESS_TARGET_MB: 2,
  PDF_MAX_MB: 10,
} as const;

export function validateFileSize(file: File, maxMB: number): { valid: boolean; message?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    return {
      valid: false,
      message: `File too large. Maximum size is ${maxMB}MB (your file: ${sizeMB.toFixed(1)}MB)`,
    };
  }
  return { valid: true };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}
