# Grounded agent workflow operations

## Supported product boundary

The production boundary is one workflow:

1. A platform administrator creates a tenant and adds existing accounts with `viewer`, `operator`, `approver`, or `admin` membership.
2. A tenant administrator provisions a signed-push connector. The ingestion token is returned once and only its SHA-256 hash is stored.
3. The connector submits incremental document batches with a cursor, source timestamps, role ACLs, and explicit deletion events.
4. A tenant member asks a question. PostgreSQL retrieval considers only active, fresh, non-deleted documents visible to that member's role.
5. OpenRouter receives untrusted source text as data and must return the checked-in strict JSON schema. The server independently validates the schema, exact quote provenance, document IDs, action permission, latency, and cost.
6. An optional typed `create_case` proposal becomes a persisted `pending_approval` job. A different `approver` or `admin` must approve it.
7. The separate worker process sends the approved action to the connector with a stable delivery/idempotency ID, timeout, lease recovery, bounded retries, and immutable attempt records.

All legacy registry/demo endpoints and generated gap endpoints return `410 NOT_IMPLEMENTED`. They are reference material and cannot be re-enabled through runtime configuration.

## Deployment sequence

Install from both lockfiles, migrate before starting either server or worker, and never seed automatically:

```sh
(cd backend && npm ci)
(cd frontend && npm ci)
DATABASE_URL=postgresql://localhost/agent_services_db npm --prefix backend run migrate
```

Run the API and worker as separate supervised processes:

```sh
npm --prefix backend start
npm --prefix backend run worker
```

`start.sh` is development-only convenience. It refuses occupied ports and does not install packages, create a database, migrate, seed, or kill unrelated processes.

## Bootstrap and membership

User accounts are provisioned by the deployment's identity/account administrator; public signup is intentionally outside this boundary. A platform `admin` account can create a tenant:

Provision the initial platform administrator explicitly after migrations. The command is acknowledgement-gated, does not run from `start.sh`, and refuses to replace an existing account's password or elevate its role:

```sh
BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin \
PROVISION_ADMIN_EMAIL=admin@example.com \
PROVISION_ADMIN_PASSWORD='replace-with-a-secret-manager-value' \
PROVISION_ADMIN_NAME='Platform Administrator' \
npm --prefix backend run create-admin
```

After login, `GET /api/auth/me` provides credential-dependent identity and active tenant-membership evidence.

```http
POST /api/agent-workflow/tenants
Authorization: Bearer <jwt>
Content-Type: application/json

{"name":"Production operations"}
```

Tenant API calls require `X-Tenant-ID`. An administrator adds an existing account with:

```http
POST /api/agent-workflow/members
Authorization: Bearer <jwt>
X-Tenant-ID: <tenant-uuid>
Content-Type: application/json

{"email":"approver@example.com","role":"approver"}
```

## Connector ingestion contract

Create a connector with `POST /api/agent-workflow/connectors`. Action-enabled connectors require an HTTPS action URL, the name of a deployment secret using `CONNECTOR_TOKEN_*`, and `allowedActions: ["create_case"]`. Store the returned ingestion token in the source system; it cannot be retrieved later.

Incremental sync request:

```http
POST /api/agent-workflow/connectors/<connector-uuid>/sync
X-Connector-Token: <one-time-returned-token>
Idempotency-Key: source-event-00042
Content-Type: application/json

{
  "cursor":"cursor-42",
  "documents":[{
    "sourceId":"policy-123",
    "updatedAt":"2026-07-20T12:00:00Z",
    "deleted":false,
    "title":"Production change policy",
    "content":"...",
    "sourceUrl":"https://knowledge.example/policy-123",
    "allowedRoles":["operator","approver","admin"]
  }]
}
```

Deletion propagation uses the same contract with `deleted: true`. Older source timestamps cannot overwrite or delete a newer indexed version. Reusing an idempotency key with a changed body returns a conflict. Connector listings expose `last_cursor`, `last_synced_at`, and `freshness_age_seconds`.

## Grounded run and approval contract

`POST /api/agent-workflow/runs` requires JWT, tenant header, and `Idempotency-Key`. `allowAction` defaults false. Missing fresh grounded context, invalid JSON/schema, fabricated quotes, out-of-scope document IDs, unauthorized proposals, provider failures, and budget overruns are persisted but never served as successful answers.

The provider client uses OpenRouter's strict `response_format: {type: "json_schema"}` contract with `provider.require_parameters: true`; configure a model that explicitly supports structured outputs. There is no local or mock production fallback.

Approve or reject with `POST /api/agent-workflow/jobs/:id/decision`. The creator cannot approve their own job. Approval only changes durable job state; the API process never performs the outbound action.

## Evaluation and release gates

Approvers create tenant evaluation cases at `POST /api/agent-workflow/evaluations/cases`, then score a completed run at `POST /api/agent-workflow/evaluations/run`. A gate passes only when expected-source recall, required-term coverage, schema validity, latency budget, and cost budget all pass. Store representative privacy, permission, deletion, prompt-injection, stale-source, provider-failure, and action-proposal cases per tenant before promotion.

CI applies the baseline schema and checksummed migration to blank PostgreSQL, reapplies it to prove idempotency, runs 29 unit/HTTP/database tests, builds the frontend, audits production dependencies, checks JavaScript syntax, and scans current Git plus history for common credential formats.

## Audit and incident response

Workflow events form a tenant-specific SHA-256 chain under row locking. PostgreSQL triggers reject update or deletion of audit events and tool-attempt records. Connector batches store an input hash; model outputs and tool inputs/response previews are represented by hashes in the immutable audit chain.

On a worker crash, an expired job lease becomes claimable by another worker. On provider or connector incidents, disable the connector in the database, stop the worker, preserve audit/job records, rotate the referenced deployment secret, and reconcile `running`/`retry_wait` jobs before resuming.

## External launch gates

- Provision managed PostgreSQL, connection pooling, encrypted backups, migration rehearsal, retention, restore, and disaster-recovery procedures.
- Provision production JWT, OpenRouter, and connector secrets in a secret manager; rotate any local value that was ever shared outside this ignored checkout.
- Complete OpenRouter data-processing/privacy approval and model structured-output evaluation using the selected production model.
- Complete connector provider onboarding, HTTPS endpoint allowlisting, credential issuance, idempotency certification, and failure/replay acceptance.
- Obtain security review for SSRF/egress controls, privacy/retention, tenant administration, and prompt-injection datasets.
- Establish monitoring for stale sources, rate limits, model/tool latency and cost, rejected outputs, job retries/dead letters, audit-chain verification, and on-call ownership.
