-- Add profile_id columns to domain tables and conservative backfills
ALTER TABLE public.crops ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.farmlands ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.transport_requests ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.market_orders ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.user_profiles(id);

-- Conservative backfill example for crops where farmer_id exists
UPDATE public.crops c
SET profile_id = p.id
FROM public.user_profiles p
WHERE c.farmer_id = p.user_id AND p.profile_type = 'farmer' AND c.profile_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_crops_profile_id ON public.crops(profile_id);

