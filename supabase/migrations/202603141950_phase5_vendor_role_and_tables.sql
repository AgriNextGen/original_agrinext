-- Phase 5: Vendor Logistics Integration
-- Adds 'vendor' to app_role enum, creates vendors profile table, and RLS policies.

-- 1. Extend app_role enum with 'vendor'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendor';

-- 2. Vendor business profile table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT 'general',
  gst_number text,
  contact_phone text,
  contact_email text,
  address text,
  district_id uuid REFERENCES public.geo_districts(id),
  market_id uuid REFERENCES public.geo_markets(id),
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendors_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select_own"
  ON public.vendors FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "vendors_insert_own"
  ON public.vendors FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vendors_update_own"
  ON public.vendors FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vendors_admin_read"
  ON public.vendors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- 3. RLS policies for vendor access to shipment_requests
CREATE POLICY "shipment_requests_vendor_select"
  ON public.shipment_requests FOR SELECT
  USING (
    request_source_type = 'vendor'
    AND source_actor_id = auth.uid()
  );

CREATE POLICY "shipment_requests_vendor_insert"
  ON public.shipment_requests FOR INSERT
  WITH CHECK (
    request_source_type = 'vendor'
    AND source_actor_id = auth.uid()
  );

CREATE POLICY "shipment_requests_vendor_update"
  ON public.shipment_requests FOR UPDATE
  USING (
    request_source_type = 'vendor'
    AND source_actor_id = auth.uid()
  )
  WITH CHECK (
    request_source_type = 'vendor'
    AND source_actor_id = auth.uid()
  );

-- 4. RLS policies for vendor access to shipment_items
CREATE POLICY "shipment_items_vendor_select"
  ON public.shipment_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_requests sr
      WHERE sr.id = shipment_items.shipment_request_id
        AND sr.request_source_type = 'vendor'
        AND sr.source_actor_id = auth.uid()
    )
  );

CREATE POLICY "shipment_items_vendor_insert"
  ON public.shipment_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipment_requests sr
      WHERE sr.id = shipment_items.shipment_request_id
        AND sr.request_source_type = 'vendor'
        AND sr.source_actor_id = auth.uid()
    )
  );

-- 5. RLS policies for vendor access to reverse_load_candidates
CREATE POLICY "reverse_load_candidates_vendor_select"
  ON public.reverse_load_candidates FOR SELECT
  USING (
    shipment_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shipment_requests sr
      WHERE sr.id = reverse_load_candidates.shipment_request_id
        AND sr.request_source_type = 'vendor'
        AND sr.source_actor_id = auth.uid()
    )
  );

-- 6. RLS for vendor access to shipment_bookings (read own)
CREATE POLICY "shipment_bookings_vendor_select"
  ON public.shipment_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipment_requests sr
      WHERE sr.id = shipment_bookings.shipment_request_id
        AND sr.request_source_type = 'vendor'
        AND sr.source_actor_id = auth.uid()
    )
  );

-- 7. Updated_at trigger for vendors
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
