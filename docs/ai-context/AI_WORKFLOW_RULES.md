# AI WORKFLOW RULES
## Project: AgriNext Agricultural Coordination Platform

This document defines how AI agents (Cursor, Claude, GPT, Copilot) must perform development tasks in this repository.

The goal is to ensure safe, consistent, and architecture-aligned development.

AI agents must follow these workflow rules when modifying code.

------------------------------------------------

# CORE DEVELOPMENT PRINCIPLES

1. Always analyze the repository before writing code.
2. Do not assume architecture — read project context files first.
3. Avoid destructive changes.
4. Maintain backward compatibility.
5. Prefer extending existing systems rather than rewriting them.

Before performing any change, the AI must read:

AI_SYSTEM_CONTEXT.md  
AI_DATABASE_SCHEMA.md  
AI_API_CONTRACTS.md  
AI_LOGISTICS_ENGINE.md

------------------------------------------------

# DEVELOPMENT PHASE RULES

Large features must be implemented in phases.

Example phases:

1. Architecture / Data model preparation
2. Service layer implementation
3. API layer implementation
4. Dashboard / UI integration
5. Optimization and analytics

AI agents must not attempt to implement full systems in one step.

------------------------------------------------

# REPOSITORY ANALYSIS WORKFLOW

Before coding, the AI must:

1. Scan repository structure.
2. Identify relevant modules.
3. Identify related models, services, and APIs.
4. Explain the planned modifications.

AI must present a plan before making large changes.

------------------------------------------------

# DATABASE MODIFICATION RULES

Database changes must follow safe migration practices.

Rules:

1. Never delete production tables.
2. Never rename critical columns without migration strategy.
3. Always create migration files.
4. Maintain backward compatibility with old schema.
5. Add indexes for high-frequency queries.

Example correct workflow:

Step 1: Create new table or column  
Step 2: Populate data if needed  
Step 3: Update services  
Step 4: Update APIs

------------------------------------------------

# API DEVELOPMENT RULES

All APIs must follow contracts defined in:

AI_API_CONTRACTS.md

Rules:

1. Maintain consistent request/response structure.
2. Validate user role before processing.
3. Controllers must remain thin.
4. Business logic must live in services.
5. Avoid duplicating endpoints.

------------------------------------------------

# SERVICE LAYER RULES

Backend logic must be organized into services.

Example structure:

services/
  logistics/
  farms/
  marketplace/
  vendors/

Services must contain business logic.

Controllers must only:

• validate input
• call services
• return responses

------------------------------------------------

# LOGISTICS SYSTEM RULES

All logistics operations must follow:

AI_LOGISTICS_ENGINE.md

Rules:

1. All shipments must use ShipmentRequest.
2. Shared load pooling must be supported.
3. Reverse logistics must be considered.
4. Vehicle capacity must be tracked.

Never create isolated logistics logic outside the logistics engine.

------------------------------------------------

# UI DEVELOPMENT RULES

Dashboards must be role-based.

Existing dashboards include:

Farmer Dashboard  
Agent Dashboard  
Buyer Dashboard  
Transport Dashboard  
Admin Dashboard  

Future dashboard:

Vendor Dashboard

UI changes must not break existing workflows.

------------------------------------------------

# ERROR HANDLING RULES

All services must handle errors gracefully.

Rules:

1. Validate inputs.
2. Return structured error responses.
3. Log important failures.

Example error response:

{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required fields"
  }
}

------------------------------------------------

# LOGGING & OBSERVABILITY

Important system operations must be logged.

Examples:

• shipment creation
• trip assignment
• reverse load matching
• booking confirmation

Logs help diagnose production issues.

------------------------------------------------

# TESTING RULES

AI must add tests when modifying core systems.

Important areas requiring tests:

• logistics matching
• shipment creation
• trip generation
• booking assignment

Tests should verify:

• correct behavior
• edge cases
• failure scenarios

------------------------------------------------

# SAFE REFACTORING RULES

Large refactors must follow safe patterns.

Steps:

1. Introduce new components.
2. Gradually migrate logic.
3. Maintain compatibility layer.
4. Remove legacy code only after verification.

Never replace working systems immediately.

------------------------------------------------

# PERFORMANCE CONSIDERATIONS

The system must scale to:

• millions of farmers
• thousands of transporters
• millions of shipments

AI must consider:

• query optimization
• indexing
• pagination
• caching

------------------------------------------------

# AI CODE GENERATION GUIDELINES

When writing code, AI should:

1. Follow repository conventions.
2. Use existing utilities when available.
3. Avoid unnecessary dependencies.
4. Write readable and maintainable code.
5. Comment complex logic.

------------------------------------------------

# PROHIBITED ACTIONS

AI agents must NOT:

• delete large code sections without review
• change authentication systems without approval
• modify database schema destructively
• bypass service layers
• create duplicate domain models

------------------------------------------------

# LONG TERM ENGINEERING GOAL

The system should evolve into:

A scalable AI-driven agricultural coordination platform.

It must support:

• logistics optimization
• farm intelligence
• supply chain coordination
• vendor distribution networks

AI agents must build toward this long-term architecture.
