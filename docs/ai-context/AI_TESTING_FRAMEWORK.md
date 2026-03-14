# AI TESTING FRAMEWORK
## Project: AgriNext Agricultural Coordination Platform

This document defines the testing standards for AI-assisted development in this repository.

All AI agents (Cursor, Claude, GPT, Copilot) must follow this testing framework when implementing or modifying features.

The goal is to ensure the platform remains stable as it grows.

------------------------------------------------

# TESTING PHILOSOPHY

Testing is mandatory for all core systems.

The platform handles:

• agricultural coordination
• logistics orchestration
• marketplace transactions
• vendor distribution
• agent verification

Failures in these systems can cause major operational problems.

Therefore AI agents must always include tests when modifying critical code.

------------------------------------------------

# TEST TYPES

The platform uses multiple layers of testing.

1. Unit Tests
2. Service Tests
3. API Tests
4. Integration Tests
5. Workflow Tests

------------------------------------------------

# UNIT TESTS

Unit tests verify individual functions or modules.

Examples:

• capacity calculation
• route clustering
• shipment validation
• price calculation

Unit tests must:

• isolate the function
• mock dependencies when needed
• test edge cases

------------------------------------------------

# SERVICE TESTS

Service tests verify domain logic.

Example services:

LogisticsOrchestratorService  
LoadPoolingService  
TripGenerationService  
ReverseLogisticsService  

Service tests must validate:

• correct business logic
• correct data flow
• correct error handling

Example test:

LoadPoolingService should correctly combine shipments from the same cluster.

------------------------------------------------

# API TESTS

API tests verify endpoint behavior.

Each API must be tested for:

Success cases  
Validation failures  
Authorization failures  
Edge cases  

Example:

POST /shipments

Test cases:

Valid shipment request  
Missing required fields  
Unauthorized user  
Invalid shipment type  

------------------------------------------------

# INTEGRATION TESTS

Integration tests verify interaction between modules.

Example scenarios:

Farmer creates shipment  
Shipment enters load pool  
Transport partner accepts trip  
Trip executes successfully  

Integration tests ensure modules work together correctly.

------------------------------------------------

# WORKFLOW TESTS

Workflow tests simulate real user journeys.

Important workflows include:

Farmer produce sale flow  
Buyer order flow  
Transport logistics flow  
Vendor reverse logistics flow  

Example workflow:

1. Farmer lists produce
2. Buyer places order
3. Shipment request created
4. Trip generated
5. Transport partner accepts
6. Delivery completed

This workflow must succeed without errors.

------------------------------------------------

# LOGISTICS TESTING

The logistics engine is the most critical system.

AI agents must add tests for:

Shipment creation  
Load pooling logic  
Trip creation  
Trip leg generation  
Capacity management  
Reverse load detection  
Booking assignment  

Example test:

ReverseLogisticsService should generate a reverse load candidate when return capacity exists.

------------------------------------------------

# DATABASE TESTING

Database tests must verify:

• migrations run successfully
• foreign key relationships are valid
• data integrity is preserved

Example:

shipment_items must reference valid shipment_requests.

AI agents must test migrations before applying them.

------------------------------------------------

# EDGE CASE TESTING

AI agents must include tests for edge cases.

Examples:

Zero capacity vehicle  
Shipment cancellation mid-trip  
Driver unavailable  
Farmer harvest delay  
Vendor shipment mismatch  

Edge case testing ensures system resilience.

------------------------------------------------

# ERROR HANDLING TESTING

All services must be tested for failure conditions.

Examples:

Invalid input  
Missing data  
Unauthorized access  
Resource conflicts  

Error responses must follow the standard API format.

------------------------------------------------

# PERFORMANCE TESTING

For high-impact systems like logistics:

AI agents should test:

• load pooling performance
• trip generation scalability
• booking operations under load

Queries involving shipments and trips must be optimized.

------------------------------------------------

# BACKWARD COMPATIBILITY TESTING

When modifying existing systems, AI agents must verify:

• old APIs still function
• old workflows remain valid
• legacy database relationships still work

This prevents breaking current dashboards.

------------------------------------------------

# TEST FILE ORGANIZATION

Tests use a hybrid organization: role-based directories for domain tests,
plus specialized directories for cross-cutting concerns.

Actual structure:

tests/
  logistics/    -- logistics engine, services, integration (28 files)
  admin/        -- admin dashboard, auth, permissions (16 files)
  agent/        -- agent dashboard, tasks, farmers (11 files)
  farmer/       -- farmer dashboard, crops, listings (12 files)
  vendor/       -- vendor dashboard, shipments (3 files)
  chaos/        -- resilience testing (RLS, auth, network) (10 files)
  unit/         -- pure unit tests (utils, i18n, constants) (5 files)
  playwright/   -- E2E browser tests (1 file)
  p0/           -- P0 smoke tests and seed scripts (7 files)

Within each role directory, tests cover unit, service, API, and
integration scenarios. For example, tests/logistics/ contains:

  shipment-requests.test.ts      -- service tests
  load-pooling-service.test.ts   -- service tests
  matching-engine.test.ts        -- integration tests
  orchestration-integration.test.ts -- workflow tests
  logistics-orchestrator-api.test.ts -- API tests

AI agents should place new tests in the appropriate role directory.

------------------------------------------------

# TEST NAMING CONVENTIONS

Test names must clearly describe behavior.

Example:

test_create_shipment_success  
test_create_shipment_missing_fields  
test_reverse_load_generation  

Avoid vague names like:

test_function_works

------------------------------------------------

# AUTOMATED TEST EXECUTION

AI agents must ensure tests run automatically.

Tests must run during:

• CI pipelines
• pre-deployment checks
• major refactors

------------------------------------------------

# MINIMUM TEST REQUIREMENTS

For each major module:

Unit tests: required  
Service tests: required  
API tests: required  

Integration tests: recommended  
Workflow tests: strongly recommended

------------------------------------------------

# TEST COVERAGE TARGET

Core systems should maintain at least:

70% test coverage

Critical modules like logistics should target:

80% coverage.

------------------------------------------------

# LONG TERM TESTING GOAL

The testing framework should ensure the platform remains stable as it scales to:

• millions of farmers
• thousands of transporters
• millions of shipments

Testing is essential for maintaining reliability in a complex coordination platform.
