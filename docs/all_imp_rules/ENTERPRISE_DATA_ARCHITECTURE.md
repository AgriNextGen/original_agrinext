\% AgriNext Gen --- Enterprise Data Architecture Blueprint
(Cursor-Optimized) % Version 1.0 (Investment-Grade Multi-Schema Design)
% Generated on 2026-02-19

# ENTERPRISE_DATA_ARCHITECTURE.md

Purpose: This document defines the master database structure, schema
isolation strategy, ownership rules, indexing model, partitioning
strategy, and migration discipline for AgriNext Gen.

This document MUST be treated as authoritative by Cursor and any
automation agent.

------------------------------------------------------------------------

# 1. Architectural Philosophy

AgriNext Gen uses:

• Single Supabase Project (for operational simplicity)\
• Multi-Schema Isolation (for enterprise security readiness)\
• RLS-Enforced Authorization\
• RPC-Enforced State Transitions\
• Append-Only Audit Logging\
• Partitioned High-Volume Event Tables

------------------------------------------------------------------------

# 2. Schema Design

## 2.1 public Schema (Operational Data)

Contains core application tables.

### Core Identity Tables

-   profiles
-   user_roles
-   agent_farmer_assignments

### Farmer Domain

-   farmlands
-   crops
-   crop_media
-   crop_activity_logs
-   listings

### Logistics Domain

-   transport_requests
-   trips
-   trip_location_events
-   transport_status_events
-   vehicles

### Marketplace Domain

-   market_orders

### Warehouse Domain

-   warehouses
-   warehouse_inventory
-   warehouse_stock_events

### Support Tables

-   notifications
-   rate_limits

All tables must include:

-   id (uuid primary key default gen_random_uuid())
-   created_at (timestamptz default now())
-   updated_at (timestamptz default now())

------------------------------------------------------------------------

## 2.2 secure Schema (Tier-4 Regulated Data)

Access via RPC only.

-   kyc_records
-   payment_events
-   government_dataset_links

No direct SELECT policies for non-admin users.

------------------------------------------------------------------------

## 2.3 audit Schema (Immutable Logs)

-   audit_logs
-   security_events

Append-only. No UPDATE or DELETE allowed.

------------------------------------------------------------------------

## 2.4 analytics Schema (Aggregated Data)

-   district_crop_summary
-   logistics_efficiency_metrics
-   warehouse_utilization_stats

No PII fields allowed.

------------------------------------------------------------------------

# 3. Ownership Column Standard

Every operational table must contain one of:

-   user_id (direct ownership)
-   farmer_id (if farmer-owned)
-   transporter_id (if logistics-owned)
-   buyer_id
-   warehouse_id

Ownership columns must be indexed.

Example:

CREATE INDEX idx_crops_farmer_id ON public.crops(farmer_id); CREATE
INDEX idx_trips_transporter_id ON public.trips(transporter_id);

------------------------------------------------------------------------

# 4. Indexing Strategy

## 4.1 Required Indexes

-   All foreign keys
-   All ownership columns
-   All frequently filtered status fields
-   created_at for time-based queries

## 4.2 Composite Index Examples

CREATE INDEX idx_trips_transporter_status ON
public.trips(transporter_id, status); CREATE INDEX
idx_orders_farmer_status ON public.market_orders(farmer_id, status);

------------------------------------------------------------------------

# 5. High-Volume Partition Strategy (GPS + Events)

trip_location_events must be partitioned by month.

Example:

CREATE TABLE public.trip_location_events_2026_01 PARTITION OF
public.trip_location_events FOR VALUES FROM ('2026-01-01') TO
('2026-02-01');

Retention Policy: - Raw GPS points retained for 90 days - Aggregated
routes retained long-term

------------------------------------------------------------------------

# 6. State Machine Enforcement Tables

transport_status_events warehouse_stock_events payment_events

All must be append-only.

Status changes only through RPC.

------------------------------------------------------------------------

# 7. Soft Delete Policy

No DELETE for: - financial data - regulated data - audit logs

Use:

is_deleted boolean default false

Deletion must insert audit record.

------------------------------------------------------------------------

# 8. Migration Discipline

All changes must:

1.  Be additive
2.  Use versioned SQL files
3.  Never drop columns in production
4.  Test in staging
5.  Include RLS updates

------------------------------------------------------------------------

# 9. Data Retention & Cleanup

-   GPS raw: 90 days
-   Logs: 1 year minimum
-   Analytics: indefinite
-   Tier-4: follow regulatory requirement

Cleanup via scheduled Edge Function or cron.

------------------------------------------------------------------------

# 10. Future Scalability Plan

When scaling globally:

Option A: - Multi-region Supabase projects per geography

Option B: - Read replicas for analytics

Option C: - Separate payment microservice

------------------------------------------------------------------------

# 11. Cursor Build Requirements

When generating new tables, Cursor must:

1.  Specify schema
2.  Define ownership column
3.  Enable RLS
4.  Define policies
5.  Define indexes
6.  Specify audit impact
7.  Specify migration file name

------------------------------------------------------------------------

END OF DOCUMENT
