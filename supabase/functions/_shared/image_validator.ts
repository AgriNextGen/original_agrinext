/**
 * Image validation utilities for AgriNext Edge Functions.
 *
 * Validates uploaded images by MIME type, magic bytes, file size,
 * and file name safety before storage.
 *
 * Usage:
 *   import { validateImageFile, sanitizeFileName } from "../_shared/image_validator.ts";
 */

// ── Constants ──────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const UPLOAD_TYPE_BUCKET_MAP: Record<string, string> = {
  crop_photo: "crop-images",
  disease_photo: "disease-images",
  transport_proof: "crop-media",
};

export const VALID_UPLOAD_TYPES = Object.keys(UPLOAD_TYPE_BUCKET_MAP);

// ── Magic bytes for image type sniffing ────────────────────────────────

const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header; bytes 8-11 are WEBP
};

// ── Types ──────────────────────────────────────────────────────────────

export type ImageValidationResult = {
  valid: boolean;
  error?: string;
  detectedType?: string;
};

// ── validateImageFile ──────────────────────────────────────────────────

export function validateImageFile(
  fileBytes: Uint8Array,
  declaredType: string,
  fileSize: number,
): ImageValidationResult {
  if (!declaredType || !ALLOWED_IMAGE_TYPES.includes(declaredType as AllowedImageType)) {
    return {
      valid: false,
      error: `Invalid file type: ${declaredType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  if (fileSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large: ${(fileSize / (1024 * 1024)).toFixed(1)}MB. Maximum: 10MB`,
    };
  }

  if (fileSize === 0 || fileBytes.length === 0) {
    return { valid: false, error: "File is empty" };
  }

  const detectedType = detectImageType(fileBytes);
  if (!detectedType) {
    return {
      valid: false,
      error: "File content does not match any supported image format",
    };
  }

  if (detectedType !== declaredType) {
    return {
      valid: false,
      error: `Content mismatch: declared ${declaredType} but detected ${detectedType}`,
      detectedType,
    };
  }

  return { valid: true, detectedType };
}

// ── detectImageType ────────────────────────────────────────────────────

export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  for (const [mimeType, patterns] of Object.entries(MAGIC_BYTES)) {
    for (const pattern of patterns) {
      if (bytes.length < pattern.length) continue;
      const matches = pattern.every((byte, i) => bytes[i] === byte);
      if (matches) {
        if (mimeType === "image/webp" && bytes.length >= 12) {
          const webpMarker =
            bytes[8] === 0x57 && // W
            bytes[9] === 0x45 && // E
            bytes[10] === 0x42 && // B
            bytes[11] === 0x50;   // P
          if (!webpMarker) continue;
        }
        return mimeType;
      }
    }
  }

  return null;
}

// ── sanitizeFileName ───────────────────────────────────────────────────

export function sanitizeFileName(name: string): string {
  let sanitized = name
    .replace(/\.\./g, "")
    .replace(/[\/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .trim();

  if (!sanitized) sanitized = "upload";
  if (sanitized.length > 100) {
    const ext = sanitized.lastIndexOf(".");
    if (ext > 0) {
      sanitized = sanitized.slice(0, 96) + sanitized.slice(ext);
    } else {
      sanitized = sanitized.slice(0, 100);
    }
  }

  return sanitized;
}

// ── getExtensionForType ────────────────────────────────────────────────

export function getExtensionForType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    default: return "bin";
  }
}
