# AI AUTONOMOUS DEVELOPMENT SYSTEM
## Project: AgriNext Agricultural Coordination Platform

This document defines how AI agents may autonomously develop large modules in this repository while preserving system architecture, safety, and backward compatibility.

All AI agents (Cursor, Claude, GPT, Copilot) must follow this document when executing multi-step development tasks.

------------------------------------------------

# PURPOSE

The purpose of this system is to allow AI-assisted development to proceed with high autonomy while avoiding:

• architectural drift
• destructive refactors
• duplicate domain logic
• broken APIs
• inconsistent database design
• unsafe multi-file edits

This repository supports a deep, multi-actor agricultural coordination platform. Autonomous AI development must be disciplined, incremental, and architecture-aware.

------------------------------------------------

# REQUIRED CONTEXT FILES

Before starting any autonomous development task, the AI must read:

1. AI_SYSTEM_CONTEXT.md
2. AI_DATABASE_SCHEMA.md
3. AI_API_CONTRACTS.md
4. AI_LOGISTICS_ENGINE.md
5. AI_WORKFLOW_RULES.md

No large task may begin before these files are read.

------------------------------------------------

# AUTONOMOUS DEVELOPMENT MODEL

AI agents must work in the following loop:

1. Understand context
2. Analyze repository
3. Define scope
4. Break work into substeps
5. Implement in safe order
6. Validate outputs
7. Summarize changes

AI must not jump directly into code generation for large modules.

------------------------------------------------

# AUTONOMY LEVELS

AI agents must classify tasks before acting.

## Level 1 — Safe Local Change
Examples:
• add a small API
• add validation
• add a test
• create a helper utility

Allowed autonomy:
High

## Level 2 — Moderate Feature Change
Examples:
• add a service
• add a new table
• connect new API to existing service
• add a dashboard section

Allowed autonomy:
Medium-high, but must explain plan first

## Level 3 — Major Domain Change
Examples:
• logistics refactor
• database domain extension
• multi-role workflow changes
• new cross-cutting module

Allowed autonomy:
Phased only

## Level 4 — Critical System Change
Examples:
• authentication changes
• production schema rewrites
• deletion of legacy components
• breaking API redesign

Allowed autonomy:
Not allowed without explicit instruction

------------------------------------------------

# TASK EXECUTION FORMAT

For all Level 2 and Level 3 tasks, the AI must follow this exact pattern.

## Step A — Repository Analysis

AI must identify:

• relevant models
• relevant controllers
• relevant services
• relevant routes
• relevant UI modules
• relevant migrations
• possible backward compatibility risks

## Step B — Implementation Plan

AI must produce a concise plan with:

1. goal
2. files likely affected
3. schema changes required
4. API changes required
5. compatibility concerns
6. tests needed

## Step C — Safe Implementation Order

AI must implement in this order whenever applicable:

1. schema / migration
2. model layer
3. service layer
4. controller / API layer
5. UI layer
6. tests
7. cleanup

Never implement UI first for backend-heavy tasks.

## Step D — Validation

AI must validate:

• build compatibility
• route compatibility
• old workflow continuity
• new workflow correctness
• migration safety

## Step E — Summary

AI must summarize:

• files changed
• new models added
• APIs created or updated
• tests added
• risks remaining

------------------------------------------------

# ARCHITECTURE SAFETY RULES

AI must never violate the platform architecture.

Required architecture layers:

1. Data Ingestion Layer
2. Core Data Platform
3. AI Decision Layer
4. Coordination & Orchestration Layer
5. Application Interfaces
6. Governance & Security Layer

AI must preserve these boundaries.

Examples:

• Controllers must not contain business logic
• Business logic must not be duplicated in UI
• Logistics matching must stay inside logistics services
• Role-specific UIs must use shared domain services

------------------------------------------------

# DOMAIN SAFETY RULES

## Logistics
All logistics flows must use canonical logistics entities.

Never invent parallel systems such as:
• farmer_transport_requests_v2
• vendor_shipping_custom
• temporary_trip_tables

All logistics must go through:
• ShipmentRequest
• ShipmentItems
• LoadPool
• Trip
• TripLeg
• VehicleCapacityBlock
• ReverseLoadCandidate
• Booking

## Marketplace
Orders and listings must remain compatible with existing buyer and farmer flows.

## Vendor domain
Vendor flows must integrate with the shared logistics system, not bypass it.

## Agent domain
Agent features must support verification and field coordination, not replicate admin logic.

------------------------------------------------

# DATABASE AUTONOMY RULES

AI may create migrations autonomously only if these rules are followed:

1. Never delete existing production tables
2. Never drop columns without migration path
3. Never rename critical fields without compatibility handling
4. Add foreign keys where safe
5. Add indexes for repeated queries
6. Avoid nullability mistakes in live systems
7. Prefer additive schema evolution

Autonomous DB changes must follow:

Phase 1: add new schema
Phase 2: backfill or connect code
Phase 3: migrate usage
Phase 4: deprecate old logic later

------------------------------------------------

# API AUTONOMY RULES

AI may generate APIs autonomously only if they follow:

• AI_API_CONTRACTS.md
• standard response format
• role validation
• thin controllers
• service-based business logic

AI must not:
• invent inconsistent endpoints
• mix old and new response shapes
• hardcode role logic in multiple places

Preferred pattern:

POST /shipments
GET /shipments/{id}
POST /trips
POST /bookings

Avoid actor-specific route sprawl unless explicitly needed.

------------------------------------------------

# UI AUTONOMY RULES

AI may autonomously build UI only after backend contracts are stable.

UI work must follow:

1. identify role
2. identify existing dashboard structure
3. add feature inside existing role shell
4. reuse shared components when available
5. maintain current navigation patterns

AI must not:
• redesign the entire dashboard unless asked
• break current role workflows
• create visually inconsistent modules

------------------------------------------------

# MULTI-FILE CHANGE RULES

For tasks touching 5 or more files, AI must work in grouped stages.

Example:

Stage 1:
models + migrations

Stage 2:
services + controllers

Stage 3:
UI + tests

Do not perform one huge unfocused edit across the repo.

------------------------------------------------

# BACKWARD COMPATIBILITY PROTOCOL

Whenever modifying an existing system, AI must assume the old flow is live.

Therefore:

1. old API contracts must continue working
2. old dashboard flows must continue working
3. compatibility adapters may be added
4. extensions are preferred over replacements

AI must never assume it is safe to remove old logic without verification.

------------------------------------------------

# TESTING PROTOCOL

AI must add tests for critical backend changes.

Minimum required tests for major modules:

## Logistics
• shipment creation
• load pooling
• trip creation
• booking assignment
• reverse load generation
• capacity calculations

## Marketplace
• listing creation
• order flow
• compatibility with logistics linkage

## Vendor
• delivery request creation
• reverse-load booking integration

## Agent
• verification creation
• demand capture validation

Test categories:
• success cases
• validation failures
• edge cases
• backward compatibility

------------------------------------------------

# ERROR HANDLING PROTOCOL

All autonomous implementations must include safe error handling.

Rules:

1. Validate input early
2. Return standard structured errors
3. Log internal failures
4. Avoid silent failures
5. Use domain-specific error codes when appropriate

------------------------------------------------

# LOGGING PROTOCOL

AI must add logs for important domain events.

Log at minimum:

• shipment created
• trip created
• load pool formed
• booking confirmed
• reverse load candidate generated
• delivery status changed
• exception raised

Logs should help production debugging without exposing sensitive data.

------------------------------------------------

# AUTONOMOUS DEVELOPMENT PATTERNS

## Pattern 1 — Additive Feature Pattern
Use when adding a feature to a stable area.

Flow:
analyze → add schema → add service → add API → add UI → test

## Pattern 2 — Compatibility Refactor Pattern
Use when refactoring legacy modules.

Flow:
analyze old system → add new layer → map old flow into new layer → keep legacy APIs alive

## Pattern 3 — Domain Expansion Pattern
Use when adding a new actor or module.

Flow:
define actor → add canonical models → integrate with shared services → add role-specific UI

Vendor dashboard development should follow Pattern 3.

## Pattern 4 — Engine Build Pattern
Use when building orchestration or matching systems.

Flow:
canonical data model → core service → utility functions → internal APIs → admin visibility → tests

Reverse logistics engine should follow Pattern 4.

------------------------------------------------

# AUTONOMOUS PHASE EXECUTION RULE

For large initiatives, AI must work phase-by-phase.

Example for logistics initiative:

Phase 1 — logistics domain refactor
Phase 2 — orchestration engine
Phase 3 — reverse logistics engine
Phase 4 — transport dashboard upgrade
Phase 5 — vendor dashboard
Phase 6 — agent reverse demand capture
Phase 7 — admin command center
Phase 8 — exception handling
Phase 9 — optimization layer
Phase 10 — production hardening

AI must never collapse all phases into a single implementation.

------------------------------------------------

# DECISION RULES FOR AMBIGUITY

When requirements are ambiguous, AI must prefer:

1. minimal safe extension
2. preserving architecture
3. preserving backward compatibility
4. using shared domain entities
5. adding internal APIs before public APIs

AI must not resolve ambiguity by inventing a parallel architecture.

------------------------------------------------

# PROHIBITED AUTONOMOUS ACTIONS

AI must NOT autonomously:

• replace auth system
• remove major tables
• delete legacy APIs
• merge unrelated domains
• bypass service layers
• invent duplicate logistics engines
• rewrite the entire frontend shell
• introduce heavy dependencies without necessity

------------------------------------------------

# GOOD AUTONOMOUS OUTPUT FORMAT

For large tasks, AI should present output in this structure:

1. Repository analysis
2. Observed current implementation
3. Gaps relative to target architecture
4. Proposed phased implementation
5. Code changes made
6. Tests added
7. Remaining risks
8. Recommended next phase

------------------------------------------------

# LONG TERM AUTONOMOUS GOAL

The goal of autonomous AI development in this repository is to help build:

A scalable agricultural coordination infrastructure connecting:

farmers
agents
buyers
transporters
vendors
storage
markets

The AI must behave like a disciplined staff engineer working inside a production-grade startup codebase.
