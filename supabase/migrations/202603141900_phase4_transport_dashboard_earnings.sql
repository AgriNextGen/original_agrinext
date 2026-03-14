-- Phase 4: Transport Dashboard — add earnings columns to unified_trips
-- These columns track estimated and actual earnings per trip for transport partners.

ALTER TABLE public.unified_trips
  ADD COLUMN IF NOT EXISTS estimated_earnings_inr numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_earnings_inr numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN public.unified_trips.estimated_earnings_inr IS 'Estimated earnings for the transport partner (INR)';
COMMENT ON COLUMN public.unified_trips.actual_earnings_inr IS 'Actual settled earnings for the transport partner (INR)';
