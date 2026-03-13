# Documentation Index

> This is the central map of all project documentation. Start here.

## Quick Reference

| If you need to... | Read this |
|---|---|
| Understand the product | [PRODUCT_OVERVIEW.md](all_imp_rules/PRODUCT_OVERVIEW.md) |
| Set up a dev environment | [README.md](../README.md) + [.env.example](../.env.example) |
| Understand the codebase | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Write an Edge Function | [ENTERPRISE_EDGE_FUNCTION_STANDARD.md](all_imp_rules/ENTERPRISE_EDGE_FUNCTION_STANDARD.md) |
| Write a migration | [ENTERPRISE_DATA_ARCHITECTURE.md](all_imp_rules/ENTERPRISE_DATA_ARCHITECTURE.md) |
| Set up auth | [guides/AUTH_SETUP.md](guides/AUTH_SETUP.md) |
| Deploy to production | [all_imp_rules/DEPLOYMENT_SOP.md](all_imp_rules/DEPLOYMENT_SOP.md) |
| Test with dummy users | [guides/STAGING_SETUP.md](guides/STAGING_SETUP.md) |

---

## Enterprise Rules (`docs/all_imp_rules/`)

These are the canonical, non-negotiable rules. AI assistants and developers must follow these.

| Document | Governs | Audience |
|----------|---------|----------|
| [PRODUCT_OVERVIEW.md](all_imp_rules/PRODUCT_OVERVIEW.md) | Product domain, personas, workflows | All |
| [ENTERPRISE_DATA_ARCHITECTURE.md](all_imp_rules/ENTERPRISE_DATA_ARCHITECTURE.md) | DB schema, schema groups, migration discipline | Backend / DB |
| [ENTERPRISE_SECURITY_MODEL_V2_1.md](all_imp_rules/ENTERPRISE_SECURITY_MODEL_V2_1.md) | Threat model, security controls | All |
| [ENTERPRISE_RLS_POLICY_MATRIX.md](all_imp_rules/ENTERPRISE_RLS_POLICY_MATRIX.md) | Exact RLS policy per table | Backend / DB |
| [ENTERPRISE_EDGE_FUNCTION_STANDARD.md](all_imp_rules/ENTERPRISE_EDGE_FUNCTION_STANDARD.md) | Edge function patterns, security, response format | Backend |
| [API_CONTRACTS.md](all_imp_rules/API_CONTRACTS.md) | Full API request/response contracts | Frontend + Backend |
| [DEPLOYMENT_SOP.md](all_imp_rules/DEPLOYMENT_SOP.md) | Deployment procedures, environment separation | DevOps |
| [EXTERNAL_API_ROUTING.md](all_imp_rules/EXTERNAL_API_ROUTING.md) | External API integration rules | Backend |
| [SECRETS_AND_ENV_STANDARD.md](all_imp_rules/SECRETS_AND_ENV_STANDARD.md) | Secrets management | All |
| [RATE_LIMITING_AND_ABUSE_DETECTION.md](all_imp_rules/RATE_LIMITING_AND_ABUSE_DETECTION.md) | Rate limiting implementation | Backend |

---

## Security (`docs/security/`)

| Document | Purpose |
|----------|---------|
| [OVERVIEW.md](security/OVERVIEW.md) | Implementation-level security notes and controls |
| [THREAT_MODEL.md](security/THREAT_MODEL.md) | Structured threat model |
| [PRIORITIZED_FINDINGS.md](security/PRIORITIZED_FINDINGS.md) | Audit findings ranked by severity |

---

## Operational Guides (`docs/guides/`)

| Document | Purpose | When to read |
|----------|---------|-------------|
| [AUTH_SETUP.md](guides/AUTH_SETUP.md) | Auth config: phone login, SMTP, OAuth, P0 security checklist | Setting up auth or verifying security |
| [STAGING_SETUP.md](guides/STAGING_SETUP.md) | Dummy user provisioning and login credentials | Testing with staging data |
| [DEV_TOOLS.md](guides/DEV_TOOLS.md) | Dev role switcher and dev console usage | Local development and testing |
| [TRACE_SETTINGS.md](guides/TRACE_SETTINGS.md) | Public trace visibility config (QR pages) | Working on traceability features |

---

## Runbooks (`docs/runbooks/`)

Operational runbooks for incident response.

| Document | Scenario |
|----------|----------|
| [RB-01-webhook-failure.md](runbooks/RB-01-webhook-failure.md) | Payment webhook failures |
| [RB-02-job-worker-dead.md](runbooks/RB-02-job-worker-dead.md) | Background job worker not processing |
| [RB-03-login-bruteforce.md](runbooks/RB-03-login-bruteforce.md) | Brute-force login attempt detection |
| [RB-04-storage-failures.md](runbooks/RB-04-storage-failures.md) | File storage upload/download failures |
| [RB-05-payment-mismatch.md](runbooks/RB-05-payment-mismatch.md) | Payment amount discrepancies |
| [RB-06-offline-sync-backlog.md](runbooks/RB-06-offline-sync-backlog.md) | Offline sync queue backlog |

---

## UI (`docs/ui/`)

| Document | Purpose |
|----------|---------|
| [ui-guidelines.md](ui/ui-guidelines.md) | Lightweight UI rules for page layout, buttons, spacing, accessibility |
| [dashboard-copy-inventory.md](ui/dashboard-copy-inventory.md) | Dashboard copy and label inventory |

---

## Other

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Codebase architecture, directory structure, conventions |
| [DB_CONTRACT.md](DB_CONTRACT.md) | Implementation-level DB reference |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Pointer to the enterprise deployment SOP |
| [CLAUDE.md](../CLAUDE.md) | AI development guide (project context for AI assistants) |
| [README.md](../README.md) | Quick start and setup |
