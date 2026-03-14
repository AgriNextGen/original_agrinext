/**
 * Unit tests for supabase/functions/_shared/image_validator.ts
 *
 * Tests image validation (type, size, magic bytes) and file name sanitization.
 */
import { describe, it, expect } from 'vitest';

// Deno env mock (needed by transitive imports)
(globalThis as any).Deno = {
  env: { get: () => '' },
};

describe('validateImageFile', () => {
  it('accepts valid JPEG file', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = validateImageFile(jpegBytes, 'image/jpeg', 1024);

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/jpeg');
  });

  it('accepts valid PNG file', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    const result = validateImageFile(pngBytes, 'image/png', 2048);

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/png');
  });

  it('accepts valid WebP file', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    // RIFF....WEBP
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x00,
    ]);
    const result = validateImageFile(webpBytes, 'image/webp', 3072);

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/webp');
  });

  it('rejects disallowed MIME type', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = validateImageFile(new Uint8Array([0x00]), 'application/pdf', 1024);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('rejects file exceeding 10MB', async () => {
    const { validateImageFile, MAX_IMAGE_SIZE_BYTES } = await import('../../supabase/functions/_shared/image_validator.ts');
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const result = validateImageFile(jpegBytes, 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('File too large');
  });

  it('rejects empty file', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = validateImageFile(new Uint8Array([]), 'image/jpeg', 0);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects content mismatch (declares JPEG but is PNG)', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = validateImageFile(pngBytes, 'image/jpeg', 1024);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Content mismatch');
    expect(result.detectedType).toBe('image/png');
  });

  it('rejects file with unrecognized magic bytes', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');
    const randomBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const result = validateImageFile(randomBytes, 'image/jpeg', 1024);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not match');
  });

  it('accepts file at exactly 10MB boundary', async () => {
    const { validateImageFile, MAX_IMAGE_SIZE_BYTES } = await import('../../supabase/functions/_shared/image_validator.ts');
    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const result = validateImageFile(jpegBytes, 'image/jpeg', MAX_IMAGE_SIZE_BYTES);

    expect(result.valid).toBe(true);
  });
});

describe('detectImageType', () => {
  it('detects JPEG from magic bytes', async () => {
    const { detectImageType } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(detectImageType(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE1]))).toBe('image/jpeg');
  });

  it('detects PNG from magic bytes', async () => {
    const { detectImageType } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))).toBe('image/png');
  });

  it('returns null for too-short input', async () => {
    const { detectImageType } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(detectImageType(new Uint8Array([0xFF]))).toBeNull();
  });

  it('returns null for unknown format', async () => {
    const { detectImageType } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(detectImageType(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))).toBeNull();
  });
});

describe('sanitizeFileName', () => {
  it('strips path traversal characters', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(sanitizeFileName('../../../etc/passwd')).not.toContain('..');
    expect(sanitizeFileName('../../../etc/passwd')).not.toContain('/');
  });

  it('replaces spaces with underscores', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(sanitizeFileName('my photo 2024.jpg')).toBe('my_photo_2024.jpg');
  });

  it('strips special characters', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = sanitizeFileName('file<name>with:special*chars?.jpg');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain(':');
    expect(result).not.toContain('*');
    expect(result).not.toContain('?');
  });

  it('returns "upload" for empty string', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(sanitizeFileName('')).toBe('upload');
  });

  it('truncates very long names preserving extension', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    const longName = 'a'.repeat(200) + '.jpg';
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(104);
    expect(result).toContain('.jpg');
  });

  it('strips leading dots and underscores', async () => {
    const { sanitizeFileName } = await import('../../supabase/functions/_shared/image_validator.ts');
    const result = sanitizeFileName('..._hidden_file.jpg');
    expect(result[0]).not.toBe('.');
    expect(result[0]).not.toBe('_');
  });
});

describe('getExtensionForType', () => {
  it('returns correct extensions', async () => {
    const { getExtensionForType } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(getExtensionForType('image/jpeg')).toBe('jpg');
    expect(getExtensionForType('image/png')).toBe('png');
    expect(getExtensionForType('image/webp')).toBe('webp');
    expect(getExtensionForType('application/octet-stream')).toBe('bin');
  });
});

describe('constants', () => {
  it('exports valid upload types and bucket map', async () => {
    const { VALID_UPLOAD_TYPES, UPLOAD_TYPE_BUCKET_MAP } = await import('../../supabase/functions/_shared/image_validator.ts');
    expect(VALID_UPLOAD_TYPES).toContain('crop_photo');
    expect(VALID_UPLOAD_TYPES).toContain('disease_photo');
    expect(VALID_UPLOAD_TYPES).toContain('transport_proof');
    expect(UPLOAD_TYPE_BUCKET_MAP['crop_photo']).toBe('crop-images');
    expect(UPLOAD_TYPE_BUCKET_MAP['disease_photo']).toBe('disease-images');
    expect(UPLOAD_TYPE_BUCKET_MAP['transport_proof']).toBe('crop-media');
  });
});
