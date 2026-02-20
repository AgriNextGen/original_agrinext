\% AgriNext Gen --- RATE_LIMITING_AND_ABUSE_DETECTION % Version 1.0 %
Generated on 2026-02-20

# RATE_LIMITING_AND_ABUSE_DETECTION.md

Status: Production-Grade\
Applies to: Edge Functions, Auth, AI APIs, GPS ingest, Storage signing\
Priority: Security + Cost Protection + UX Preservation

------------------------------------------------------------------------

# 1. Philosophy

AgriNext Gen implements adaptive, user-friendly rate limiting.

Goals:

1.  Protect infrastructure and paid APIs (AI, SMS, payments)
2.  Prevent abuse (OTP spam, upload spam, brute-force login)
3.  Maintain excellent UX for normal farmers/agents/transporters
4.  Avoid punishing genuine rural users with unstable networks
5.  Only restrict when excessive or suspicious usage is detected

This system uses: - Soft throttling first - Hard blocking only when
required - Risk scoring with decay - Multi-key identification (user +
device + IP)

------------------------------------------------------------------------

# 2. Architecture Overview

Rate limiting is enforced at the Edge Function layer.

All sensitive endpoints must pass through:

1.  Rate Limit Check
2.  Risk Score Evaluation
3.  Abuse Detection
4.  Enforcement Decision

No direct database reads are rate-limited.

------------------------------------------------------------------------

# 3. Rate Limiting Strategy

We use a hybrid fixed-window + token bucket model.

## 3.1 Rate Limit Keys

Rate limiting must consider multiple identifiers:

-   user_id (primary)
-   phone_hash (for auth endpoints)
-   device_fingerprint (non-invasive)
-   ip_prefix (best effort)
-   endpoint_name
-   entity_id (for GPS/trip)

Priority order:

1.  user_id + endpoint
2.  device + endpoint
3.  ip_prefix + endpoint

------------------------------------------------------------------------

# 4. Enforcement Tiers

## Tier 0 --- Normal

No restriction.

## Tier 1 --- Soft Throttle

-   Add artificial delay (300--800ms)
-   Reduce heavy payload sizes (AI responses)
-   Return friendly warning message

## Tier 2 --- Temporary Block

-   Return HTTP 429
-   Include retry_after_seconds
-   Duration: 5--30 minutes

## Tier 3 --- Risk Lock

-   Flag account/device
-   Require re-authentication
-   Log to audit.security_events

------------------------------------------------------------------------

# 5. Endpoint Classification

## P0 (Strict)

-   login-by-phone
-   send-otp
-   AI endpoints
-   storage_sign_upload_v1

## P1 (Moderate)

-   trip-location-ingest
-   update_trip_status_v1

## P2 (Light)

-   marketplace browsing
-   dashboard reads

------------------------------------------------------------------------

# 6. Database Tables

## 6.1 public.rate_limits

Columns:

id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL,
endpoint text NOT NULL, window_start timestamptz NOT NULL, request_count
integer DEFAULT 0, created_at timestamptz DEFAULT now()

Indexes: - key + endpoint - window_start

------------------------------------------------------------------------

## 6.2 public.abuse_risk_scores

Columns:

id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL,
risk_score integer DEFAULT 0, last_updated timestamptz DEFAULT now()

Risk score decays over time.

------------------------------------------------------------------------

# 7. Risk Score Signals

Increase risk score when:

-   Multiple failed login attempts
-   OTP spam patterns
-   Rapid AI request bursts
-   Excessive signed upload URL requests
-   GPS data with impossible speeds
-   Multiple accounts from same device/IP

Risk score must decay gradually (e.g., -1 every 10 minutes).

------------------------------------------------------------------------

# 8. AI Cost Protection

AI endpoints must:

-   Count tokens per request
-   Enforce per-user daily budget
-   Apply stricter limits on free-tier users

Soft throttle before hard block.

------------------------------------------------------------------------

# 9. GPS Abuse Handling

For trip-location-ingest:

-   Accept batch points
-   Limit max points per request
-   Drop excessive points silently
-   Reject unrealistic speed patterns
-   Rate limit per trip_id + user

------------------------------------------------------------------------

# 10. Storage Abuse Handling

For storage_sign_upload_v1:

-   Validate bucket allowlist
-   Validate MIME type
-   Validate file size
-   Limit requests per minute
-   Detect repeated URL generation without upload completion

------------------------------------------------------------------------

# 11. User Experience Rules

-   Never show technical error messages
-   Use friendly responses: "High usage detected. Please try again
    shortly."
-   Avoid blocking dashboard reads
-   Allow critical actions (trip updates) unless clearly abusive
-   Use gradual enforcement

------------------------------------------------------------------------

# 12. Admin Monitoring

Admin dashboard should display:

-   Top endpoints by usage
-   Top risk_score accounts
-   Blocked users/devices
-   AI cost consumption metrics

------------------------------------------------------------------------

# 13. Implementation Plan

Phase D1: - Create rate_limits table - Create abuse_risk_scores table -
Implement fixed window counter

Phase D2: - Add risk score logic - Integrate into Edge functions

Phase D3: - Add admin monitoring panel

------------------------------------------------------------------------

# 14. Future Enhancements

-   Redis-based distributed rate limiting
-   Adaptive ML-based anomaly detection
-   Geo-based fraud scoring
-   Device fingerprint entropy scoring

------------------------------------------------------------------------

# 15. Enforcement Principles

-   Protect infrastructure first
-   Preserve user trust
-   Avoid false positives
-   Log all enforcement actions
-   Never silently block critical flows without logging

------------------------------------------------------------------------

END OF DOCUMENT
