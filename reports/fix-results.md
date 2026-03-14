# PLATFORM FIX RESULTS

**Generated At:** 2026-03-13T18:45:00Z

---

## System Status

| Suite | Status | Score | Notes |
|-------|--------|-------|-------|
| Farmer Tests (Vitest) | PASS | 74/74 | All unit/component tests pass |
| Smoke Tests | PASS | 8/8 | All MVP workflow tests pass |
| System Check | PASS | 64/64 | All integration tests pass (was 58/64) |
| Agent Tests | PARTIAL | 51/58 | 7 remaining failures are DB-side (RLS recursion, missing geo data) |
| Logistics Tests | PARTIAL | 29/46 | Transport request accept/trip lifecycle blocked by RLS |
| Admin Tests | HUNG | ~13/15+ | Hangs on Permissions test (RLS stack depth recursion) |
| Chaos Tests | HUNG | N/A | Hangs during user provisioning (stale auth state) |

---

## Fixed Issues

### 1. Database Tests: Composite key tables queried with wrong column

**Files:** `tests/database-tests.ts`

The `user_roles` and `agent_farmer_assignments` tables use composite keys (`user_id`+`role` and `agent_id`+`farmer_id`), not a single `id` column. The test queried `.select("id")` which caused PostgREST errors.

**Fix:** Added a `COMPOSITE_KEY_TABLES` map that selects the correct column per table.

### 2. All test modules: Supabase errors displayed as `[object Object]`

**Files:** `tests/database-tests.ts`, `tests/farmer-tests.ts`, `tests/buyer-tests.ts`, `tests/logistics-tests.ts`, `tests/agent-tests.ts`, `tests/admin-tests.ts`, `tests/rls-tests.ts`, and all files in `tests/agent/`, `tests/logistics/`, `tests/admin/`

Supabase PostgREST returns error objects with a `.message` property. Throwing these raw objects produced `[object Object]` in failure reports.

**Fix:** Added `throwPg()` helper to every test module that extracts `.message` from error objects before throwing. ~100 throw sites converted across 35+ files.

### 3. Auth Tests: Session verify using wrong endpoint

**File:** `tests/auth-tests.ts`

Session verification used `/auth/v1/user` which returns 403 for tokens obtained via the `/auth/v1/token` password grant. Refresh and logout tests used `client.auth.refreshSession()` which requires an active client-side session.

**Fix:** Changed session verify to use an authenticated Supabase client query against `profiles` table (which actually validates the token works for data access). Changed refresh to use the raw `/auth/v1/token?grant_type=refresh_token` endpoint. Changed logout to use the raw `/auth/v1/logout` endpoint.

### 4. Logistics Tests: trips table schema mismatch

**File:** `tests/logistics-tests.ts`

The test inserted `pickup_location` and `notes` columns into the `trips` table, but these columns don't exist. Also used `status: "assigned"` which is not in the `trip_status` enum.

**Fix:** Removed non-existent columns from insert payload. Changed status to `"created"` (valid enum value).

### 5. RLS Tests: Crops isolation treated RLS block as failure

**File:** `tests/rls-tests.ts`

When the logistics user queried farmer's crops, RLS returned an error (permission denied). The test treated any error as a test failure, but an RLS error actually proves isolation is working.

**Fix:** Added logic to detect RLS/permission errors and treat them as passing (isolation confirmed).

### 6. Admin/RLS Tests: Profile queries used demo_tag filter

**Files:** `tests/admin-tests.ts`, `tests/rls-tests.ts`

The admin profile fetch and RLS admin elevation tests filtered by `demo_tag`, but the `handle_new_user` trigger creates profiles without `demo_tag`. The subsequent upsert may not update it if there's a timing issue.

**Fix:** Changed queries to filter by user IDs directly (from `ctx.userOf(role).userId`) instead of `demo_tag`.

### 7. User provisioning: Silent upsert failures

**File:** `tests/test-utils.ts`

The `provisionUsers()` function's profile and user_roles upserts didn't check for errors, allowing silent failures that cascaded into FK constraint violations downstream.

**Fix:** Added error checking and warning logs for profile and user_roles upserts.

### 8. Agent Tests: agent_tasks schema mismatch

**Files:** `tests/agent/tasks.test.ts`, `tests/agent/agent-dashboard.test.ts`

Tests used `status`, `title`, `description` columns but the actual schema has `task_status`, `notes` (no `title` or `description`).

**Fix:** Updated all column references to match the actual schema.

### 9. Agent Tests: agent_visits schema mismatch

**File:** `tests/agent/visits.test.ts`

Tests used `checkin_time`, `checkout_time`, `status` but the actual schema has `check_in_at`, `check_out_at` (no `status` column).

**Fix:** Updated all column references to match the actual schema.

### 10. Agent Tests: service_areas table doesn't exist

**Files:** `tests/agent/settings.test.ts`, `tests/agent/agent-system.test.ts`

Tests referenced `service_areas` table which doesn't exist. The actual table is `geo_service_areas` with FK columns (`state_id`, `district_id`, `market_id`) and a check constraint requiring at least one to be non-null.

**Fix:** Changed table name to `geo_service_areas`, updated column names, added geo reference data check before insert.

### 11. Agent Tests: farmlands schema mismatch

**Files:** `tests/agent/farmers-management.test.ts`, `tests/agent/permissions.test.ts`

Tests used `size_acres` and `state` columns which don't exist. The actual schema has `area`, `area_unit`.

**Fix:** Updated column names to match schema.

### 12. Agent Tests: crops schema mismatch

**File:** `tests/agent/farmers-management.test.ts`

Test used `farmland_id` and `crop_type` columns. The actual schema has `land_id` (no `crop_type`).

**Fix:** Updated column names, added required `status` field.

### 13. Logistics/Admin Tests: throwPg and schema fixes

**Files:** All files in `tests/logistics/` and `tests/admin/`

Applied the same `throwPg` helper and schema mismatch fixes (trips column names, farmlands columns, agent_tasks columns, transport_requests columns).

---

## Remaining Issues (Database-Side — Require Migrations)

### 1. RLS Stack Depth Recursion (CRITICAL)

**Symptom:** `stack depth limit exceeded` when agent queries `profiles` or `notifications` tables.

**Root Cause:** RLS policies on `profiles` and/or `notifications` contain recursive references (e.g., a policy that calls a function which queries the same table, triggering the same policy).

**Impact:** Agent tests hang or fail on profile reads and notification cross-user isolation. Admin Permissions test hangs indefinitely.

**Fix Required:** Migration to simplify RLS policies — break the recursion by using `auth.uid()` directly instead of helper functions that query the same table.

### 2. Missing Geo Reference Data

**Symptom:** `geo_service_areas` insert fails with check constraint violation.

**Root Cause:** `geo_states` and `geo_districts` tables are empty. The `chk_service_area_scope` constraint requires at least one FK to be non-null.

**Impact:** Agent service area CRUD tests fail.

**Fix Required:** Seed geo reference data (states, districts, markets for Karnataka).

### 3. Agent Dashboard RPC Returns Zero Counts

**Symptom:** `agent_dashboard_v1` returns 0 for `assigned_farmers` and `pending_tasks` even after seeding data.

**Root Cause:** The RPC may filter by a different criteria than what the test seeds, or the RLS recursion prevents the RPC from reading the data.

**Impact:** 2 agent dashboard tests fail.

**Fix Required:** Investigate `agent_dashboard_v1` RPC logic and ensure it counts assignments/tasks for the calling agent.

### 4. Logistics Transport Request Accept Fails

**Symptom:** Updating transport_request status from "requested" to "assigned" fails.

**Root Cause:** Likely an RLS UPDATE policy restriction or a status transition constraint.

**Impact:** Cascading failures across trip lifecycle, active trips, completed trips, and trip details tests (17 failures).

**Fix Required:** Review RLS UPDATE policy on `transport_requests` for logistics role, and check if status transitions are enforced via RPC.

### 5. Chaos/Admin Tests Hang During Provisioning

**Symptom:** Tests hang indefinitely during user provisioning or RLS-heavy queries.

**Root Cause:** The RLS stack depth recursion causes queries to loop until the PostgreSQL stack limit is hit, which takes a long time before timing out.

**Impact:** Chaos tests and admin permissions tests cannot complete.

**Fix Required:** Same as issue #1 — fix the recursive RLS policies.

---

## Files Modified

| File | Changes |
|------|---------|
| `tests/test-utils.ts` | Added error checking for profile/user_roles upserts |
| `tests/auth-tests.ts` | Rewrote session verify, refresh, and logout tests |
| `tests/database-tests.ts` | Added composite key table handling, throwPg helper |
| `tests/farmer-tests.ts` | Added throwPg helper |
| `tests/buyer-tests.ts` | Added throwPg helper |
| `tests/logistics-tests.ts` | Added throwPg, fixed trips schema (removed pickup_location/notes, fixed status enum) |
| `tests/agent-tests.ts` | Added throwPg helper |
| `tests/admin-tests.ts` | Added throwPg, changed profile query to use user IDs |
| `tests/rls-tests.ts` | Added throwPg, fixed crops isolation logic, changed admin query to use user IDs |
| `tests/agent/agent-system.test.ts` | Fixed cleanup: agent_activity_logs by agent_id, service_areas → geo_service_areas |
| `tests/agent/agent-dashboard.test.ts` | Fixed agent_tasks columns (task_status, notes) |
| `tests/agent/tasks.test.ts` | Fixed all agent_tasks column references |
| `tests/agent/visits.test.ts` | Fixed all agent_visits column references (check_in_at, check_out_at) |
| `tests/agent/settings.test.ts` | Fixed service_areas → geo_service_areas with proper columns |
| `tests/agent/farmers-management.test.ts` | Fixed farmlands (area, area_unit) and crops (land_id, status) columns |
| `tests/agent/permissions.test.ts` | Fixed farmlands columns |
| `tests/agent/my-farmers.test.ts` | Added throwPg helper |
| `tests/agent/notifications.test.ts` | Added throwPg helper |
| `tests/agent/agent-auth.test.ts` | Added throwPg helper |
| `tests/logistics/transport-requests.test.ts` | Added throwPg helper |
| `tests/logistics/trips.test.ts` | Added throwPg, fixed trip column names |
| `tests/logistics/active-trips.test.ts` | Added throwPg, fixed trip column names |
| `tests/logistics/completed-trips.test.ts` | Added throwPg, fixed trip column names |
| `tests/logistics/trip-details.test.ts` | Added throwPg helper |
| `tests/logistics/vehicles.test.ts` | Added throwPg helper |
| `tests/logistics/notifications.test.ts` | Added throwPg helper |
| `tests/logistics/settings.test.ts` | Added throwPg helper |
| `tests/logistics/logistics-auth.test.ts` | Added throwPg helper |
| `tests/logistics/logistics-dashboard.test.ts` | Added throwPg helper |
| `tests/logistics/permissions.test.ts` | Added throwPg helper |
| `tests/admin/admin-auth.test.ts` | Added throwPg helper |
| `tests/admin/admin-dashboard.test.ts` | Added throwPg, fixed farmlands columns |
| `tests/admin/farmers.test.ts` | Added throwPg, fixed farmlands columns |
| `tests/admin/agents.test.ts` | Added throwPg, fixed agent_tasks columns |
| `tests/admin/buyers.test.ts` | Added throwPg helper |
| `tests/admin/transporters.test.ts` | Added throwPg, fixed transport_requests columns |
| `tests/admin/orders.test.ts` | Added throwPg helper |
| `tests/admin/transport.test.ts` | Added throwPg, fixed trips/transport_requests columns |
| `tests/admin/tickets.test.ts` | Added throwPg helper |
| `tests/admin/ops-inbox.test.ts` | Added throwPg helper |
| `tests/admin/pending-updates.test.ts` | Added throwPg, fixed agent_tasks columns |
| `tests/admin/analytics.test.ts` | Added throwPg helper |
| `tests/admin/users.test.ts` | Added throwPg helper |
| `tests/admin/permissions.test.ts` | Added throwPg helper |

---

*Report generated by AgriNext Gen Platform Repair System*
