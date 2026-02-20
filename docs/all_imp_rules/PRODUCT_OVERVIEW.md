\% AgriNext Gen --- Product Overview & Workflows (Production Grade,
Cursor-Optimized) % Version 1.0 % Generated on 2026-02-19

# PRODUCT_OVERVIEW.md

Status: Production-Grade\
Audience: Product + Engineering (Cursor/Agents)\
Region: Karnataka (India) now → Global later\
Languages: English + Kannada (bilingual)\
Primary UX: Phone-first (PWA), low-friction onboarding, minimal typing

**Purpose:** This document teaches Cursor the product domain: who the
users are, what problems they solve, the top workflows, and what MVP
success means. This prevents architectural drift and ensures consistent
feature builds.

------------------------------------------------------------------------

## 0) North Star

AgriNext Gen coordinates the agricultural supply chain by connecting: -
Farmers (supply & crop reality) - Agents (verification & trust layer) -
Logistics (transport execution + proof) - Buyers (demand + orders) -
Admin/Ops (monitoring + governance)

The platform's core value is **coordination + trust**: - reduce empty
return trips - improve load utilization - enable better selling timing
using logistics + storage + market signals - create verifiable
traceability and execution proof

------------------------------------------------------------------------

## 1) Personas & Roles (Canonical)

### 1.1 Farmer

Primary goals: - Register land and crops - Track crop stage and
readiness - Create listings / batches - Request transport - Track
fulfillment and earnings Constraints: - limited time, prefers
voice/visual UI - low English proficiency possible - phone network may
be weak

Key objects: - farmlands, crops, listings, transport_requests,
market_orders, earnings (future)

------------------------------------------------------------------------

### 1.2 Field Agent

Primary goals: - Onboard and verify farmers - Capture crop updates
(evidence media) - Create/execute tasks - Build trust and data quality
Constraints: - must operate in low connectivity - needs fast workflow,
offline-friendly caching

Key objects: - agent_farmer_assignments, agent_tasks, agent_visits,
crop_status_updates, evidence uploads

------------------------------------------------------------------------

### 1.3 Logistics / Transporter

Primary goals: - Manage vehicles - Accept transport loads - Execute
trips with proof (pickup/delivery) - Provide live tracking (GPS)
Constraints: - quick actions, minimal typing - needs proof capture -
route connectivity can be patchy

Key objects: - vehicles, trips, transport_status_events,
trip_location_events, trip_proofs

------------------------------------------------------------------------

### 1.4 Buyer

Primary goals: - Browse listings - Place orders - Track order status -
Build reliable supply relationship Constraints: - expects B2B clarity
and consistency - wants verified listings (quality/trust)

Key objects: - listings (approved), market_orders, buyer_profile

------------------------------------------------------------------------

### 1.5 Admin / Ops

Primary goals: - Monitor data health and platform activity - Manage
role/assignment changes - Approve listings (if needed) - Manage incident
response and audits Constraints: - must be audit-ready for govt
integrations and partners - must not have uncontrolled access; actions
must be logged

Key objects: - admin dashboards, audit logs, security events, seed/ops
tools

------------------------------------------------------------------------

## 2) Product Modules (MVP → V1)

### 2.1 MVP Modules (Must Ship First)

1.  Auth + role dashboards
2.  Farmer: farmland + crops + listing basic
3.  Agent: assignments + crop update + task workflow
4.  Logistics: accept load + trip state machine + proof
5.  Buyer: browse listings + order placement (basic)
6.  Admin: basic monitoring + audit access

### 2.2 V1 Expansion Modules

-   Warehouse inventory tracking
-   Cold storage booking and optimization
-   Payments/settlements
-   Govt dataset integration
-   Full traceability (QR-based)

------------------------------------------------------------------------

## 3) User Journeys (Canonical Flows)

### 3.1 Farmer Onboarding (Self or Agent-Assisted)

Goal: Create a verified farmer profile and initial crop records.

Steps: 1. Sign up with phone/password (or OTP later) 2. Choose role =
Farmer 3. Create profile (name, village, district, preferred language)
4. Add farmland(s): area, soil type, geo (optional), irrigation type 5.
Add crop(s): crop type, sowing date, expected harvest date, current
stage 6. Optional: upload crop photo evidence

Outputs: - profile row - farmland rows - crop rows - initial
notifications

Constraints: - keep steps minimal - support Kannada UI - allow
agent-assisted setup

------------------------------------------------------------------------

### 3.2 Agent Assignment & Field Verification

Goal: Ensure data quality and trust.

Steps: 1. Agent logs in 2. Sees assigned farmers list 3. Selects a
farmer → opens tasks / crop view 4. Updates crop status (with evidence
media) 5. Creates tasks: soil test, irrigation check, harvest readiness
review 6. Logs visit with geo/time and optional voice note

Outputs: - agent_tasks - crop_activity_logs - evidence uploads - audit
log events

Critical rule: - Agent can update only assigned farmers (RLS + edge
checks)

------------------------------------------------------------------------

### 3.3 Transport Request & Trip Execution

Goal: Move produce reliably with proof.

Farmer flow: 1. Farmer creates transport request (crop/listing + pickup
address + time window + quantity) 2. Request enters REQUESTED state

Logistics flow: 1. Logistics sees open/assigned requests (based on
matching) 2. Accepts load (idempotent) 3. Trip created: ASSIGNED →
EN_ROUTE 4. Pickup: requires proof media + geo/time (PICKED_UP) 5.
Delivery: requires proof media + geo/time (DELIVERED) 6. Trip closes

Outputs: - transport_requests updated - trips created/updated via RPC -
transport_status_events appended - notifications sent - GPS events
ingested (optional in MVP)

Constraints: - state machine enforced server-side (RPC) - proof required
for pickup and delivery

------------------------------------------------------------------------

### 3.4 Buyer Browse & Order Placement

Goal: Convert supply into demand with trust.

Steps: 1. Buyer logs in 2. Browses approved listings 3. Views listing
details (farmer crop, quantity, price) 4. Places order 5. Tracks status
updates

Outputs: - market_orders created (RPC) - notifications to farmer/admin -
audit logs for key status changes

MVP note: - payments can be "offline/settlement later" initially - keep
traceability baseline but avoid complexity

------------------------------------------------------------------------

### 3.5 Admin Monitoring & Governance

Goal: Maintain platform health and compliance readiness.

Admin capabilities (MVP): - view dashboards: active users, active trips,
pending requests, order stats - view audit logs and security events -
manage agent-farmer assignments - approve/flag listings if required -
run "data health checks" (missing RLS, invalid states, orphan rows)

Every admin action must be audit logged.

------------------------------------------------------------------------

## 4) Key Entities & State Machines

### 4.1 Crop Status

Suggested states: - SOWN → GROWING → READY → HARVESTED

Rules: - Agent can update status only for assigned farmers - State
changes should be logged to crop_activity_logs

### 4.2 Transport Request Status

Suggested states: - REQUESTED → ASSIGNED → CANCELLED / EXPIRED

### 4.3 Trip Status

Suggested states: - ASSIGNED → EN_ROUTE → PICKED_UP → IN_TRANSIT →
DELIVERED → CLOSED Rules: - PICKED_UP and DELIVERED require proof

### 4.4 Order Status

Suggested states: - PLACED → CONFIRMED → PACKED → SHIPPED → DELIVERED →
COMPLETED / CANCELLED

All state transitions should be RPC-enforced and audited.

------------------------------------------------------------------------

## 5) MVP Success Metrics (What "Working" Means)

MVP is successful if we can demonstrate: - 50+ farmers onboarded via
agent workflow - crop status updates verified with evidence - transport
request → trip execution end-to-end - proof captured at pickup and
delivery - buyer can place order from listing - admin dashboard shows
audit trail and activity

Operational metrics: - % empty return trips reduced (pilot baseline vs
after) - average time from request to assignment - trip completion
rate - data completeness (farmland/crops with required fields)

------------------------------------------------------------------------

## 6) UX Rules (India Phone-First + Kannada)

1.  Minimal typing. Prefer:
    -   select dropdowns
    -   voice notes
    -   photo evidence
2.  Offline-tolerant:
    -   cache last used screens and assigned farmer list
3.  Clear status indicators:
    -   "Request Sent", "Trip Assigned", "Delivered"
4.  Language toggle persistent:
    -   store in profile + local storage
5.  Low bandwidth:
    -   compress images
    -   upload in background when possible
6.  Accessibility:
    -   large tap targets
    -   clear icons

------------------------------------------------------------------------

## 7) MVP Scope Guardrails (Prevent Feature Creep)

Explicitly OUT of MVP: - full payments settlement engine - Aadhaar
storage (only capability design) - heavy AI advisory (basic logs only) -
multi-warehouse optimization engine - complex buyer bidding auctions

Explicitly IN MVP: - verified crop and trip workflows - proof capture -
role dashboards - audit logging baseline

------------------------------------------------------------------------

## 8) Engineering Constraints from Product Needs

Because the product is trust-based: - RLS + edge validation is
mandatory - assignments enforce agent scope - proof capture stored in
private buckets - audit trail required for sensitive flows - GPS
ingestion must be rate-limited and partitioned

------------------------------------------------------------------------

## 9) Cursor Build Contract

When implementing any feature, Cursor must output: 1. impacted
persona(s) and workflow step 2. impacted entities and statuses 3. DB
impact (tables/columns/indexes) 4. RLS impact (policies + helper
functions) 5. Edge/RPC impact (endpoints/contracts) 6. Storage impact
(bucket/policy) 7. Audit impact (what will be logged) 8. acceptance
criteria for the UI

------------------------------------------------------------------------

END OF PRODUCT OVERVIEW
