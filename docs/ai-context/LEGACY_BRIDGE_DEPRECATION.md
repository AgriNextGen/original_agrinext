# Legacy Bridge Deprecation Plan
## transport_requests and trips tables -> Unified Logistics System

This document defines the deprecation timeline for the legacy transport
tables (`transport_requests`, `trips`, `transport_status_events`) as the
platform transitions to the unified logistics system.

------------------------------------------------

## Current State

Two logistics systems coexist:

### Legacy System (in production)
- `transport_requests` — farmer transport requests
- `trips` — transport partner trip execution
- `transport_status_events` — trip state machine events
- RPCs: `accept_transport_load_v1`, `update_trip_status_v1`, `cancel_transport_request_v1`, etc.
- Used by: `useTrips.tsx`, `useLogisticsDashboard.tsx`, `useTransportRequests.ts`
- Pages: farmer/Transport, logistics/Dashboard, logistics/ActiveTrips, logistics/TripDetail

### Unified System (newly deployed)
- `shipment_requests` — actor-agnostic shipment requests
- `shipment_items` — items per shipment
- `load_pools` / `load_pool_members` — load aggregation
- `unified_trips` / `trip_legs` — multi-stop trip execution
- `vehicle_capacity_blocks` — capacity tracking
- `reverse_load_candidates` — return trip opportunities
- `shipment_bookings` — shipment-to-trip assignments
- `route_clusters` — geography-based routing
- Services: `src/services/logistics/` (13 modules)
- Used by: `useUnifiedLogistics.tsx`, `useVehicleRecommendations.tsx`
- Pages: logistics/ForwardTrips, logistics/ReverseLoads, logistics/UnifiedTripDetail, logistics/Recommendations, logistics/CapacityView

### Bridge Layer
- `LegacyBridgeService` maps legacy records to unified records
- DB triggers auto-bridge new `transport_requests` into `shipment_requests`
- DB triggers auto-bridge new `trips` into `unified_trips`
- Foreign keys: `shipment_requests.legacy_transport_request_id`, `unified_trips.legacy_trip_id`

------------------------------------------------

## Deprecation Phases

### Phase A: Dual-Write (Current)

Status: **Active**

- Both systems operate simultaneously
- New transport requests create records in both `transport_requests` AND `shipment_requests` (via bridge triggers)
- New trips create records in both `trips` AND `unified_trips` (via bridge triggers)
- Farmer and logistics dashboards still use legacy hooks
- Vendor dashboard uses unified system directly

Risks:
- State drift if bridge triggers fail silently
- Dual write amplification on high-traffic operations

Monitoring:
- `LegacyBridgeService.checkSyncHealth()` reports unlinked records
- Admin should monitor for growing `*_unlinked` counts

### Phase B: Read Migration

Target: After MVP stabilization

- Migrate read queries in legacy hooks to unified tables:
  - `useTrips.tsx` -> query `unified_trips` instead of `trips`
  - `useLogisticsDashboard.tsx` -> query `shipment_requests` instead of `transport_requests`
  - `useTransportRequests.ts` -> query `shipment_requests` with `request_source_type = 'farmer'`
- Keep legacy write RPCs for backward compatibility
- Update farmer/Transport page to create via unified `create_shipment_request_v1`
- Update logistics pages to use `useUnifiedLogistics` hook

### Phase C: Write Migration

Target: After Phase B verified stable

- Farmer transport request creation uses `create_shipment_request_v1` instead of direct insert to `transport_requests`
- Transport load acceptance uses unified booking flow
- Trip status updates use unified trip RPCs
- Bridge triggers remain active but become safety nets

### Phase D: Legacy Table Deprecation

Target: After Phase C verified stable and all data migrated

- Mark legacy RPCs as deprecated (add deprecation warnings)
- Remove bridge triggers
- Stop writing to legacy tables
- Keep legacy tables read-only for historical data
- Redirect all queries to unified tables

### Phase E: Cleanup (Optional, Post-MVP)

- Archive legacy table data
- Remove legacy RPCs
- Remove `LegacyBridgeService`
- Remove `legacy_transport_request_id` and `legacy_trip_id` foreign keys
- Drop legacy tables only after full data migration verification

------------------------------------------------

## Tables to Deprecate

| Table | Replacement | FK Link |
|-------|-------------|---------|
| `transport_requests` | `shipment_requests` | `legacy_transport_request_id` |
| `trips` | `unified_trips` | `legacy_trip_id` |
| `transport_status_events` | `logistics_events` | None (event-based) |

## RPCs to Deprecate

| Legacy RPC | Unified RPC |
|-----------|------------|
| `accept_transport_load_v1` | `book_shipment_to_trip_v1` |
| `update_trip_status_v1` | (unified trip status RPC) |
| `cancel_transport_request_v1` | (shipment cancellation RPC) |
| `cancel_trip_v1` | (unified trip cancellation RPC) |
| `get_trips_with_context` | `TripManagementService.listTrips()` |
| `get_trip_detail_with_context` | `TripManagementService.getTripDetail()` |

## Hooks to Migrate

| Legacy Hook | Target |
|-------------|--------|
| `useTrips.tsx` | `useUnifiedLogistics.tsx` |
| `useLogisticsDashboard.tsx` (legacy queries) | Unified service calls |
| `useTransportRequests.ts` | Unified `shipment_requests` query |

------------------------------------------------

## Safety Rules

1. Never DROP legacy tables until Phase E
2. Never disable bridge triggers until Phase D
3. Always verify sync health before advancing phases
4. Maintain backward compatibility at every phase boundary
5. Any phase can be rolled back by reverting hook changes
