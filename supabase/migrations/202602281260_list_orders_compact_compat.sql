-- list_orders_compact_v1 compatibility hardening.
-- Fixes runtime failures when public.market_orders.total_amount is absent by
-- deriving an amount from available columns.

CREATE OR REPLACE FUNCTION public.list_orders_compact_v1(
  p_limit int DEFAULT 30,
  p_cursor jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := GREATEST(10, LEAST(p_limit, 50));
  v_cursor_ts timestamptz := NULL;
  v_cursor_id uuid := NULL;
  v_items jsonb := '[]'::jsonb;
  v_next_cursor jsonb := NULL;
  v_sql text;
  v_buyer_id uuid := NULL;
  v_user_id uuid := auth.uid();
  v_count int := 0;
  v_total_expr text := '0::numeric(14,2)';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF to_regclass('public.buyers') IS NOT NULL
     AND public._column_exists('public', 'buyers', 'user_id') THEN
    SELECT id
    INTO v_buyer_id
    FROM public.buyers
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  IF to_regclass('public.market_orders') IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'next_cursor', NULL);
  END IF;

  IF public._column_exists('public', 'market_orders', 'total_amount') THEN
    v_total_expr := 'COALESCE(mo.total_amount, 0)::numeric(14,2)';
  ELSIF public._column_exists('public', 'market_orders', 'qty')
     AND public._column_exists('public', 'market_orders', 'unit_price') THEN
    v_total_expr := '(COALESCE(mo.qty, 0) * COALESCE(mo.unit_price, 0))::numeric(14,2)';
  ELSIF public._column_exists('public', 'market_orders', 'quantity')
     AND public._column_exists('public', 'market_orders', 'price_agreed') THEN
    v_total_expr := '(COALESCE(mo.quantity, 0) * COALESCE(mo.price_agreed, 0))::numeric(14,2)';
  ELSIF public._column_exists('public', 'market_orders', 'quantity') THEN
    v_total_expr := 'COALESCE(mo.quantity, 0)::numeric(14,2)';
  END IF;

  IF p_cursor IS NOT NULL THEN
    v_cursor_ts := (p_cursor->>'updated_at')::timestamptz;
    v_cursor_id := (p_cursor->>'id')::uuid;
  END IF;

  v_sql := format(
    $sql$
    SELECT
      mo.id,
      mo.status,
      %s AS total_amount,
      mo.updated_at,
      row_to_json(far) AS farmer,
      row_to_json(cp) AS crop
    FROM public.market_orders mo
    LEFT JOIN LATERAL (
      SELECT p.id, p.full_name
      FROM public.profiles p
      WHERE p.id = mo.farmer_id
    ) far ON true
    LEFT JOIN LATERAL (
      SELECT c.id, c.crop_name, c.variety
      FROM public.crops c
      WHERE c.id = mo.crop_id
    ) cp ON true
    WHERE mo.buyer_id IN (%L::uuid, %L::uuid)
    $sql$,
    v_total_expr,
    v_user_id::text,
    COALESCE(v_buyer_id, v_user_id)::text
  );

  IF v_cursor_ts IS NOT NULL THEN
    v_sql := v_sql || format(
      ' AND (mo.updated_at, mo.id) < (%L::timestamptz, %L::uuid)',
      v_cursor_ts,
      v_cursor_id
    );
  END IF;

  v_sql := v_sql || format(' ORDER BY mo.updated_at DESC, mo.id DESC LIMIT %s', v_limit + 1);

  EXECUTE format('CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS %s', v_sql);

  SELECT COUNT(*) INTO v_count FROM tmp_orders;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_items
  FROM (
    SELECT id, status, total_amount, updated_at, farmer, crop
    FROM tmp_orders
    ORDER BY updated_at DESC, id DESC
    LIMIT v_limit
  ) t;

  IF v_count > v_limit THEN
    SELECT row_to_json(r)
    INTO v_next_cursor
    FROM (
      SELECT updated_at, id
      FROM tmp_orders
      ORDER BY updated_at DESC, id DESC
      OFFSET v_limit
      LIMIT 1
    ) r;
  ELSE
    v_next_cursor := NULL;
  END IF;

  RETURN jsonb_build_object(
    'items',
    COALESCE(v_items, '[]'::jsonb),
    'next_cursor',
    v_next_cursor
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_orders_compact_v1(int,jsonb) TO authenticated;
