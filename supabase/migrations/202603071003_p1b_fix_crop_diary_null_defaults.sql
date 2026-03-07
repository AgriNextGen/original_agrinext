-- Fix: Set defaults for health_status and growth_stage on crops table.
-- These columns were added without defaults; new crops inserted from the Crops
-- page never set them, leaving NULL. CropDiary.tsx read NULL, caused a
-- TypeError crash (healthStatusConfig[null].icon) → blank page.

-- 1. Backfill existing NULLs
UPDATE public.crops SET health_status = 'normal'   WHERE health_status IS NULL;
UPDATE public.crops SET growth_stage  = 'seedling' WHERE growth_stage  IS NULL;

-- 2. Set column-level defaults so future inserts are safe
ALTER TABLE public.crops
  ALTER COLUMN health_status SET DEFAULT 'normal',
  ALTER COLUMN growth_stage  SET DEFAULT 'seedling';
