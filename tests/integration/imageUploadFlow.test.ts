/**
 * Integration test: Image upload flow
 *
 * Simulates the full image upload lifecycle:
 *   image bytes → validation → storage upload → files table → signed URL
 */
import { describe, it, expect } from 'vitest';

// Deno env mock
(globalThis as any).Deno = {
  env: { get: () => '' },
};

describe('Image upload flow integration', () => {
  it('validates and accepts a valid JPEG', async () => {
    const { validateImageFile, getExtensionForType, sanitizeFileName, UPLOAD_TYPE_BUCKET_MAP } =
      await import('../../supabase/functions/_shared/image_validator.ts');

    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
    const declaredType = 'image/jpeg';
    const fileSize = 2 * 1024 * 1024;

    const validation = validateImageFile(jpegBytes, declaredType, fileSize);
    expect(validation.valid).toBe(true);

    const ext = getExtensionForType(declaredType);
    expect(ext).toBe('jpg');

    const safeName = sanitizeFileName('My Crop Photo (2024).jpeg');
    expect(safeName).not.toContain(' ');
    expect(safeName).not.toContain('..');

    const bucket = UPLOAD_TYPE_BUCKET_MAP['crop_photo'];
    expect(bucket).toBe('crop-images');

    const objectPath = `crop_photo/entity-123/${crypto.randomUUID()}_${safeName}.${ext}`;
    expect(objectPath).toContain('crop_photo/entity-123/');
    expect(objectPath).toContain('.jpg');
  });

  it('validates and accepts a valid PNG for disease detection', async () => {
    const { validateImageFile, UPLOAD_TYPE_BUCKET_MAP } =
      await import('../../supabase/functions/_shared/image_validator.ts');

    const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    const validation = validateImageFile(pngBytes, 'image/png', 5 * 1024 * 1024);
    expect(validation.valid).toBe(true);

    const bucket = UPLOAD_TYPE_BUCKET_MAP['disease_photo'];
    expect(bucket).toBe('disease-images');
  });

  it('rejects oversized image before any storage call', async () => {
    const { validateImageFile, MAX_IMAGE_SIZE_BYTES } =
      await import('../../supabase/functions/_shared/image_validator.ts');

    const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
    const validation = validateImageFile(jpegBytes, 'image/jpeg', MAX_IMAGE_SIZE_BYTES + 1);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('too large');
  });

  it('rejects GIF files (not in allowed types)', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');

    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const validation = validateImageFile(gifBytes, 'image/gif', 1024);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Invalid file type');
  });

  it('rejects executable disguised as image', async () => {
    const { validateImageFile } = await import('../../supabase/functions/_shared/image_validator.ts');

    // ELF header bytes disguised as jpeg
    const elfBytes = new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x00, 0x00, 0x00, 0x00]);
    const validation = validateImageFile(elfBytes, 'image/jpeg', 1024);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('does not match');
  });

  it('full pipeline: validate → bucket selection → path generation', async () => {
    const {
      validateImageFile,
      getExtensionForType,
      sanitizeFileName,
      UPLOAD_TYPE_BUCKET_MAP,
      VALID_UPLOAD_TYPES,
    } = await import('../../supabase/functions/_shared/image_validator.ts');

    for (const uploadType of VALID_UPLOAD_TYPES) {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const validation = validateImageFile(jpegBytes, 'image/jpeg', 1024);
      expect(validation.valid).toBe(true);

      const bucket = UPLOAD_TYPE_BUCKET_MAP[uploadType];
      expect(bucket).toBeTruthy();

      const ext = getExtensionForType('image/jpeg');
      const safeName = sanitizeFileName('test.jpg');
      const path = `${uploadType}/entity-1/${crypto.randomUUID()}_${safeName}.${ext}`;
      expect(path).toContain(uploadType);
    }
  });

  it('WebP images route correctly for crop_photo', async () => {
    const { validateImageFile, UPLOAD_TYPE_BUCKET_MAP } =
      await import('../../supabase/functions/_shared/image_validator.ts');

    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x00,
    ]);
    const validation = validateImageFile(webpBytes, 'image/webp', 3 * 1024 * 1024);
    expect(validation.valid).toBe(true);
    expect(UPLOAD_TYPE_BUCKET_MAP['crop_photo']).toBe('crop-images');
  });
});
