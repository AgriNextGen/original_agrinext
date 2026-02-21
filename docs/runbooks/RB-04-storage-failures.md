# RB-04 — Storage / Upload Failures

Symptoms
- Upload_failure_count increased
- Many pending uploads in upload queue or files with status 'pending' for long durations

How to confirm
- SQL: SELECT * FROM files WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50;
- Check analytics.system_events for upload-related events

Immediate mitigation
- Clear transient storage errors, ensure buckets are healthy
- Re-run stalled uploads from upload queue with backoff

Long-term fix
- Improve signed URL generation resilience and retry logic
- Add monitoring for storage provider errors and latency

Postmortem checklist
- Validate file integrity and user refunds if necessary

