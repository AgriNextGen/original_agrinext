-- SQL smoke tests for Stage 5.6 - Trust & Safety
-- Run these as a privileged user or via a test harness that can assert results.
-- 1) Non-admin cannot update profiles.account_status (should fail for authenticated role)
-- Expectation: attempt to update as non-admin should raise or affect zero rows when RLS enforced.
-- Example:
-- SET ROLE authenticated;
-- UPDATE public.profiles SET account_status = 'locked' WHERE id = '00000000-0000-0000-0000-000000000000';

-- 2) Opening a dispute on an order sets payout_hold = true
-- Example flow (run as the affected buyer):
-- SELECT public.open_dispute_v1('order','<order-id>','refund','testing dispute');
-- SELECT payout_hold, payout_hold_reason FROM public.market_orders WHERE id = '<order-id>';

-- 3) Resolving the dispute clears payout_hold only when no other open disputes
-- Example:
-- -- As admin:
-- SELECT admin.set_dispute_status_v1('<dispute-id>','resolved','no_refund','test resolve');
-- SELECT payout_hold FROM public.market_orders WHERE id = '<order-id>';

-- 4) admin.queue_payout_v1 should fail when payout_hold = true
-- Example (depends on existing RPC signature):
-- -- Attempt to queue payout for order with payout_hold true; expect error
-- -- SELECT admin.queue_payout_v1('<order-id>'); -- should throw or return error

-- 5) risk_evaluate_recent_v1 increases risk_score and creates ops inbox items
-- Example:
-- -- Insert a synthesized security event for test user
-- INSERT INTO audit.security_events(event_type, severity, actor_user_id, metadata) VALUES ('test_repeated_fail','high','<test-user-id>'::uuid, '{}'::jsonb);
-- -- Run evaluation
-- SELECT admin.risk_evaluate_recent_v1(24);
-- -- Check profile risk_score and ops_inbox item
-- SELECT risk_score FROM public.profiles WHERE id = '<test-user-id>';
-- SELECT * FROM public.ops_inbox_items WHERE entity_type = 'user' AND entity_id = '<test-user-id>';

-- Notes:
-- Replace placeholders (<order-id>, <dispute-id>, <test-user-id>) with real IDs in your test DB.
-- These are intended as manual or harness-driven smoke checks rather than automated assertions in this repo.

