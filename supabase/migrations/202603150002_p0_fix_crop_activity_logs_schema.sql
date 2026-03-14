-- P0 CRITICAL: Add missing columns to crop_activity_logs that the frontend expects.
-- The original schema (202602160100) only had:
--   id, crop_id, activity_type, notes, media_ids (uuid[]), actor_id, created_at
-- useCropDiary.tsx inserts: owner_farmer_id, created_by, creator_role, activity_type,
--   notes, severity, media_id (singular uuid), meta, consent_captured, consent_note, consent_at
-- Every INSERT to crop_activity_logs was failing silently (PostgREST 400 on unknown columns).
-- The frontend also joins media:crop_media(*) via media_id which requires a FK column.

ALTER TABLE public.crop_activity_logs
  ADD COLUMN IF NOT EXISTS owner_farmer_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_role     text,
  ADD COLUMN IF NOT EXISTS activity_at      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS severity         text,
  ADD COLUMN IF NOT EXISTS media_id         uuid REFERENCES public.crop_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meta             jsonb,
  ADD COLUMN IF NOT EXISTS consent_captured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_note     text,
  ADD COLUMN IF NOT EXISTS consent_at       timestamptz;

-- Backfill owner_farmer_id from crops.farmer_id for all existing rows
UPDATE public.crop_activity_logs cal
SET    owner_farmer_id = c.farmer_id
FROM   public.crops c
WHERE  c.id = cal.crop_id
  AND  cal.owner_farmer_id IS NULL;

-- Backfill created_by from actor_id for existing rows
UPDATE public.crop_activity_logs
SET    created_by = actor_id
WHERE  actor_id IS NOT NULL
  AND  created_by IS NULL;

-- Backfill activity_at from created_at for existing rows
UPDATE public.crop_activity_logs
SET    activity_at = created_at
WHERE  activity_at IS NULL OR activity_at = '1970-01-01';

-- Indexes for common filter/sort queries
CREATE INDEX IF NOT EXISTS idx_crop_activity_logs_owner_farmer_id
  ON public.crop_activity_logs(owner_farmer_id);

CREATE INDEX IF NOT EXISTS idx_crop_activity_logs_activity_at
  ON public.crop_activity_logs(activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_crop_activity_logs_media_id
  ON public.crop_activity_logs(media_id) WHERE media_id IS NOT NULL;
