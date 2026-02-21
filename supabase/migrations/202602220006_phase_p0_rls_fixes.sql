-- Migration: Phase P0 - Minimal RLS fixes for verification harness
-- Adds agent visibility policies, owner delete policies, and alias RPC

-- 1) Agent can read assigned farmers' profiles
CREATE POLICY IF NOT EXISTS profiles_select_agent ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agent_farmer_assignments
      WHERE agent_id = auth.uid() AND farmer_id = profiles.id AND active = true
    )
  );

-- 2) Agent can INSERT tasks for assigned farmers
CREATE POLICY IF NOT EXISTS agent_tasks_agent_insert ON public.agent_tasks
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.agent_farmer_assignments
      WHERE agent_id = auth.uid() AND farmer_id = agent_tasks.farmer_id AND active = true
    )
  );

-- 3) Agent can see assigned farmers' transport requests
CREATE POLICY IF NOT EXISTS transport_requests_agent_select ON public.transport_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agent_farmer_assignments
      WHERE agent_id = auth.uid() AND farmer_id = transport_requests.farmer_id AND active = true
    )
  );

-- 4) Owner DELETE on crops, farmlands, listings
CREATE POLICY IF NOT EXISTS crops_delete_own ON public.crops
  FOR DELETE USING (farmer_id = auth.uid());

CREATE POLICY IF NOT EXISTS farmlands_delete_own ON public.farmlands
  FOR DELETE USING (farmer_id = auth.uid());

CREATE POLICY IF NOT EXISTS listings_delete_own ON public.listings
  FOR DELETE USING (seller_id = auth.uid() OR public.is_admin());

-- 5) Create farmer_update_order_status alias to maintain frontend compatibility
CREATE OR REPLACE FUNCTION public.farmer_update_order_status(
  p_order_id uuid, p_new_status text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN public.update_order_status_v1(p_order_id, p_new_status, NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.farmer_update_order_status(uuid, text) TO authenticated;

