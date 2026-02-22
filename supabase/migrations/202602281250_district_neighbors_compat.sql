-- Compatibility table for market neighbor lookups used by farmer UI.
-- Minimal, idempotent, and safe to create empty in staging.

CREATE TABLE IF NOT EXISTS public.district_neighbors (
  district text NOT NULL,
  neighbor_district text NOT NULL,
  state text NOT NULL DEFAULT 'Karnataka',
  source text NOT NULL DEFAULT 'compat',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_neighbors_pkey PRIMARY KEY (district, neighbor_district),
  CONSTRAINT district_neighbors_not_self CHECK (district <> neighbor_district)
);

CREATE INDEX IF NOT EXISTS idx_district_neighbors_neighbor_district
  ON public.district_neighbors (neighbor_district);

ALTER TABLE public.district_neighbors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS district_neighbors_select_authenticated ON public.district_neighbors;
CREATE POLICY district_neighbors_select_authenticated
  ON public.district_neighbors
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.district_neighbors TO authenticated;
