-- P0 CRITICAL: Add missing columns to crop_media that the frontend expects.
-- The original schema (202602160100) only had: id, crop_id, file_path, file_type, captured_at, created_at
-- Phase D (202602250003) added: file_id, uploaded_by
-- The useCropDiary.tsx hook inserts: owner_farmer_id, uploader_role, file_path, mime_type,
-- caption, tags, latitude, longitude, geo_verified — none of these existed.
-- Every crop photo upload was failing silently (PostgREST returns 400 on unknown INSERT columns).

ALTER TABLE public.crop_media
  ADD COLUMN IF NOT EXISTS owner_farmer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploader_role   text,
  ADD COLUMN IF NOT EXISTS mime_type       text,
  ADD COLUMN IF NOT EXISTS caption         text,
  ADD COLUMN IF NOT EXISTS tags            text[],
  ADD COLUMN IF NOT EXISTS latitude        numeric,
  ADD COLUMN IF NOT EXISTS longitude       numeric,
  ADD COLUMN IF NOT EXISTS geo_verified    boolean NOT NULL DEFAULT false;

-- Backfill owner_farmer_id from crops.farmer_id for all existing rows
UPDATE public.crop_media cm
SET    owner_farmer_id = c.farmer_id
FROM   public.crops c
WHERE  c.id = cm.crop_id
  AND  cm.owner_farmer_id IS NULL;

-- Backfill mime_type from file_type for rows that have file_type set
UPDATE public.crop_media
SET    mime_type = file_type
WHERE  file_type IS NOT NULL
  AND  mime_type IS NULL;

-- Index for the .eq('owner_farmer_id', user.id) filter used in useCropMedia
CREATE INDEX IF NOT EXISTS idx_crop_media_owner_farmer_id
  ON public.crop_media(owner_farmer_id);
