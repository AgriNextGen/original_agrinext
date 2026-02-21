# RB-03 — Login Bruteforce / High Failed Logins

Symptoms
- Spike in login_failure_count metric
- Multiple failed_login events in audit.security_events for same user/IP

How to confirm
- SQL: SELECT * FROM audit.security_events WHERE event_type = 'LOGIN_FAILURE' ORDER BY created_at DESC LIMIT 50;
- Check profiles for failed_login_count_window > threshold

Immediate mitigation
- Temporarily increase block durations for offending IPs or users
- Open Ops Inbox items for manual review and possible account hold

Long-term fix
- Implement adaptive rate limiting and stronger anomaly detection
- Ensure runbooks and notifications for suspected credential stuffing

Postmortem checklist
- Identify source IPs, coordinate with infra to block if necessary
- Review user outreach and remediation steps

