-- Phase 6: Logistics Recommendation Engine
-- Adds vehicle_recommendations table for storing ranked vehicle-pool matches.
-- Recommendations are decision-support only — trip creation requires explicit human acceptance.

-- 1. Recommendation status enum
DO $$ BEGIN
  CREATE TYPE public.recommendation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Vehicle recommendations table
CREATE TABLE IF NOT EXISTS public.vehicle_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_pool_id uuid NOT NULL REFERENCES public.load_pools(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  transporter_id uuid NOT NULL REFERENCES auth.users(id),

  capacity_fit_score numeric(5,2) NOT NULL DEFAULT 0,
  route_match_score numeric(5,2) NOT NULL DEFAULT 0,
  price_score numeric(5,2) NOT NULL DEFAULT 0,
  reliability_score numeric(5,2) NOT NULL DEFAULT 0,
  reverse_load_score numeric(5,2) NOT NULL DEFAULT 0,
  recommendation_score numeric(5,2) NOT NULL DEFAULT 0,

  estimated_price_inr numeric(10,2),
  distance_to_pickup_km numeric(8,2),
  pool_weight_kg numeric(10,2),
  vehicle_capacity_kg numeric(10,2),

  status public.recommendation_status NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  generated_trip_id uuid REFERENCES public.unified_trips(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vehicle_recommendations_unique_pool_vehicle UNIQUE (load_pool_id, vehicle_id)
);

ALTER TABLE public.vehicle_recommendations ENABLE ROW LEVEL SECURITY;

-- Transport partners see recommendations for their own vehicles
CREATE POLICY "vehicle_recommendations_transporter_select"
  ON public.vehicle_recommendations FOR SELECT
  USING (transporter_id = auth.uid());

-- Admin sees all recommendations
CREATE POLICY "vehicle_recommendations_admin_select"
  ON public.vehicle_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Transport partners can update status on their own recommendations
CREATE POLICY "vehicle_recommendations_transporter_update"
  ON public.vehicle_recommendations FOR UPDATE
  USING (transporter_id = auth.uid())
  WITH CHECK (transporter_id = auth.uid());

-- Service role inserts (via internal API)
CREATE POLICY "vehicle_recommendations_service_insert"
  ON public.vehicle_recommendations FOR INSERT
  WITH CHECK (true);

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_pool_score
  ON public.vehicle_recommendations (load_pool_id, recommendation_score DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_vehicle_status
  ON public.vehicle_recommendations (vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicle_recommendations_transporter_pending
  ON public.vehicle_recommendations (transporter_id, status)
  WHERE status = 'pending';

-- 4. Updated_at trigger
CREATE TRIGGER trg_vehicle_recommendations_updated_at
  BEFORE UPDATE ON public.vehicle_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Add recommendations_generated column to matching_runs for tracking
ALTER TABLE public.matching_runs
  ADD COLUMN IF NOT EXISTS recommendations_generated integer NOT NULL DEFAULT 0;
