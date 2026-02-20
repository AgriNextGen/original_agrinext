/**
 * Normalize Indian phone number to E.164 format (+91XXXXXXXXXX).
 * Handles: 9876543210, 919876543210, +919876543210
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits.length >= 10 ? `+91${digits.slice(-10)}` : "";
}

/**
 * Get synthetic auth email for Supabase when user does not provide email.
 * Format: 919876543210@agrinext.local (digits only, no +)
 */
export function getAuthEmailFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
  return `${normalized}@agrinext.local`;
}
