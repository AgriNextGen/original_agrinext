# RB-05 — Payment / Settlement Mismatch

Symptoms
- Discrepancies between provider events and internal order/payment state
- Users reporting missing payouts or failed captures

How to confirm
- SQL: SELECT * FROM secure.payment_events ORDER BY created_at DESC LIMIT 50;
- Reconcile provider events with secure.apply_gateway_state_v1 logs

Immediate mitigation
- Pause payouts and surface affected orders in Ops Inbox
- Manually reconcile high-value transactions

Long-term fix
- Improve webhook reliability, idempotency, and reconciliation jobs
- Add alerts for payout mismatches and high-value failures

Postmortem checklist
- Notify stakeholders and affected users, document fixes

