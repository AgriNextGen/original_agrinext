-- tests/p0/sql_smoke_finance.sql
-- Smoke tests for Stage 5.5 Finance Ops (run as admin/service_role)

-- 1) Non-admin cannot read secure tables (expect permission denied when using a non-admin JWT)
-- Run as a normal user (not service role):
-- SELECT count(*) FROM secure.refund_requests;

-- 2) Admin queue payout only when KYC verified
-- Prepare: create test order with payment_status='captured' and profile with kyc_status='verified'
-- SELECT admin.queue_payout_v1('<order_id>', 'smoke test');

-- 3) Approve refund enqueues job and logs audit
-- INSERT INTO secure.refund_requests(order_id, amount, reason, requested_by) VALUES ('<order_id>', 100.00, 'test', '<admin_user_id>') RETURNING id;
-- SELECT admin.approve_refund_v1('<refund_id>', 'approve smoke');
-- Check job_queue for job with idempotency_key = '<refund_id>' and audit.workflow_events for REFUND_APPROVED

-- 4) Webhook retry behavior (simulate)
-- INSERT INTO secure.webhook_events(provider,event_id,event_type,payload,processing_status,next_retry_at,attempts,received_at)
-- VALUES ('razorpay','smoke-evt-1','payment', '{}'::jsonb, 'failed', now(), 5, now());
-- Run webhook_retry_failed_v1 job via enqueue and worker; check ops_inbox_items for webhook_failed

-- 5) Reconciliation fixes initiated -> captured
-- INSERT INTO public.market_orders(id, buyer_id, farmer_id, total_amount, payment_status, payment_order_id) VALUES ('<order_id>','<buyer>','<farmer>',1000,'initiated','smoke_order_1');
-- INSERT INTO secure.payment_events(id, user_id, order_id, event_type, provider, provider_payment_id, amount, status, metadata) VALUES (gen_random_uuid(),'00000000-0000-0000-0000-000000000000','<order_id>','payment_captured','razorpay','smoke_pay_1',1000,'captured','{}'::jsonb);
-- Run payments_reconcile_recent_v1 job and verify public.market_orders.payment_status -> 'captured'

