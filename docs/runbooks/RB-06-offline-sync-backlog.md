# RB-06 — Offline Sync Backlog

Symptoms
- Large pending sync/upload counts reported in admin UI or client diagnostics
- Users reporting actions not applied after reconnection

How to confirm
- Inspect client diagnostics and queued actions via Pending Sync UI
- SQL: check server-side idempotency keys and job queue for retries

Immediate mitigation
- Throttle client sync windows and inform users with guidance
- Manually process high-priority actions via Ops Inbox

Long-term fix
- Improve client backoff and batching strategy
- Provide tools to replay or cancel problematic queued actions

Postmortem checklist
- Analyze root cause (network, client bug), notify users, and update client

