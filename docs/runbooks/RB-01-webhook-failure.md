# RB-01 — Webhook Failure

Symptoms
- Webhook processing failures visible in analytics/system_events or audit.alerts
- Increased webhook_failure_count metric

How to confirm
- SQL: SELECT * FROM secure.webhook_events WHERE processing_status = 'failed' ORDER BY received_at DESC LIMIT 10;
- Check audit.alerts for rule_name = 'webhook_failure_spike'

Immediate mitigation
- Pause non-critical downstream processing or route to manual review via Ops Inbox
- Increase retry window (safe manual requeue) and monitor

Long-term fix
- Investigate provider signature/format changes, rate limits, or RPC errors in secure.apply_gateway_state_v1
- Harden RPC error handling and add idempotency checks

Postmortem checklist
- Root cause analysis
- Roll forward fix and monitor metric
- Update runbook

