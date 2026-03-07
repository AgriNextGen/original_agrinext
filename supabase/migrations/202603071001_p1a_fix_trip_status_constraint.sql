-- =============================================================
-- Phase 1A Migration 1: Fix trips status CHECK constraint
-- Aligns public.trips.status with canonical Phase 2 values.
-- =============================================================

BEGIN;

-- Some environments enforce status updates through trigger-only RPC paths.
-- Temporarily disable user triggers for this one-time status backfill.
ALTER TABLE public.trips DISABLE TRIGGER USER;

-- Ensure future rows default to canonical initial state.
ALTER TABLE public.trips
  ALTER COLUMN status SET DEFAULT 'created';

-- Drop old constraint first so remap targets are valid during update.
ALTER TABLE public.trips
  DROP CONSTRAINT IF EXISTS trips_status_check;

-- Migrate existing rows from legacy Phase C4 values.
UPDATE public.trips SET status = 'accepted'    WHERE status = 'assigned';
UPDATE public.trips SET status = 'pickup_done' WHERE status = 'picked_up';
UPDATE public.trips SET status = 'pickup_done' WHERE status = 'arrived';
UPDATE public.trips SET status = 'in_transit'  WHERE status = 'en_route';
UPDATE public.trips SET status = 'cancelled'   WHERE status = 'issue';
UPDATE public.trips SET status = 'completed'   WHERE status = 'closed';

-- Add canonical Phase 2 constraint.
ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN (
    'created',
    'accepted',
    'pickup_done',
    'in_transit',
    'delivered',
    'completed',
    'cancelled'
  ));

ALTER TABLE public.trips ENABLE TRIGGER USER;

COMMIT;
