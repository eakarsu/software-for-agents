# Completeness Review: software-for-agents

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 113 project files (97 source files), 3 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for AI/agent platform. Generated gap/demo patterns are present: it contains 97 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Replace generic prompt wrappers with typed domain tools, grounded retrieval, provenance, and schema-validated outputs.
2. Add tenant-scoped connectors, permission-aware indexing, incremental sync, deletion propagation, and source freshness indicators.
3. Implement evaluation datasets, quality/safety gates, cost and latency budgets, tracing, and human approval checkpoints.
4. Run tools in isolated jobs with timeouts, retries, idempotency, rate limits, and auditable input/output records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `frontend/src/App.tsx:23`
- `backend/routes/sample_data.js:5`
- `backend/server.js`
- `backend/middleware/auth.js`
- `requirements.txt`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one AI/agent platform workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

The recommended bounded workflow is now implemented: tenant-scoped connector ingestion, permission-aware grounded retrieval, strict schema-validated answers with exact provenance, separate human approval, and isolated connector-action jobs. It is production-shaped but remains launch-gated by real provider onboarding, security review, evaluation data, and operations ownership.

### Needed-feature status

1. **Typed tools, grounding, provenance, and validated output — implemented for the bounded workflow.** `backend/lib/openrouter-client.js` sends retrieved tenant documents as untrusted data and requires OpenRouter strict JSON-schema output. `backend/lib/workflow-schema.js` and `backend/lib/workflow-service.js` independently reject additional fields, invalid JSON/schema, citations outside the retrieved set, non-exact quotes, missing answer markers, unsupported tools, unauthorized proposals, invalid usage accounting, and latency/cost overruns. The only side-effecting domain tool is typed `create_case`; there is no generic prompt-to-tool executor or production fallback.
2. **Tenant connectors, ACL indexing, incremental sync, deletion, and freshness — implemented.** The checked-in migration adds tenants/memberships, hashed-token connectors, idempotent sync records, role ACLs, source timestamps, cursors, active-document search, and deletion propagation. Older source events cannot replace newer content. Connector reads expose last cursor, last sync, and freshness age. Every production workflow query is bound to a database-verified tenant membership.
3. **Evaluations, quality/safety gates, budgets, tracing, and approval — implemented.** Runs persist retrieved document IDs, provider output/error, schema status, citation coverage, model, tokens, cost, latency, and budgets. Tenant evaluation cases score expected-source recall, required-term coverage, schema validity, cost, and latency. A proposed action remains `pending_approval`; its creator cannot approve it, and only a different `approver` or `admin` can release it.
4. **Isolated execution jobs — implemented for HTTPS connector actions.** The API only enqueues. `backend/workers/tool-executor.js` is a separate worker process using row locks, leases, expired-lease recovery, per-attempt timeouts, bounded exponential retry, maximum attempts, stable delivery/idempotency IDs, credential references, and persisted input/output attempt records. It cannot execute local shell, code, arbitrary URLs, or model-selected tool names.
5. **Risk-based tests and CI — implemented.** `.github/workflows/grounded-agent-workflow.yml` provisions blank PostgreSQL, installs both lockfiles, applies the baseline and checksummed migration twice, runs all backend tests, builds the frontend, audits production dependencies, syntax-checks operational JavaScript, and scans tracked files plus Git history for credential formats.

### Safe boundaries and risk corrections

- Generic AI wrappers, registry/sample CRUD, simulated webhooks/sandboxes, generated gap endpoints, marketplace concepts, and generated feature pages are not advertised as implemented. Their API prefixes always return `410 NOT_IMPLEMENTED`; relevant UI files render a reference-only boundary and the production router exposes only the grounded workflow.
- Auth now fails closed without a 32-character JWT secret, pins HS256 plus issuer/audience, issues eight-hour tokens, returns memberships from the database, and requires `X-Tenant-ID` with an active membership for every workflow operation.
- CORS uses an explicit allowlist. Connector action URLs must be HTTPS without embedded credentials or fragments; deployment secrets are referenced only through the `CONNECTOR_TOKEN_*` namespace.
- Workflow events form a per-tenant SHA-256 chain under row locks. PostgreSQL triggers reject update/deletion of audit events and tool attempt records; connector inputs and model/tool outputs are hashed into durable records.
- `start.sh` no longer kills processes, creates databases, installs dependencies, migrates, or seeds. It refuses occupied ports and starts only already-installed development processes; migrations and the worker are explicit operational steps.
- `.env` and `backend/.env` are ignored local files, not tracked in current Git or its path history. Their values were not copied into source; operators must rotate any value that was ever shared outside this checkout. `.env.example` contains names and placeholders only.

### Verification evidence

- Clean `npm ci` from both lockfiles: passed.
- Blank PostgreSQL baseline plus `001_tenant_agent_workflow.sql`: passed; second migration run was idempotent and the checksum remained recorded.
- Node test runner: **29 tests passed, 0 failed** across unit, HTTP-boundary, and real PostgreSQL integration coverage.
- Covered failures include tenant isolation, role ACLs, invalid connector tokens, sync replay/body conflict, deletion propagation, no-fresh-context refusal, model schema/provenance rejection, run idempotency conflict, rate limiting, cost gating, creator self-approval rejection, retryable connector failure, stable delivery identity, expired worker lease recovery, evaluation gating, and database audit/attempt immutability.
- Frontend TypeScript and Vite 8.1.5 optimized production build: passed.
- Full backend and frontend dependency audits: **0 vulnerabilities**.
- JavaScript syntax checks, `git diff --check`, current-tree credential scan, and Git-history credential scan: passed.
- Independent handoff verification repeated both clean installs, blank-database migration plus no-op replay, all 29 tests, the frontend build, zero-finding low-threshold production audits, diff/custom secret checks, and configured current/full-history Gitleaks. CI database/JWT values are now per-run, full history is fetched, and Gitleaks is an explicit gate.

### External launch gates

- Provision managed PostgreSQL, connection pooling, encrypted backup/restore, retention, migration rehearsal, and disaster recovery.
- Provision production JWT, OpenRouter, and connector secrets through a secret manager; rotate any local credential that was previously shared.
- Complete OpenRouter privacy/data-processing approval, choose a structured-output-capable model, and run tenant-specific prompt-injection, privacy, permission, stale-source, cost, latency, and grounded-quality datasets.
- Complete connector provider onboarding, HTTPS egress allowlisting, action credential issuance, idempotency/replay certification, and failure acceptance testing.
- Obtain security review for tenant administration, SSRF/DNS-rebinding and egress controls, data retention/deletion, audit-chain verification, and incident procedures.
- Establish monitoring and alerts for source freshness, provider failures, rejected outputs, rate/cost budgets, approval queues, worker leases/retries/dead letters, database health, and on-call ownership; obtain human operator/customer acceptance.

Provider contracts, API examples, deployment steps, evaluation gates, and incident procedures are documented in `AGENT_WORKFLOW_OPERATIONS.md`.
