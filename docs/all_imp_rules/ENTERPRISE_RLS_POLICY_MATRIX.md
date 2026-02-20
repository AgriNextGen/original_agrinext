\% AgriNext Gen --- Enterprise RLS Policy Matrix (Production Grade) %
Version 1.0 % Generated on 2026-02-19

# ENTERPRISE_RLS_POLICY_MATRIX.md

Status: Production-Grade\
Applies To: All Supabase Environments (dev / staging / prod)\
Dependency: ENTERPRISE_SECURITY_MODEL_V2_1.md +
ENTERPRISE_DATA_ARCHITECTURE.md

This document defines complete Row-Level Security enforcement rules,
helper functions, policy templates, and SQL standards for AgriNext Gen.

Cursor must treat this document as authoritative for any schema
generation.

------------------------------------------------------------------------

# 1. Global Enforcement Rules

1.  Every table in public schema MUST have RLS enabled.
2.  No table may exist without explicit SELECT policy.
3.  INSERT/UPDATE/DELETE must be defined explicitly (never rely on
    defaults).
4.  secure schema tables are accessible ONLY via SECURITY DEFINER RPC.
5.  audit schema tables are INSERT-only (append-only).
6.  No policy may rely on frontend-provided role.
7.  Role lookup must always use public.user_roles.

------------------------------------------------------------------------

# 2. Required Helper Functions (Create First)

These must exist before defining policies.

## 2.1 current_role()

CREATE OR REPLACE FUNCTION public.current_role() RETURNS text LANGUAGE
sql STABLE AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

------------------------------------------------------------------------

## 2.2 is_admin()

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE
sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin','super_admin')
  );
$$;

------------------------------------------------------------------------

## 2.3 is_agent_assigned(farmer_id uuid)

CREATE OR REPLACE FUNCTION public.is_agent_assigned(farmer_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_farmer_assignments
    WHERE agent_id = auth.uid()
    AND farmer_id = farmer_id
  );
$$;

------------------------------------------------------------------------

# 3. Core Identity Tables

## 3.1 profiles

Enable RLS: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

Policies:

Farmer/Buyer/Logistics/Agent → SELECT own Admin → SELECT all

CREATE POLICY profiles_select_self ON public.profiles FOR SELECT USING (
user_id = auth.uid() OR public.is_admin() );

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE USING (
user_id = auth.uid() OR public.is_admin() );

No DELETE allowed.

------------------------------------------------------------------------

## 3.2 user_roles

Enable RLS.

SELECT: - user can read own role - admin can read all

INSERT/UPDATE/DELETE: - admin only

------------------------------------------------------------------------

# 4. Farmer Domain

## 4.1 farmlands

Enable RLS.

SELECT: - farmer: own rows - agent: assigned farmer rows - admin: all

Policy Example:

CREATE POLICY farmlands_select_policy ON public.farmlands FOR SELECT
USING ( farmer_id = auth.uid() OR public.is_agent_assigned(farmer_id) OR
public.is_admin() );

INSERT: - farmer own only

UPDATE: - farmer own - agent assigned - admin

DELETE: - disallowed (use soft delete)

------------------------------------------------------------------------

## 4.2 crops

Same pattern as farmlands.

------------------------------------------------------------------------

## 4.3 listings

Farmer: own Agent: assigned farmer listings (read only unless
authorized) Buyer: read approved listings only Admin: full

------------------------------------------------------------------------

# 5. Logistics Domain

## 5.1 transport_requests

SELECT: - farmer own - logistics if assigned - admin

INSERT: - farmer only

UPDATE: - logistics only when assigned - admin

------------------------------------------------------------------------

## 5.2 trips

SELECT: - logistics own transporter trips - farmer if related to their
request (read-only) - admin full

INSERT: - via RPC only

UPDATE: - via RPC only

Direct UPDATE must be blocked.

------------------------------------------------------------------------

## 5.3 trip_location_events

INSERT: - logistics only SELECT: - logistics own - farmer related
(read-only) - admin

Partitioned table policies must be inherited.

------------------------------------------------------------------------

# 6. Marketplace Domain

## 6.1 market_orders

SELECT: - buyer own - farmer where listing belongs to them - admin

INSERT: - buyer only

UPDATE: - state changes via RPC

------------------------------------------------------------------------

# 7. Warehouse Domain

## 7.1 warehouse_inventory

SELECT: - warehouse operator assigned - farmer own stock - admin

INSERT/UPDATE: - via RPC only

------------------------------------------------------------------------

# 8. secure Schema (Tier-4)

Tables:

secure.kyc_records secure.payment_events

Rules:

ALTER TABLE secure.kyc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY secure_admin_only ON secure.kyc_records FOR ALL USING
(public.is_admin());

No direct access for standard users.

Access only via SECURITY DEFINER RPC.

------------------------------------------------------------------------

# 9. audit Schema

audit.audit_logs audit.security_events

Enable RLS.

Policy:

CREATE POLICY audit_insert_only ON audit.audit_logs FOR INSERT WITH
CHECK (true);

CREATE POLICY audit_admin_read ON audit.audit_logs FOR SELECT USING
(public.is_admin());

No UPDATE. No DELETE.

------------------------------------------------------------------------

# 10. Rate Limits Table

public.rate_limits

SELECT: - admin only

INSERT/UPDATE: - via Edge function only

------------------------------------------------------------------------

# 11. Policy Coverage Checklist

Before production deploy:

\[ \] RLS enabled on all tables\
\[ \] SELECT policies defined\
\[ \] INSERT policies defined\
\[ \] UPDATE policies defined\
\[ \] DELETE restricted where needed\
\[ \] secure schema blocked\
\[ \] audit append-only verified\
\[ \] Partition tables inherit RLS\
\[ \] Admin override tested

------------------------------------------------------------------------

# 12. Cursor Contract

When generating new table, Cursor must:

1.  Add ENABLE RLS
2.  Define SELECT policy
3.  Define INSERT policy
4.  Define UPDATE policy
5.  Define DELETE policy (or restrict)
6.  Reference helper functions
7.  Include SQL in migration format

------------------------------------------------------------------------

END OF DOCUMENT
