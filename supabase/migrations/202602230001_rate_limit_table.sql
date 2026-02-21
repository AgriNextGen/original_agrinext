-- Create table for edge rate limits and a SECURITY DEFINER function to consume tokens.
CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  key text PRIMARY KEY,
  remaining int NOT NULL,
  reset_at timestamptz NOT NULL
);

-- Function: consume_rate_limit(key, limit, window_seconds) returns boolean
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_remaining int;
  current_reset timestamptz;
BEGIN
  LOOP
    -- Try to insert; if row doesn't exist, create with p_limit-1
    BEGIN
      INSERT INTO public.edge_rate_limits(key, remaining, reset_at)
      VALUES (p_key, p_limit - 1, now() + (p_window_seconds || ' seconds')::interval);
      RETURN true;
    EXCEPTION WHEN unique_violation THEN
      -- Row exists; update it atomically
      SELECT remaining, reset_at INTO current_remaining, current_reset FROM public.edge_rate_limits WHERE key = p_key FOR UPDATE;
      IF current_reset <= now() THEN
        -- window expired: reset counter
        UPDATE public.edge_rate_limits
          SET remaining = p_limit - 1,
              reset_at = now() + (p_window_seconds || ' seconds')::interval
          WHERE key = p_key;
        RETURN true;
      ELSE
        IF current_remaining > 0 THEN
          UPDATE public.edge_rate_limits
            SET remaining = remaining - 1
            WHERE key = p_key;
          RETURN true;
        ELSE
          RETURN false;
        END IF;
      END IF;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, int, int) TO authenticated;

