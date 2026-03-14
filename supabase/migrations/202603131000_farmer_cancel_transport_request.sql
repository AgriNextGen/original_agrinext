-- Farmer-only RPC to cancel a transport request still in 'requested' status.
-- Bypasses the trg_block_status_update_transport_requests trigger by setting app.rpc = true.
CREATE OR REPLACE FUNCTION public.cancel_transport_request_v1(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_request record;
BEGIN
  PERFORM set_config('app.rpc', 'true', true);

  SELECT * INTO v_request FROM public.transport_requests
    WHERE id = p_request_id AND farmer_id = auth.uid() AND status = 'requested'
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND_OR_NOT_CANCELLABLE');
  END IF;

  UPDATE public.transport_requests
    SET status = 'cancelled', updated_at = now()
    WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
