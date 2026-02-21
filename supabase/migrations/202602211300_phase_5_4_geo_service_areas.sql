-- Phase 5.4: Geography + Service Coverage + Smart Assignments
-- Additive only. Does NOT weaken RLS. Does NOT break existing flows.

-- ============================================================
-- 1.1  Geo reference tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.geo_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_local text NULL,
  iso_code text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_geo_states_name UNIQUE (name_en)
);

CREATE TABLE IF NOT EXISTS public.geo_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.geo_states(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_local text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_geo_districts_state_name UNIQUE (state_id, name_en)
);
CREATE INDEX IF NOT EXISTS idx_geo_districts_state ON public.geo_districts(state_id, name_en);

CREATE TABLE IF NOT EXISTS public.geo_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.geo_districts(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_local text NULL,
  market_type text NOT NULL DEFAULT 'APMC'
    CHECK (market_type IN ('APMC','private','other')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_geo_markets_district_name UNIQUE (district_id, name_en)
);
CREATE INDEX IF NOT EXISTS idx_geo_markets_district ON public.geo_markets(district_id, name_en);

-- RLS: reference data readable by all authenticated; writable by admin only
ALTER TABLE public.geo_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY geo_states_select ON public.geo_states FOR SELECT USING (true);
CREATE POLICY geo_states_admin_insert ON public.geo_states FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY geo_states_admin_update ON public.geo_states FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY geo_states_admin_delete ON public.geo_states FOR DELETE USING (public.is_admin());

CREATE POLICY geo_districts_select ON public.geo_districts FOR SELECT USING (true);
CREATE POLICY geo_districts_admin_insert ON public.geo_districts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY geo_districts_admin_update ON public.geo_districts FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY geo_districts_admin_delete ON public.geo_districts FOR DELETE USING (public.is_admin());

CREATE POLICY geo_markets_select ON public.geo_markets FOR SELECT USING (true);
CREATE POLICY geo_markets_admin_insert ON public.geo_markets FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY geo_markets_admin_update ON public.geo_markets FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY geo_markets_admin_delete ON public.geo_markets FOR DELETE USING (public.is_admin());


-- ============================================================
-- 1.2  Service coverage table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.geo_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_scope text NOT NULL CHECK (role_scope IN ('agent','logistics','buyer')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_id uuid NULL REFERENCES public.geo_states(id),
  district_id uuid NULL REFERENCES public.geo_districts(id),
  market_id uuid NULL REFERENCES public.geo_markets(id),
  radius_km numeric NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_service_area_scope CHECK (
    state_id IS NOT NULL OR district_id IS NOT NULL OR market_id IS NOT NULL
  ),
  CONSTRAINT uq_service_area UNIQUE (user_id, role_scope, state_id, district_id, market_id)
);

CREATE INDEX IF NOT EXISTS idx_gsa_role_district ON public.geo_service_areas(role_scope, district_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gsa_role_state ON public.geo_service_areas(role_scope, state_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gsa_user_role ON public.geo_service_areas(user_id, role_scope);

ALTER TABLE public.geo_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY gsa_select ON public.geo_service_areas
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY gsa_insert ON public.geo_service_areas
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin() OR current_setting('app.rpc',true) = 'true');
CREATE POLICY gsa_update ON public.geo_service_areas
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY gsa_delete ON public.geo_service_areas
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.update_gsa_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_gsa_updated_at
  BEFORE UPDATE ON public.geo_service_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_gsa_updated_at();


-- ============================================================
-- 1.3  Additive geo FK columns on core tables
-- ============================================================

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS geo_state_id uuid NULL,
  ADD COLUMN IF NOT EXISTS geo_district_id uuid NULL,
  ADD COLUMN IF NOT EXISTS home_market_id uuid NULL,
  ADD COLUMN IF NOT EXISTS geo_updated_at timestamptz NULL;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_geo_state_fkey FOREIGN KEY (geo_state_id) REFERENCES public.geo_states(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_geo_district_fkey FOREIGN KEY (geo_district_id) REFERENCES public.geo_districts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_home_market_fkey FOREIGN KEY (home_market_id) REFERENCES public.geo_markets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_geo_district ON public.profiles(geo_district_id);

-- listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS geo_district_id uuid NULL,
  ADD COLUMN IF NOT EXISTS geo_market_id uuid NULL;

DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_geo_district_fkey FOREIGN KEY (geo_district_id) REFERENCES public.geo_districts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_geo_market_fkey FOREIGN KEY (geo_market_id) REFERENCES public.geo_markets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_listings_geo_district ON public.listings(geo_district_id, status);

-- transport_requests
ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS origin_district_id uuid NULL,
  ADD COLUMN IF NOT EXISTS dest_district_id uuid NULL,
  ADD COLUMN IF NOT EXISTS origin_market_id uuid NULL,
  ADD COLUMN IF NOT EXISTS dest_market_id uuid NULL;

DO $$ BEGIN
  ALTER TABLE public.transport_requests ADD CONSTRAINT tr_origin_district_fkey FOREIGN KEY (origin_district_id) REFERENCES public.geo_districts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transport_requests ADD CONSTRAINT tr_dest_district_fkey FOREIGN KEY (dest_district_id) REFERENCES public.geo_districts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transport_requests ADD CONSTRAINT tr_origin_market_fkey FOREIGN KEY (origin_market_id) REFERENCES public.geo_markets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.transport_requests ADD CONSTRAINT tr_dest_market_fkey FOREIGN KEY (dest_market_id) REFERENCES public.geo_markets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_tr_origin_district ON public.transport_requests(origin_district_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tr_dest_district ON public.transport_requests(dest_district_id, status, updated_at DESC);

-- market_orders
ALTER TABLE public.market_orders
  ADD COLUMN IF NOT EXISTS delivery_district_id uuid NULL;

DO $$ BEGIN
  ALTER TABLE public.market_orders ADD CONSTRAINT mo_delivery_district_fkey FOREIGN KEY (delivery_district_id) REFERENCES public.geo_districts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_mo_delivery_district ON public.market_orders(delivery_district_id, status);


-- ============================================================
-- 1.4  Karnataka seed data (idempotent)
-- ============================================================

INSERT INTO public.geo_states (name_en, name_local, iso_code)
VALUES ('Karnataka', 'ಕರ್ನಾಟಕ', 'KA')
ON CONFLICT (name_en) DO NOTHING;

DO $$
DECLARE
  v_ka uuid;
  v_districts text[] := ARRAY[
    'Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban',
    'Bidar','Chamarajanagar','Chikkaballapura','Chikkamagaluru','Chitradurga',
    'Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan',
    'Haveri','Kalaburagi','Kodagu','Kolar','Koppal',
    'Mandya','Mysuru','Raichur','Ramanagara','Shimoga',
    'Tumakuru','Udupi','Uttara Kannada','Vijayanagara','Vijayapura','Yadgir'
  ];
  d text;
BEGIN
  SELECT id INTO v_ka FROM public.geo_states WHERE name_en = 'Karnataka';
  IF v_ka IS NULL THEN RETURN; END IF;

  FOREACH d IN ARRAY v_districts LOOP
    INSERT INTO public.geo_districts (state_id, name_en)
    VALUES (v_ka, d)
    ON CONFLICT ON CONSTRAINT uq_geo_districts_state_name DO NOTHING;
  END LOOP;
END $$;

-- Starter markets
DO $$
DECLARE
  v_d uuid;
BEGIN
  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Mysuru';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Mysuru APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;

  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Bengaluru Urban';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Yeshwanthpur APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;

  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Dharwad';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Hubballi APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;

  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Belagavi';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Belagavi APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;

  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Davanagere';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Davanagere APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;

  SELECT id INTO v_d FROM public.geo_districts WHERE name_en = 'Hassan';
  IF v_d IS NOT NULL THEN
    INSERT INTO public.geo_markets (district_id, name_en, market_type) VALUES (v_d, 'Hassan APMC', 'APMC') ON CONFLICT ON CONSTRAINT uq_geo_markets_district_name DO NOTHING;
  END IF;
END $$;


-- ============================================================
-- 2.1  RPC: geo_search_v1 (typeahead)
-- ============================================================

CREATE OR REPLACE FUNCTION public.geo_search_v1(
  p_q text DEFAULT '',
  p_type text DEFAULT 'district',
  p_state_id uuid DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(1, LEAST(p_limit, 50));
  v_q text := COALESCE(p_q, '');
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  IF p_type = 'state' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT id, name_en, name_local, iso_code
      FROM public.geo_states
      WHERE is_active = true AND (v_q = '' OR name_en ILIKE v_q || '%')
      ORDER BY name_en LIMIT v_limit
    ) t;

  ELSIF p_type = 'district' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT d.id, d.name_en, d.name_local, d.state_id,
        (SELECT s.name_en FROM geo_states s WHERE s.id = d.state_id) AS state_name
      FROM public.geo_districts d
      WHERE d.is_active = true
        AND (v_q = '' OR d.name_en ILIKE v_q || '%')
        AND (p_state_id IS NULL OR d.state_id = p_state_id)
      ORDER BY d.name_en LIMIT v_limit
    ) t;

  ELSIF p_type = 'market' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT m.id, m.name_en, m.name_local, m.district_id, m.market_type,
        (SELECT d.name_en FROM geo_districts d WHERE d.id = m.district_id) AS district_name
      FROM public.geo_markets m
      WHERE m.is_active = true
        AND (v_q = '' OR m.name_en ILIKE v_q || '%')
        AND (p_district_id IS NULL OR m.district_id = p_district_id)
      ORDER BY m.name_en LIMIT v_limit
    ) t;
  END IF;

  RETURN COALESCE(v_items, '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.geo_search_v1(text,text,uuid,uuid,int) TO authenticated;


-- ============================================================
-- 2.2  RPC: set_profile_geo_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_profile_geo_v1(
  p_state_id uuid DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_market_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_req uuid := audit.new_request_id_v1();
  v_uid uuid := auth.uid();
  v_district_state uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  -- validate district belongs to state if both provided
  IF p_district_id IS NOT NULL AND p_state_id IS NOT NULL THEN
    SELECT state_id INTO v_district_state FROM public.geo_districts WHERE id = p_district_id;
    IF v_district_state IS NULL OR v_district_state != p_state_id THEN
      RAISE EXCEPTION 'DISTRICT_STATE_MISMATCH';
    END IF;
  END IF;

  UPDATE public.profiles SET
    geo_state_id = COALESCE(p_state_id, geo_state_id),
    geo_district_id = COALESCE(p_district_id, geo_district_id),
    home_market_id = COALESCE(p_market_id, home_market_id),
    geo_updated_at = now()
  WHERE id = v_uid;

  PERFORM audit.log_workflow_event_v1(
    v_req, 'profile', v_uid, 'PROFILE_GEO_UPDATED',
    v_uid, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('state_id', p_state_id, 'district_id', p_district_id, 'market_id', p_market_id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_profile_geo_v1(uuid,uuid,uuid) TO authenticated;


-- ============================================================
-- 2.3  RPC: upsert_service_area_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_service_area_v1(
  p_role_scope text,
  p_state_id uuid DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_market_id uuid DEFAULT NULL,
  p_radius_km numeric DEFAULT NULL,
  p_is_active boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req uuid := audit.new_request_id_v1();
  v_id uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  -- validate role matches
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = v_uid LIMIT 1;
  IF v_role IS NULL OR (
    (p_role_scope = 'agent' AND v_role != 'agent') OR
    (p_role_scope = 'logistics' AND v_role != 'logistics') OR
    (p_role_scope = 'buyer' AND v_role != 'buyer')
  ) THEN
    RAISE EXCEPTION 'ROLE_MISMATCH';
  END IF;

  IF p_state_id IS NULL AND p_district_id IS NULL AND p_market_id IS NULL THEN
    RAISE EXCEPTION 'AT_LEAST_ONE_SCOPE_REQUIRED';
  END IF;

  INSERT INTO public.geo_service_areas (user_id, role_scope, state_id, district_id, market_id, radius_km, is_active)
  VALUES (v_uid, p_role_scope, p_state_id, p_district_id, p_market_id, p_radius_km, p_is_active)
  ON CONFLICT ON CONSTRAINT uq_service_area
  DO UPDATE SET radius_km = EXCLUDED.radius_km, is_active = EXCLUDED.is_active, updated_at = now()
  RETURNING id INTO v_id;

  PERFORM audit.log_workflow_event_v1(
    v_req, 'service_area', v_id, 'SERVICE_AREA_UPDATED',
    v_uid, p_role_scope, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('role_scope', p_role_scope, 'state_id', p_state_id, 'district_id', p_district_id, 'market_id', p_market_id)
  );

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_service_area_v1(text,uuid,uuid,uuid,numeric,boolean) TO authenticated;


-- ============================================================
-- 2.4  RPC: delete_service_area_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_service_area_v1(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_req uuid := audit.new_request_id_v1();
  v_row record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  SELECT * INTO v_row FROM public.geo_service_areas WHERE id = p_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.user_id != v_uid AND NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  DELETE FROM public.geo_service_areas WHERE id = p_id;

  PERFORM audit.log_workflow_event_v1(
    v_req, 'service_area', p_id, 'SERVICE_AREA_DELETED',
    v_uid, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    jsonb_build_object('role_scope', v_row.role_scope, 'district_id', v_row.district_id)
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_service_area_v1(uuid) TO authenticated;


-- ============================================================
-- 2.5  RPC: admin.suggest_agents_for_farmer_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.suggest_agents_for_farmer_v1(
  p_farmer_user_id uuid,
  p_limit int DEFAULT 5
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_limit int := GREATEST(1, LEAST(p_limit, 20));
  v_farmer_district uuid;
  v_farmer_state uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  -- get farmer geo
  SELECT geo_district_id, geo_state_id INTO v_farmer_district, v_farmer_state
  FROM public.profiles WHERE id = p_farmer_user_id;

  -- fallback: infer district from farmlands
  IF v_farmer_district IS NULL THEN
    SELECT gd.id INTO v_farmer_district
    FROM public.farmlands fl
    JOIN public.geo_districts gd ON lower(gd.name_en) = lower(fl.district)
    WHERE fl.farmer_id = p_farmer_user_id AND fl.district IS NOT NULL
    LIMIT 1;
  END IF;

  IF v_farmer_district IS NULL AND v_farmer_state IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'reason', 'Farmer has no geo data');
  END IF;

  -- infer state from district
  IF v_farmer_state IS NULL AND v_farmer_district IS NOT NULL THEN
    SELECT state_id INTO v_farmer_state FROM public.geo_districts WHERE id = v_farmer_district;
  END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
    SELECT
      gsa.user_id AS agent_user_id,
      p.full_name AS agent_name,
      p.phone AS agent_phone,
      gd.name_en AS service_district,
      CASE WHEN gsa.district_id = v_farmer_district THEN 'district_match' ELSE 'state_match' END AS match_type,
      COALESCE((SELECT count(*) FROM agent_tasks at WHERE at.agent_id = gsa.user_id AND at.task_status IN ('pending','in_progress')), 0) AS open_tasks,
      COALESCE((SELECT count(*) FROM agent_farmer_assignments afa WHERE afa.agent_id = gsa.user_id AND afa.active = true), 0) AS assigned_farmers,
      (100 - LEAST(COALESCE((SELECT count(*) FROM agent_tasks at WHERE at.agent_id = gsa.user_id AND at.task_status IN ('pending','in_progress')), 0) * 10, 100))
        + CASE WHEN gsa.district_id = v_farmer_district THEN 20 ELSE 0 END
        AS score
    FROM public.geo_service_areas gsa
    JOIN public.profiles p ON p.id = gsa.user_id
    LEFT JOIN public.geo_districts gd ON gd.id = gsa.district_id
    WHERE gsa.role_scope = 'agent'
      AND gsa.is_active = true
      AND (gsa.district_id = v_farmer_district OR gsa.state_id = v_farmer_state)
    ORDER BY score DESC, open_tasks ASC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb), 'farmer_district_id', v_farmer_district);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.suggest_agents_for_farmer_v1(uuid,int) TO authenticated;


-- ============================================================
-- 2.6  RPC: suggest_transporters_v1
-- ============================================================

CREATE OR REPLACE FUNCTION public.suggest_transporters_v1(
  p_transport_request_id uuid,
  p_limit int DEFAULT 10
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_limit int := GREATEST(1, LEAST(p_limit, 20));
  v_uid uuid := auth.uid();
  v_req record;
  v_origin_state uuid;
  v_dest_state uuid;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_req FROM public.transport_requests WHERE id = p_transport_request_id;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_req.farmer_id::text != v_uid::text AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- get parent states
  IF v_req.origin_district_id IS NOT NULL THEN
    SELECT state_id INTO v_origin_state FROM public.geo_districts WHERE id = v_req.origin_district_id;
  END IF;
  IF v_req.dest_district_id IS NOT NULL THEN
    SELECT state_id INTO v_dest_state FROM public.geo_districts WHERE id = v_req.dest_district_id;
  END IF;

  IF v_req.origin_district_id IS NULL AND v_req.dest_district_id IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'reason', 'Transport request has no district data');
  END IF;

  SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
    SELECT DISTINCT ON (gsa.user_id)
      gsa.user_id AS transporter_user_id,
      p.full_name AS transporter_name,
      p.phone AS transporter_phone,
      gd.name_en AS service_district,
      CASE
        WHEN gsa.district_id = v_req.origin_district_id THEN 'origin_district_match'
        WHEN gsa.district_id = v_req.dest_district_id THEN 'dest_district_match'
        WHEN gsa.state_id = v_origin_state OR gsa.state_id = v_dest_state THEN 'state_match'
        ELSE 'partial'
      END AS match_type,
      COALESCE((SELECT count(*) FROM trips tr WHERE tr.transporter_id = gsa.user_id AND tr.status IN ('accepted','pickup_done','in_transit')), 0) AS active_trips,
      CASE WHEN gsa.district_id IN (v_req.origin_district_id, v_req.dest_district_id) THEN 30 ELSE 10 END
        - LEAST(COALESCE((SELECT count(*) FROM trips tr WHERE tr.transporter_id = gsa.user_id AND tr.status IN ('accepted','pickup_done','in_transit')), 0) * 5, 25)
        AS score
    FROM public.geo_service_areas gsa
    JOIN public.profiles p ON p.id = gsa.user_id
    LEFT JOIN public.geo_districts gd ON gd.id = gsa.district_id
    WHERE gsa.role_scope = 'logistics'
      AND gsa.is_active = true
      AND (
        gsa.district_id IN (v_req.origin_district_id, v_req.dest_district_id)
        OR gsa.state_id IN (v_origin_state, v_dest_state)
      )
    ORDER BY gsa.user_id, score DESC
  ) t
  ORDER BY (t->>'score')::int DESC
  LIMIT v_limit;

  RETURN jsonb_build_object('items', COALESCE(v_items, '[]'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.suggest_transporters_v1(uuid,int) TO authenticated;


-- ============================================================
-- 3.  Ops Inbox: add district_id filter to get_ops_inbox_v1
-- ============================================================

CREATE OR REPLACE FUNCTION admin.get_ops_inbox_v1(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, audit
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz;
  v_cursor_id uuid;
  v_where text := '';
  v_sql text;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb;
  v_count int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM set_config('app.rpc','true',true);

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  IF p_filters ? 'item_type' THEN
    v_where := v_where || format(' AND item_type = %L', p_filters->>'item_type');
  END IF;
  IF p_filters ? 'severity' THEN
    v_where := v_where || format(' AND severity = %L', p_filters->>'severity');
  END IF;
  IF p_filters ? 'status' THEN
    v_where := v_where || format(' AND status = %L', p_filters->>'status');
  ELSE
    v_where := v_where || ' AND status = ''open''';
  END IF;
  IF p_filters ? 'entity_type' THEN
    v_where := v_where || format(' AND entity_type = %L', p_filters->>'entity_type');
  END IF;
  -- Phase 5.4: district_id filter via metadata
  IF p_filters ? 'district_id' THEN
    v_where := v_where || format(' AND metadata->>''district_id'' = %L', p_filters->>'district_id');
  END IF;

  v_sql := 'SELECT id, item_type, entity_type, entity_id, severity, status, summary, metadata, updated_at FROM public.ops_inbox_items WHERE 1=1 ' || v_where;

  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(' AND (updated_at, id) < (%L::timestamptz, %L::uuid)', v_cursor_ts, v_cursor_id);
  END IF;
  v_sql := v_sql || format(' ORDER BY updated_at DESC, id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE _tmp_ops ON COMMIT DROP AS %s', v_sql);
  SELECT count(*) INTO v_count FROM _tmp_ops;
  SELECT jsonb_agg(row_to_json(t)) INTO v_items
    FROM (SELECT * FROM _tmp_ops ORDER BY updated_at DESC, id DESC LIMIT v_limit) t;

  IF v_count > v_limit THEN
    SELECT row_to_json(r)::jsonb INTO v_next_cursor
      FROM (SELECT updated_at, id FROM _tmp_ops ORDER BY updated_at DESC, id DESC OFFSET v_limit LIMIT 1) r;
  END IF;

  RETURN jsonb_build_object('items', COALESCE(v_items,'[]'::jsonb), 'next_cursor', v_next_cursor);
END;
$$;
GRANT EXECUTE ON FUNCTION admin.get_ops_inbox_v1(jsonb,int,jsonb) TO authenticated;


-- ============================================================
-- 4.  Analytics: activity_daily_geo table
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics.activity_daily_geo (
  day date NOT NULL,
  district_id uuid NOT NULL REFERENCES public.geo_districts(id),
  signups int NOT NULL DEFAULT 0,
  listings_approved int NOT NULL DEFAULT 0,
  orders_placed int NOT NULL DEFAULT 0,
  trips_completed int NOT NULL DEFAULT 0,
  tickets_opened int NOT NULL DEFAULT 0,
  PRIMARY KEY (day, district_id)
);

ALTER TABLE analytics.activity_daily_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY adg_select_admin ON analytics.activity_daily_geo FOR SELECT USING (public.is_admin());
CREATE POLICY adg_insert_rpc ON analytics.activity_daily_geo FOR INSERT WITH CHECK (public.is_admin() OR current_setting('app.rpc',true) = 'true');
CREATE POLICY adg_update_rpc ON analytics.activity_daily_geo FOR UPDATE USING (public.is_admin() OR current_setting('app.rpc',true) = 'true');


-- ============================================================
-- Done: Phase 5.4 migration
-- ============================================================
