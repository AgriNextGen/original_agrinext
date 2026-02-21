# RB-02 — Job Worker Dead / Stuck

Symptoms
- Jobs remain in "dead" state or no recent job_run entries
- Dead jobs count metric increased

How to confirm
- SQL: SELECT * FROM job_queue WHERE status = 'dead' ORDER BY updated_at DESC LIMIT 50;
- Check job_runs for recent entries: SELECT * FROM job_runs ORDER BY created_at DESC LIMIT 5;

Immediate mitigation
- Restart job-worker instance(s)
- Manually requeue critical jobs if safe

Long-term fix
- Add better error handling and circuit breakers in job handlers
- Improve monitoring and alerting for worker heartbeats

Postmortem checklist
- Run diagnostics, capture logs, and trace failed handlers
- Remediate root cause and verify with synthetic jobs

