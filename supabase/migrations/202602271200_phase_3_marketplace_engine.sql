-- Phase 3: Marketplace + Buyer Engine (additive)
-- File: supabase/migrations/202602271200_phase_3_marketplace_engine.sql

-- 1) Ensure status enums / check values (safe: create types or add values)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('draft','submitted','approved','rejected','paused','sold_out','archived');
  ELSE
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'draft'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'submitted'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'approved'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'paused'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'sold_out'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'archived'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('placed','confirmed','rejected','packed','ready_for_pickup','delivered','cancelled');
  ELSE
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'placed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'packed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cancelled'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 2) Add listing columns (additive)
ALTER TABLE IF EXISTS public.listings
  ADD COLUMN IF NOT EXISTS status listing_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS available_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS farmer_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF to_regclass('public.listings') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.listings ADD CONSTRAINT listings_farmer_fk FOREIGN KEY (farmer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 3) Add market_orders table (additive)
CREATE TABLE IF NOT EXISTS public.market_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  qty numeric NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  total_amount numeric(14,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'placed',
  proof_file_id uuid NULL,
  cancelled_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.market_orders
  ADD COLUMN IF NOT EXISTS proof_file_id uuid;

DO $$
BEGIN
  IF to_regclass('public.listings') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.market_orders ADD CONSTRAINT mo_listing_fk FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE RESTRICT;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.market_orders ADD CONSTRAINT mo_buyer_fk FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- Add proof FK if files exist
DO $$
BEGIN
  IF to_regclass('public.files') IS NOT NULL THEN
    BEGIN ALTER TABLE public.market_orders ADD CONSTRAINT mo_proof_file_fk FOREIGN KEY (proof_file_id) REFERENCES public.files(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$ LANGUAGE plpgsql;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status_farmer ON public.listings (status, farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_available_qty ON public.listings (available_qty);
CREATE INDEX IF NOT EXISTS idx_market_orders_buyer_status ON public.market_orders (buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_market_orders_listing ON public.market_orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_status_created ON public.market_orders (status, created_at DESC);

-- 5) RLS: enable tables
ALTER TABLE IF EXISTS public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_orders ENABLE ROW LEVEL SECURITY;

-- 6) RLS policies
DROP POLICY IF EXISTS listings_select_public ON public.listings;
CREATE POLICY listings_select_public ON public.listings
  FOR SELECT USING (
    (status = 'approved' AND auth.role() IS NOT NULL) OR is_admin() OR (auth.uid() IS NOT NULL AND farmer_id::text = auth.uid()::text)
  );

DROP POLICY IF EXISTS listings_insert_farmer ON public.listings;
CREATE POLICY listings_insert_farmer ON public.listings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'farmer'));

DROP POLICY IF EXISTS listings_update_rpc_or_owner_or_admin ON public.listings;
CREATE POLICY listings_update_rpc_or_owner_or_admin ON public.listings
  FOR UPDATE USING (is_admin() OR (auth.uid() IS NOT NULL AND farmer_id::text = auth.uid()::text)) WITH CHECK (is_admin() OR current_setting('app.rpc','false') = 'true' OR farmer_id::text = auth.uid()::text);

DROP POLICY IF EXISTS orders_select_owner_farmer_admin ON public.market_orders;
CREATE POLICY orders_select_owner_farmer_admin ON public.market_orders
  FOR SELECT USING (
    is_admin()
    OR (auth.uid() IS NOT NULL AND buyer_id::text = auth.uid()::text)
    OR (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.farmer_id::text = auth.uid()::text))
  );

DROP POLICY IF EXISTS orders_insert_rpc_or_buyer ON public.market_orders;
CREATE POLICY orders_insert_rpc_or_buyer ON public.market_orders
  FOR INSERT WITH CHECK (current_setting('app.rpc','false') = 'true' OR (auth.uid() IS NOT NULL AND buyer_id::text = auth.uid()::text));

DROP POLICY IF EXISTS orders_update_rpc_or_admin ON public.market_orders;
CREATE POLICY orders_update_rpc_or_admin ON public.market_orders
  FOR UPDATE USING (is_admin()) WITH CHECK (current_setting('app.rpc','false') = 'true' OR is_admin());

-- 7) updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at_marketplace() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_touch ON public.listings;
CREATE TRIGGER trg_listings_touch BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_marketplace();

DROP TRIGGER IF EXISTS trg_market_orders_touch ON public.market_orders;
CREATE TRIGGER trg_market_orders_touch BEFORE UPDATE ON public.market_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_marketplace();

-- End migration
