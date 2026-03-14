# AI API CONTRACTS
## Project: AgriNext Agricultural Coordination Platform

This document summarises the API contract rules for AI agents.

The authoritative and detailed API contracts are defined in:

docs/all_imp_rules/API_CONTRACTS.md

AI agents must read that file for full endpoint specifications.
This file provides a quick-reference summary.

------------------------------------------------

# API SURFACE

AgriNext uses three API mechanisms:

1. Direct Postgres via Supabase client (RLS protected)
   - Simple reads/writes on public tables
   - Not allowed for state transitions or multi-table writes

2. RPC Functions (Postgres functions)
   - Atomic workflows and state machines
   - Access-controlled data shaping

3. Edge Functions (Deno)
   - Operations requiring secrets
   - Rate limiting and idempotency
   - Webhooks and external API integration
   - Internal logistics orchestration

------------------------------------------------

# STANDARD RESPONSE CONTRACT

All Edge Functions and RPCs returning JSON must use this shape:

Success:

```json
{
  "success": true,
  "data": { ... }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "UPPERCASE_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

Standard error codes:

| Code | HTTP Status |
|------|-------------|
| VALIDATION_ERROR | 400 |
| UNAUTHORIZED | 401 |
| FORBIDDEN | 403 |
| NOT_FOUND | 404 |
| METHOD_NOT_ALLOWED | 405 |
| CONFLICT | 409 |
| RATE_LIMITED | 429 |
| INTERNAL | 500 |

------------------------------------------------

# DESIGN RULES

1. Single contract shape for all responses
2. Role enforcement is server-side (Edge Functions/RPC + RLS)
3. Multi-table mutations must be RPC (transactional)
4. Tier-4 access must be Edge/RPC only
5. Idempotency required for accept/confirm/payment/webhooks
6. Audit logs emitted for sensitive actions
7. Version endpoints to prevent breaking clients
8. APIs must be role-agnostic when possible
9. Logistics APIs must use the unified shipment system

------------------------------------------------

# ENDPOINT VERSIONING

Edge functions: /functions/v1/<name>
RPC functions: function_name_v1 -> function_name_v2

Always maintain backward compatibility when creating new versions.

------------------------------------------------

# LOGISTICS API ENDPOINTS

Unified logistics RPCs:

| RPC | Purpose |
|-----|---------|
| create_shipment_request_v1 | Create shipment + items |
| detect_route_cluster_v1 | Find or create route cluster |
| create_load_pool_v1 | Create load pool for route cluster |
| add_shipment_to_pool_v1 | Add shipment to pool |
| create_unified_trip_v1 | Create trip with legs + capacity |
| book_shipment_to_trip_v1 | Book shipment to trip |
| find_reverse_load_candidates_v1 | Find reverse load opportunities |
| offer_reverse_candidate_v1 | Offer reverse load to transporter |
| accept_reverse_candidate_v1 | Accept reverse load |
| decline_reverse_candidate_v1 | Decline reverse load |
| expire_reverse_candidates_v1 | Expire stale candidates |
| scan_reverse_opportunities_v1 | Scan all trips for reverse loads |

Edge Functions:

| Function | Purpose |
|----------|---------|
| logistics-orchestrator | Internal orchestration (service role) |

------------------------------------------------

# LEGACY API ENDPOINTS

These RPCs support the legacy transport system during transition:

| RPC | Purpose |
|-----|---------|
| accept_transport_load_v1 | Accept transport request |
| update_trip_status_v1 | Update legacy trip status |
| cancel_transport_request_v1 | Cancel transport request |
| cancel_trip_v1 | Cancel legacy trip |
| get_trips_with_context | List trips with context |
| get_trip_detail_with_context | Trip detail |

------------------------------------------------

# AUTH API ENDPOINTS

| Edge Function | Purpose |
|---------------|---------|
| signup-by-phone | User registration |
| login-by-phone | Phone auth with rate limiting |

------------------------------------------------

# CONTROLLER / SERVICE PATTERN

Controllers (Edge Functions) must remain thin:
- Validate input
- Call service layer or RPC
- Return standard response

Business logic must live in services (src/services/) or RPCs.

Never put domain logic in Edge Functions or page components.

------------------------------------------------

# FRONTEND API USAGE

Frontend hooks should:

1. Use React Query (useQuery / useMutation)
2. Call services from src/services/ or supabase.rpc()
3. Never use useEffect + fetch for data
4. Handle loading, error, and empty states

For detailed endpoint specifications, see:

docs/all_imp_rules/API_CONTRACTS.md
