# AGRINEXT GEN PLATFORM FAILURE REPORT

**Generated At:** 2026-03-13T18:06:20.601Z

**Total Suites:** 7 | **Passed:** 0 | **Failed:** 7

**Total Failures:** 93

---

## Validation Summary

| Suite | Status | Failures | Duration |
|-------|--------|----------|----------|
| Smoke Tests | FAIL | 1 | 24.3s |
| System Check | FAIL | 4 | 48.5s |
| Farmer Tests | FAIL | 1 | 48.7s |
| Agent Tests | FAIL | 28 | 65.1s |
| Logistics Tests | FAIL | 18 | 46.1s |
| Admin Tests | FAIL | 39 | 170.2s |
| Chaos Tests | FAIL | 2 | 58.4s |

---

## Failure Details

### Smoke Tests

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `tests/smoke-test.ts`
- **Error:** ⚙️  override existing env vars with { override: true }
- **Category:** Backend / Database Failure

### System Check

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `unknown`
- **Error:** ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }
- **Category:** Backend / Database Failure

#### Logistics Dashboard — Create trip

- **File:** `tests/logistics-tests.ts`
- **Error:** [object Object]
- **Category:** UI / Workflow Failure
- **Suggestion:** Check trips table schema and permissions

#### Logistics Dashboard — Update trip

- **File:** `tests/logistics-tests.ts`
- **Error:** No trip ID from previous step
- **Category:** UI / Workflow Failure
- **Suggestion:** Check trips UPDATE policy

#### Logistics Dashboard — Fetch assigned trips

- **File:** `tests/logistics-tests.ts`
- **Error:** No trips found for logistics user
- **Category:** UI / Workflow Failure
- **Suggestion:** Check trips RLS SELECT policy for logistics role

### Farmer Tests

#### FarmlandsPage — renders farmland cards with names and areas

- **File:** `tests/farmer/farmlands.test.tsx`
- **Error:** Error: Test timed out in 5000ms.
- **Category:** Backend / Database Failure

### Agent Tests

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** ⚙️  enable debug logging with { debug: true }
- **Category:** Backend / Database Failure

#### Agent Dashboard — Dashboard reflects assignment

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** Expected at least 1 assigned farmer, got 0
- **Category:** UI / Workflow Failure
- **Suggestion:** Check agent_dashboard_v1 counts after seeding an assignment

#### Agent Dashboard — Dashboard reflects tasks

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** UI / Workflow Failure
- **Suggestion:** Check agent_dashboard_v1 task counts after seeding a task

#### Agent Dashboard — Direct task query

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** UI / Workflow Failure
- **Suggestion:** Check RLS SELECT policy on agent_tasks for agent role

#### My Farmers — Read assigned farmer profile

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on profiles — agent should read assigned farmer via is_agent_assigned

#### Farmers Management — Seed farmland

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check farmlands table schema and INSERT permissions for service_role

#### Farmers Management — Read assigned farmer farmlands

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** Agent cannot see assigned farmer's farmlands
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on farmlands — agent should see assigned farmer's farmlands via is_agent_assigned

#### Farmers Management — Seed crop

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No farmland ID from previous step
- **Category:** Backend / Database Failure
- **Suggestion:** Check crops table schema

#### Farmers Management — Read assigned farmer crops

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** Agent cannot see assigned farmer's crops
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on crops — agent should see assigned farmer's crops

#### Farmers Management — Cannot see unassigned farmlands

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on farmlands — agent should NOT see non-assigned farmer data

#### Agent Tasks — Fetch tasks list

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS SELECT on agent_tasks for agent role

#### Agent Tasks — Seed task (admin)

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check agent_tasks INSERT schema

#### Agent Tasks — Read task details

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No seeded task ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS SELECT on agent_tasks — agent should see own tasks

#### Agent Tasks — Agent creates task

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS INSERT on agent_tasks — agent should be able to create tasks

#### Agent Tasks — Status

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** pending → in_progress: No task ID for status update
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS UPDATE on agent_tasks — agent should update own task status

#### Agent Tasks — Status

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** in_progress → completed: No task ID for completion
- **Category:** Backend / Database Failure
- **Suggestion:** Check agent_tasks UPDATE for completion

#### Agent Tasks — Filter tasks by status

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check that status filtering works on agent_tasks

#### Agent Visits — Create visit (check-in)

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check agent_visits table schema and INSERT permissions

#### Agent Visits — Read visit details

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No visit ID from check-in step
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS SELECT on agent_visits — agent should see own visits

#### Agent Visits — In-progress state (no checkout)

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No visit ID
- **Category:** Backend / Database Failure
- **Suggestion:** Visit in 'in_progress' status should have null checkout_time

#### Agent Visits — Check-out visit

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No visit ID for checkout
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS UPDATE on agent_visits — agent should update own visits

#### Agent Visits — Fetch visits list

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS SELECT on agent_visits for full list query

#### Agent Visits — Cannot see other agent visits

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on agent_visits — agent should only see own visits

#### Agent Notifications — Cross-user isolation

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS on notifications — agent should NOT see other users' notifications

#### Agent Settings — Read service areas

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS SELECT on service_areas — agent should read own areas

#### Agent Settings — Create service area

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS INSERT on service_areas — agent should create own service areas

#### Agent Settings — Delete service area

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** No service area ID from previous step
- **Category:** Backend / Database Failure
- **Suggestion:** Check RLS DELETE on service_areas — agent should delete own service areas

#### Permissions & RLS — CANNOT read unassigned farmlands

- **File:** `tests/agent/agent-system.test.ts`
- **Error:** [object Object]
- **Category:** Role Permission / RLS Failure
- **Suggestion:** RLS on farmlands must restrict agent to assigned farmers only

### Logistics Tests

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** 🛡️ auth for agents: https://vestauth.com
- **Category:** Backend / Database Failure

#### Transport Requests — Accept load

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check transport_requests UPDATE policy and status transition

#### Transport Requests — Filter requests by status

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** Accepted request not found in assigned filter
- **Category:** Backend / Database Failure
- **Suggestion:** Check status filter logic for transport_requests

#### Trip Lifecycle — Create trip from accepted load

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips table INSERT policy and schema

#### Trip Lifecycle — Fetch trips for transporter

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trips found for logistics user
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips SELECT policy for transporter_id filter

#### Trip Lifecycle — Fetch trip detail

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID from create step
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips SELECT with detail columns

#### Trip Lifecycle — Trip status events

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** Missing trip or request ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check transport_status_events table and INSERT/SELECT policies

#### Active Trips — Fetch active trips

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No active trips found for logistics user
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips SELECT with IN filter for active statuses

#### Active Trips — Transition accepted -> pickup_done

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID from upstream test
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips UPDATE policy for status transition

#### Active Trips — Transition pickup_done -> in_transit

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips UPDATE for in_transit transition

#### Active Trips — Transition in_transit -> delivered

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips UPDATE for delivered transition

#### Active Trips — Full status event timeline

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check transport_status_events completeness

#### Completed Trips — Fetch completed trips

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No completed trips found — trip lifecycle may not have completed
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips SELECT with IN filter for delivered/completed statuses

#### Completed Trips — Completed trip data integrity

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID from upstream test
- **Category:** Backend / Database Failure
- **Suggestion:** Check trip lifecycle timestamp population

#### Completed Trips — Completed trip detail accessible

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check trip + transport_request join access after completion

#### Trip Details — Trip detail with farmer context

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID from upstream test
- **Category:** Backend / Database Failure
- **Suggestion:** Check trip -> transport_request -> profile join path

#### Trip Details — Status events timeline

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check transport_status_events ordering and completeness

#### Trip Details — Proof fields on trip

- **File:** `tests/logistics/logistics-system.test.ts`
- **Error:** No trip ID
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips pickup_proofs/delivery_proofs columns (JSONB array)

### Admin Tests

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
- **Category:** Backend / Database Failure

#### Admin Dashboard — Dashboard reflects seeded data

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** UI / Workflow Failure
- **Suggestion:** Check admin_dashboard_v1 counts after seeding farmland/crop/listing

#### User Management — Fetch profiles

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to profiles table

#### User Management — Record shape

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check profiles table schema has id, full_name, phone, district columns

#### User Management — Search by name

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin can query profiles with ILIKE filter

#### User Management — Pagination

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check that profiles table supports range-based pagination

#### Farmer Management — Query farmer profiles

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin read access to profiles + user_roles for farmer filtering

#### Farmer Management — View farmlands

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to farmlands table

#### Farmer Management — View crops

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No crops visible for farmer
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to crops table

#### Farmer Management — View listings

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to listings table

#### Agent Management — Query agent profiles

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin read access to profiles + user_roles for agent filtering

#### Agent Management — View tasks

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to agent_tasks table

#### Agent Management — View activity logs

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to agent_activity_logs table

#### Buyer Management — View buyer profile

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to profiles for buyer user

#### Buyer Management — View buyer orders

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to market_orders table

#### Transporter Management — View transport requests

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to transport_requests table

#### Order Management — Fetch orders

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to market_orders table

#### Order Management — Order details

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No order seeded — skipping detail check
- **Category:** Backend / Database Failure
- **Suggestion:** Check market_orders schema and admin read access

#### Order Management — Update order status

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No order seeded — skipping status update
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin write access to market_orders status column

#### Order Management — Order associations

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No order seeded — skipping association check
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin can join market_orders to profiles via buyer_id/farmer_id

#### Transport Coordination — Fetch transport requests

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin RLS read access to transport_requests table

#### Transport Coordination — Update transport status

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No transport request seeded
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin write access to transport_requests status column

#### Transport Coordination — Trip-request link

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No trip/transport seeded — skipping link check
- **Category:** Backend / Database Failure
- **Suggestion:** Check trips.transport_request_id FK and admin read access

#### Support Tickets — List tickets RPC

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.list_tickets_v1 RPC exists and admin has EXECUTE permission

#### Support Tickets — Seed ticket

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check support_tickets table schema and admin insert access

#### Support Tickets — Update ticket status

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No ticket seeded — skipping status update
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.update_ticket_status_v2 RPC and admin execute permission

#### Support Tickets — Assign ticket

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No ticket seeded — skipping assign
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.assign_ticket_v1 RPC and admin_users record exists

#### Support Tickets — Filter tickets by status

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.list_tickets_v1 supports status filter

#### Ops Inbox — Ops inbox RPC callable

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.get_ops_inbox_v1 RPC exists and admin has EXECUTE permission

#### Ops Inbox — Response shape

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin.get_ops_inbox_v1 returns {items: [], next_cursor: ...} shape

#### Pending Updates — Seed pending updates

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check agent_tasks insert with task_type=update

#### Pending Updates — Approve update

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No approve task seeded
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin can update agent_tasks status to 'approved'

#### Pending Updates — Reject update

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** No reject task seeded
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin can update agent_tasks status to 'rejected'

#### Platform Analytics — Cross-table counts

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** Count queries failed: 
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin has count access to profiles, crops, listings, market_orders, transport_requests

#### Platform Analytics — User-role consistency

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin read access to profiles and user_roles for consistency check

#### Platform Analytics — Time-windowed stats

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Backend / Database Failure
- **Suggestion:** Check admin can query profiles and market_orders with created_at filter

#### Permissions & RLS — CAN read all profiles

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** Admin sees only 0 profiles, expected at least 5
- **Category:** Role Permission / RLS Failure
- **Suggestion:** Admin RLS should grant read access to all profiles

#### Permissions & RLS — CAN read admin_users

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** Admin cannot read own admin_users row
- **Category:** Role Permission / RLS Failure
- **Suggestion:** Admin RLS should grant read access to admin_users

#### Permissions & RLS — CAN read notifications

- **File:** `tests/admin/admin-system.test.ts`
- **Error:** [object Object]
- **Category:** Role Permission / RLS Failure
- **Suggestion:** Admin RLS should grant read access to notifications

### Chaos Tests

#### dotenv@17.3.1 — injecting env (8) from .env -- tip

- **File:** `unknown`
- **Error:** ⚙️  specify custom .env file path with { path: '/custom/path/.env' }
- **Category:** Backend / Database Failure

#### Concurrency Collision — Module-level error

- **File:** `tests/chaos/concurrency-collision.test.ts`
- **Error:** ctx.adminClient.from(...).update(...).eq(...).catch is not a function
- **Category:** Backend / Database Failure
- **Suggestion:** Unhandled error in Concurrency Collision module

---

## Root Cause Analysis

### Backend / Database Failure

**82 failure(s) in this category.**

- Database schema drift, missing migration, or Supabase API configuration issue. A column/table referenced in code may not exist in the current database state.

**Affected tests:**

- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[FarmlandsPage]` renders farmland cards with names and areas
- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[My Farmers]` Read assigned farmer profile
- `[Farmers Management]` Seed farmland
- `[Farmers Management]` Read assigned farmer farmlands
- `[Farmers Management]` Seed crop
- `[Farmers Management]` Read assigned farmer crops
- `[Farmers Management]` Cannot see unassigned farmlands
- `[Agent Tasks]` Fetch tasks list
- `[Agent Tasks]` Seed task (admin)
- `[Agent Tasks]` Read task details
- `[Agent Tasks]` Agent creates task
- `[Agent Tasks]` Status
- `[Agent Tasks]` Status
- `[Agent Tasks]` Filter tasks by status
- `[Agent Visits]` Create visit (check-in)
- `[Agent Visits]` Read visit details
- `[Agent Visits]` In-progress state (no checkout)
- `[Agent Visits]` Check-out visit
- `[Agent Visits]` Fetch visits list
- `[Agent Visits]` Cannot see other agent visits
- `[Agent Notifications]` Cross-user isolation
- `[Agent Settings]` Read service areas
- `[Agent Settings]` Create service area
- `[Agent Settings]` Delete service area
- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[Transport Requests]` Accept load
- `[Transport Requests]` Filter requests by status
- `[Trip Lifecycle]` Create trip from accepted load
- `[Trip Lifecycle]` Fetch trips for transporter
- `[Trip Lifecycle]` Fetch trip detail
- `[Trip Lifecycle]` Trip status events
- `[Active Trips]` Fetch active trips
- `[Active Trips]` Transition accepted -> pickup_done
- `[Active Trips]` Transition pickup_done -> in_transit
- `[Active Trips]` Transition in_transit -> delivered
- `[Active Trips]` Full status event timeline
- `[Completed Trips]` Fetch completed trips
- `[Completed Trips]` Completed trip data integrity
- `[Completed Trips]` Completed trip detail accessible
- `[Trip Details]` Trip detail with farmer context
- `[Trip Details]` Status events timeline
- `[Trip Details]` Proof fields on trip
- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[User Management]` Fetch profiles
- `[User Management]` Record shape
- `[User Management]` Search by name
- `[User Management]` Pagination
- `[Farmer Management]` Query farmer profiles
- `[Farmer Management]` View farmlands
- `[Farmer Management]` View crops
- `[Farmer Management]` View listings
- `[Agent Management]` Query agent profiles
- `[Agent Management]` View tasks
- `[Agent Management]` View activity logs
- `[Buyer Management]` View buyer profile
- `[Buyer Management]` View buyer orders
- `[Transporter Management]` View transport requests
- `[Order Management]` Fetch orders
- `[Order Management]` Order details
- `[Order Management]` Update order status
- `[Order Management]` Order associations
- `[Transport Coordination]` Fetch transport requests
- `[Transport Coordination]` Update transport status
- `[Transport Coordination]` Trip-request link
- `[Support Tickets]` List tickets RPC
- `[Support Tickets]` Seed ticket
- `[Support Tickets]` Update ticket status
- `[Support Tickets]` Assign ticket
- `[Support Tickets]` Filter tickets by status
- `[Ops Inbox]` Ops inbox RPC callable
- `[Ops Inbox]` Response shape
- `[Pending Updates]` Seed pending updates
- `[Pending Updates]` Approve update
- `[Pending Updates]` Reject update
- `[Platform Analytics]` Cross-table counts
- `[Platform Analytics]` User-role consistency
- `[Platform Analytics]` Time-windowed stats
- `[dotenv@17.3.1]` injecting env (8) from .env -- tip
- `[Concurrency Collision]` Module-level error

### UI / Workflow Failure

**7 failure(s) in this category.**

- A frontend component is accessing a null/undefined value from a database query. With strictNullChecks disabled, TypeScript does not catch these at compile time.

**Affected tests:**

- `[Logistics Dashboard]` Create trip
- `[Logistics Dashboard]` Update trip
- `[Logistics Dashboard]` Fetch assigned trips
- `[Agent Dashboard]` Dashboard reflects assignment
- `[Agent Dashboard]` Dashboard reflects tasks
- `[Agent Dashboard]` Direct task query
- `[Admin Dashboard]` Dashboard reflects seeded data

### Role Permission / RLS Failure

**4 failure(s) in this category.**

- Row Level Security policy is blocking access. The RLS policy for this table may be missing, too restrictive, or the user's role is not correctly set in user_roles.

**Affected tests:**

- `[Permissions & RLS]` CANNOT read unassigned farmlands
- `[Permissions & RLS]` CAN read all profiles
- `[Permissions & RLS]` CAN read admin_users
- `[Permissions & RLS]` CAN read notifications

---

## Suggested Fix Strategy

### 1. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 2. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 3. Logistics Dashboard — Create trip

**Category:** UI / Workflow Failure

**Specific:** Check trips table schema and permissions

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 4. Logistics Dashboard — Update trip

**Category:** UI / Workflow Failure

**Specific:** Check trips UPDATE policy

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 5. Logistics Dashboard — Fetch assigned trips

**Category:** UI / Workflow Failure

**Specific:** Check trips RLS SELECT policy for logistics role

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 6. FarmlandsPage — renders farmland cards with names and areas

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 7. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 8. Agent Dashboard — Dashboard reflects assignment

**Category:** UI / Workflow Failure

**Specific:** Check agent_dashboard_v1 counts after seeding an assignment

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 9. Agent Dashboard — Dashboard reflects tasks

**Category:** UI / Workflow Failure

**Specific:** Check agent_dashboard_v1 task counts after seeding a task

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 10. Agent Dashboard — Direct task query

**Category:** UI / Workflow Failure

**Specific:** Check RLS SELECT policy on agent_tasks for agent role

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 11. My Farmers — Read assigned farmer profile

**Category:** Backend / Database Failure

**Specific:** Check RLS on profiles — agent should read assigned farmer via is_agent_assigned

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 12. Farmers Management — Seed farmland

**Category:** Backend / Database Failure

**Specific:** Check farmlands table schema and INSERT permissions for service_role

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 13. Farmers Management — Read assigned farmer farmlands

**Category:** Backend / Database Failure

**Specific:** Check RLS on farmlands — agent should see assigned farmer's farmlands via is_agent_assigned

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 14. Farmers Management — Seed crop

**Category:** Backend / Database Failure

**Specific:** Check crops table schema

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 15. Farmers Management — Read assigned farmer crops

**Category:** Backend / Database Failure

**Specific:** Check RLS on crops — agent should see assigned farmer's crops

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 16. Farmers Management — Cannot see unassigned farmlands

**Category:** Backend / Database Failure

**Specific:** Check RLS on farmlands — agent should NOT see non-assigned farmer data

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 17. Agent Tasks — Fetch tasks list

**Category:** Backend / Database Failure

**Specific:** Check RLS SELECT on agent_tasks for agent role

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 18. Agent Tasks — Seed task (admin)

**Category:** Backend / Database Failure

**Specific:** Check agent_tasks INSERT schema

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 19. Agent Tasks — Read task details

**Category:** Backend / Database Failure

**Specific:** Check RLS SELECT on agent_tasks — agent should see own tasks

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 20. Agent Tasks — Agent creates task

**Category:** Backend / Database Failure

**Specific:** Check RLS INSERT on agent_tasks — agent should be able to create tasks

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 21. Agent Tasks — Status

**Category:** Backend / Database Failure

**Specific:** Check RLS UPDATE on agent_tasks — agent should update own task status

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 22. Agent Tasks — Status

**Category:** Backend / Database Failure

**Specific:** Check agent_tasks UPDATE for completion

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 23. Agent Tasks — Filter tasks by status

**Category:** Backend / Database Failure

**Specific:** Check that status filtering works on agent_tasks

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 24. Agent Visits — Create visit (check-in)

**Category:** Backend / Database Failure

**Specific:** Check agent_visits table schema and INSERT permissions

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 25. Agent Visits — Read visit details

**Category:** Backend / Database Failure

**Specific:** Check RLS SELECT on agent_visits — agent should see own visits

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 26. Agent Visits — In-progress state (no checkout)

**Category:** Backend / Database Failure

**Specific:** Visit in 'in_progress' status should have null checkout_time

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 27. Agent Visits — Check-out visit

**Category:** Backend / Database Failure

**Specific:** Check RLS UPDATE on agent_visits — agent should update own visits

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 28. Agent Visits — Fetch visits list

**Category:** Backend / Database Failure

**Specific:** Check RLS SELECT on agent_visits for full list query

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 29. Agent Visits — Cannot see other agent visits

**Category:** Backend / Database Failure

**Specific:** Check RLS on agent_visits — agent should only see own visits

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 30. Agent Notifications — Cross-user isolation

**Category:** Backend / Database Failure

**Specific:** Check RLS on notifications — agent should NOT see other users' notifications

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 31. Agent Settings — Read service areas

**Category:** Backend / Database Failure

**Specific:** Check RLS SELECT on service_areas — agent should read own areas

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 32. Agent Settings — Create service area

**Category:** Backend / Database Failure

**Specific:** Check RLS INSERT on service_areas — agent should create own service areas

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 33. Agent Settings — Delete service area

**Category:** Backend / Database Failure

**Specific:** Check RLS DELETE on service_areas — agent should delete own service areas

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 34. Permissions & RLS — CANNOT read unassigned farmlands

**Category:** Role Permission / RLS Failure

**Specific:** RLS on farmlands must restrict agent to assigned farmers only

**General:**
1. Review RLS policies for the affected table in `ENTERPRISE_RLS_POLICY_MATRIX.md`.
2. Add or fix the RLS policy in a new migration.
3. Verify the user has the correct role in `user_roles` table.

### 35. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 36. Transport Requests — Accept load

**Category:** Backend / Database Failure

**Specific:** Check transport_requests UPDATE policy and status transition

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 37. Transport Requests — Filter requests by status

**Category:** Backend / Database Failure

**Specific:** Check status filter logic for transport_requests

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 38. Trip Lifecycle — Create trip from accepted load

**Category:** Backend / Database Failure

**Specific:** Check trips table INSERT policy and schema

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 39. Trip Lifecycle — Fetch trips for transporter

**Category:** Backend / Database Failure

**Specific:** Check trips SELECT policy for transporter_id filter

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 40. Trip Lifecycle — Fetch trip detail

**Category:** Backend / Database Failure

**Specific:** Check trips SELECT with detail columns

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 41. Trip Lifecycle — Trip status events

**Category:** Backend / Database Failure

**Specific:** Check transport_status_events table and INSERT/SELECT policies

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 42. Active Trips — Fetch active trips

**Category:** Backend / Database Failure

**Specific:** Check trips SELECT with IN filter for active statuses

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 43. Active Trips — Transition accepted -> pickup_done

**Category:** Backend / Database Failure

**Specific:** Check trips UPDATE policy for status transition

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 44. Active Trips — Transition pickup_done -> in_transit

**Category:** Backend / Database Failure

**Specific:** Check trips UPDATE for in_transit transition

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 45. Active Trips — Transition in_transit -> delivered

**Category:** Backend / Database Failure

**Specific:** Check trips UPDATE for delivered transition

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 46. Active Trips — Full status event timeline

**Category:** Backend / Database Failure

**Specific:** Check transport_status_events completeness

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 47. Completed Trips — Fetch completed trips

**Category:** Backend / Database Failure

**Specific:** Check trips SELECT with IN filter for delivered/completed statuses

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 48. Completed Trips — Completed trip data integrity

**Category:** Backend / Database Failure

**Specific:** Check trip lifecycle timestamp population

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 49. Completed Trips — Completed trip detail accessible

**Category:** Backend / Database Failure

**Specific:** Check trip + transport_request join access after completion

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 50. Trip Details — Trip detail with farmer context

**Category:** Backend / Database Failure

**Specific:** Check trip -> transport_request -> profile join path

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 51. Trip Details — Status events timeline

**Category:** Backend / Database Failure

**Specific:** Check transport_status_events ordering and completeness

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 52. Trip Details — Proof fields on trip

**Category:** Backend / Database Failure

**Specific:** Check trips pickup_proofs/delivery_proofs columns (JSONB array)

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 53. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 54. Admin Dashboard — Dashboard reflects seeded data

**Category:** UI / Workflow Failure

**Specific:** Check admin_dashboard_v1 counts after seeding farmland/crop/listing

**General:**
1. Add null-checks with `?? 'fallback'` for all DB-sourced values.
2. Add loading/error guards in the component.
3. Consider adding an ErrorBoundary wrapper.

### 55. User Management — Fetch profiles

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to profiles table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 56. User Management — Record shape

**Category:** Backend / Database Failure

**Specific:** Check profiles table schema has id, full_name, phone, district columns

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 57. User Management — Search by name

**Category:** Backend / Database Failure

**Specific:** Check admin can query profiles with ILIKE filter

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 58. User Management — Pagination

**Category:** Backend / Database Failure

**Specific:** Check that profiles table supports range-based pagination

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 59. Farmer Management — Query farmer profiles

**Category:** Backend / Database Failure

**Specific:** Check admin read access to profiles + user_roles for farmer filtering

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 60. Farmer Management — View farmlands

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to farmlands table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 61. Farmer Management — View crops

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to crops table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 62. Farmer Management — View listings

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to listings table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 63. Agent Management — Query agent profiles

**Category:** Backend / Database Failure

**Specific:** Check admin read access to profiles + user_roles for agent filtering

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 64. Agent Management — View tasks

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to agent_tasks table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 65. Agent Management — View activity logs

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to agent_activity_logs table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 66. Buyer Management — View buyer profile

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to profiles for buyer user

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 67. Buyer Management — View buyer orders

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to market_orders table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 68. Transporter Management — View transport requests

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to transport_requests table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 69. Order Management — Fetch orders

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to market_orders table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 70. Order Management — Order details

**Category:** Backend / Database Failure

**Specific:** Check market_orders schema and admin read access

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 71. Order Management — Update order status

**Category:** Backend / Database Failure

**Specific:** Check admin write access to market_orders status column

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 72. Order Management — Order associations

**Category:** Backend / Database Failure

**Specific:** Check admin can join market_orders to profiles via buyer_id/farmer_id

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 73. Transport Coordination — Fetch transport requests

**Category:** Backend / Database Failure

**Specific:** Check admin RLS read access to transport_requests table

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 74. Transport Coordination — Update transport status

**Category:** Backend / Database Failure

**Specific:** Check admin write access to transport_requests status column

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 75. Transport Coordination — Trip-request link

**Category:** Backend / Database Failure

**Specific:** Check trips.transport_request_id FK and admin read access

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 76. Support Tickets — List tickets RPC

**Category:** Backend / Database Failure

**Specific:** Check admin.list_tickets_v1 RPC exists and admin has EXECUTE permission

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 77. Support Tickets — Seed ticket

**Category:** Backend / Database Failure

**Specific:** Check support_tickets table schema and admin insert access

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 78. Support Tickets — Update ticket status

**Category:** Backend / Database Failure

**Specific:** Check admin.update_ticket_status_v2 RPC and admin execute permission

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 79. Support Tickets — Assign ticket

**Category:** Backend / Database Failure

**Specific:** Check admin.assign_ticket_v1 RPC and admin_users record exists

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 80. Support Tickets — Filter tickets by status

**Category:** Backend / Database Failure

**Specific:** Check admin.list_tickets_v1 supports status filter

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 81. Ops Inbox — Ops inbox RPC callable

**Category:** Backend / Database Failure

**Specific:** Check admin.get_ops_inbox_v1 RPC exists and admin has EXECUTE permission

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 82. Ops Inbox — Response shape

**Category:** Backend / Database Failure

**Specific:** Check admin.get_ops_inbox_v1 returns {items: [], next_cursor: ...} shape

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 83. Pending Updates — Seed pending updates

**Category:** Backend / Database Failure

**Specific:** Check agent_tasks insert with task_type=update

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 84. Pending Updates — Approve update

**Category:** Backend / Database Failure

**Specific:** Check admin can update agent_tasks status to 'approved'

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 85. Pending Updates — Reject update

**Category:** Backend / Database Failure

**Specific:** Check admin can update agent_tasks status to 'rejected'

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 86. Platform Analytics — Cross-table counts

**Category:** Backend / Database Failure

**Specific:** Check admin has count access to profiles, crops, listings, market_orders, transport_requests

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 87. Platform Analytics — User-role consistency

**Category:** Backend / Database Failure

**Specific:** Check admin read access to profiles and user_roles for consistency check

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 88. Platform Analytics — Time-windowed stats

**Category:** Backend / Database Failure

**Specific:** Check admin can query profiles and market_orders with created_at filter

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 89. Permissions & RLS — CAN read all profiles

**Category:** Role Permission / RLS Failure

**Specific:** Admin RLS should grant read access to all profiles

**General:**
1. Review RLS policies for the affected table in `ENTERPRISE_RLS_POLICY_MATRIX.md`.
2. Add or fix the RLS policy in a new migration.
3. Verify the user has the correct role in `user_roles` table.

### 90. Permissions & RLS — CAN read admin_users

**Category:** Role Permission / RLS Failure

**Specific:** Admin RLS should grant read access to admin_users

**General:**
1. Review RLS policies for the affected table in `ENTERPRISE_RLS_POLICY_MATRIX.md`.
2. Add or fix the RLS policy in a new migration.
3. Verify the user has the correct role in `user_roles` table.

### 91. Permissions & RLS — CAN read notifications

**Category:** Role Permission / RLS Failure

**Specific:** Admin RLS should grant read access to notifications

**General:**
1. Review RLS policies for the affected table in `ENTERPRISE_RLS_POLICY_MATRIX.md`.
2. Add or fix the RLS policy in a new migration.
3. Verify the user has the correct role in `user_roles` table.

### 92. dotenv@17.3.1 — injecting env (8) from .env -- tip

**Category:** Backend / Database Failure

1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

### 93. Concurrency Collision — Module-level error

**Category:** Backend / Database Failure

**Specific:** Unhandled error in Concurrency Collision module

**General:**
1. Check if the referenced column/table exists: `\dt` or `\d table_name` in psql.
2. Create a migration to add the missing schema element.
3. Run `supabase db reset` locally, then `supabase db push` for remote.

---

*Report generated by AgriNext Gen Failure Analysis System at 2026-03-13T18:06:20.601Z*
