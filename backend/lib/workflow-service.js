const crypto = require('crypto');
const { WorkflowError } = require('./errors');
const { appendAudit, stableJson, withTransaction } = require('./workflow-audit');
const { ROLES, validateAnswer, validateSync, validationErrors } = require('./workflow-schema');

const WRITE_ROLES = ['operator', 'approver', 'admin'];
const APPROVAL_ROLES = ['approver', 'admin'];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requireRole(actor, allowed) {
  if (!actor || !allowed.includes(actor.role)) {
    throw new WorkflowError('FORBIDDEN', 'The tenant role is not permitted to perform this operation', 403, false);
  }
}

function requireIdempotencyKey(key) {
  if (!key || typeof key !== 'string' || key.length > 160) {
    throw new WorkflowError('IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required', 400, false);
  }
}

function parsePositiveNumber(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function validateHttpsUrl(raw, field) {
  if (!raw) return null;
  let parsed;
  try { parsed = new URL(raw); } catch {
    throw new WorkflowError('INVALID_URL', `${field} must be a valid HTTPS URL`, 400, false);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) {
    throw new WorkflowError('INVALID_URL', `${field} must be HTTPS without credentials or fragments`, 400, false);
  }
  return parsed.toString();
}

function validateModelOutput(output, documents, actor, allowAction) {
  if (!validateAnswer(output)) {
    throw new WorkflowError('MODEL_SCHEMA_INVALID', 'Model output failed the required schema', 422, false, validationErrors(validateAnswer));
  }
  const byId = new Map(documents.map((document) => [document.id, document]));
  const seen = new Set();
  for (const citation of output.citations) {
    const document = byId.get(citation.documentId);
    if (!document) {
      throw new WorkflowError('PROVENANCE_INVALID', 'Model cited a document outside the retrieved tenant context', 422, false);
    }
    if (!document.content.includes(citation.quote)) {
      throw new WorkflowError('PROVENANCE_INVALID', 'Model citation quote was not an exact source substring', 422, false);
    }
    if (!output.answer.includes(`[source:${citation.documentId}]`)) {
      throw new WorkflowError('PROVENANCE_INVALID', 'Each citation must be referenced in the answer', 422, false);
    }
    seen.add(citation.documentId);
  }
  if (output.proposedAction) {
    if (!allowAction || !WRITE_ROLES.includes(actor.role)) {
      throw new WorkflowError('ACTION_NOT_ALLOWED', 'This run may not propose a side-effecting action', 422, false);
    }
    const connector = documents.find((document) => document.connector_id === output.proposedAction.connectorId);
    if (!connector || !connector.action_url || !connector.allowed_actions.includes(output.proposedAction.action)) {
      throw new WorkflowError('ACTION_NOT_ALLOWED', 'The proposed action is not registered on a retrieved connector', 422, false);
    }
  }
  return { citationCoverage: output.citations.length ? seen.size / output.citations.length : 0 };
}

function createWorkflowService({ pool, modelClient, now = () => new Date(), uuid = () => crypto.randomUUID() }) {
  if (!pool) throw new Error('pool is required');
  if (!modelClient) throw new Error('modelClient is required');

  async function createTenant(globalActor, { name }) {
    if (!globalActor || globalActor.globalRole !== 'admin') {
      throw new WorkflowError('FORBIDDEN', 'Only a platform administrator can create a tenant', 403, false);
    }
    if (!name || typeof name !== 'string' || name.trim().length > 160) {
      throw new WorkflowError('BAD_INPUT', 'Tenant name is required', 400, false);
    }
    return withTransaction(pool, async (client) => {
      const tenantId = uuid();
      await client.query('INSERT INTO tenants (id, name) VALUES ($1, $2)', [tenantId, name.trim()]);
      await client.query(
        'INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1, $2, $3)',
        [tenantId, globalActor.userId, 'admin']
      );
      await appendAudit(client, {
        tenantId,
        actorType: 'user',
        actorId: globalActor.userId,
        eventType: 'tenant.created',
        entityType: 'tenant',
        entityId: tenantId,
        data: { name: name.trim() }
      });
      return { id: tenantId, name: name.trim(), role: 'admin' };
    });
  }

  async function createConnector(actor, input) {
    requireRole(actor, ['admin']);
    const name = String(input.name || '').trim();
    if (!name || name.length > 160) throw new WorkflowError('BAD_INPUT', 'Connector name is required', 400, false);
    const actionUrl = validateHttpsUrl(input.actionUrl, 'actionUrl');
    const allowedActions = Array.isArray(input.allowedActions) ? [...new Set(input.allowedActions)] : [];
    if (allowedActions.some((action) => action !== 'create_case')) {
      throw new WorkflowError('BAD_INPUT', 'Only the typed create_case action is supported', 400, false);
    }
    const actionTokenEnv = input.actionTokenEnv || null;
    if (actionTokenEnv && !/^CONNECTOR_TOKEN_[A-Z0-9_]+$/.test(actionTokenEnv)) {
      throw new WorkflowError('BAD_INPUT', 'actionTokenEnv must use the CONNECTOR_TOKEN_* namespace', 400, false);
    }
    if ((actionUrl && !actionTokenEnv) || (!actionUrl && (actionTokenEnv || allowedActions.length))) {
      throw new WorkflowError('BAD_INPUT', 'Action URL, credential reference, and allowed action must be configured together', 400, false);
    }
    const token = `cni_${crypto.randomBytes(32).toString('base64url')}`;
    const connectorId = uuid();
    const row = await withTransaction(pool, async (client) => {
      const result = await client.query(
        `INSERT INTO knowledge_connectors
           (id, tenant_id, name, ingestion_token_hash, action_url, action_token_env, allowed_actions, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, tenant_id, name, kind, action_url, action_token_env, allowed_actions, status, created_at`,
        [connectorId, actor.tenantId, name, sha256(token), actionUrl, actionTokenEnv, allowedActions, actor.userId]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        eventType: 'connector.created',
        entityType: 'connector',
        entityId: connectorId,
        data: { name, actionConfigured: !!actionUrl, allowedActions }
      });
      return result.rows[0];
    });
    return { ...row, ingestionToken: token };
  }

  async function addMember(actor, input) {
    requireRole(actor, ['admin']);
    const email = String(input.email || '').trim().toLowerCase();
    const role = String(input.role || '');
    if (!email || !ROLES.includes(role)) throw new WorkflowError('BAD_INPUT', 'A valid email and tenant role are required', 400, false);
    return withTransaction(pool, async (client) => {
      const user = await client.query('SELECT id, email, name FROM users WHERE lower(email) = $1', [email]);
      if (!user.rows[0]) throw new WorkflowError('USER_NOT_FOUND', 'The platform account must be provisioned before tenant membership', 404, false);
      const result = await client.query(
        `INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING tenant_id, user_id, role, created_at`,
        [actor.tenantId, user.rows[0].id, role]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        eventType: 'tenant.member_upserted',
        entityType: 'tenant_member',
        entityId: user.rows[0].id,
        data: { role }
      });
      return { ...result.rows[0], email: user.rows[0].email, name: user.rows[0].name };
    });
  }

  async function ingest(connectorId, token, idempotencyKey, batch) {
    requireIdempotencyKey(idempotencyKey);
    if (!validateSync(batch)) {
      throw new WorkflowError('BAD_INPUT', 'Connector sync payload is invalid', 400, false, validationErrors(validateSync));
    }
    const sourceIds = new Set();
    for (const document of batch.documents) {
      if (sourceIds.has(document.sourceId)) throw new WorkflowError('BAD_INPUT', 'sourceId must be unique within a sync batch', 400, false);
      sourceIds.add(document.sourceId);
      if (!Number.isFinite(Date.parse(document.updatedAt))) throw new WorkflowError('BAD_INPUT', 'updatedAt must be an ISO timestamp', 400, false);
      if (document.sourceUrl) validateHttpsUrl(document.sourceUrl, 'sourceUrl');
    }
    const connectorResult = await pool.query('SELECT * FROM knowledge_connectors WHERE id = $1 AND status = $2', [connectorId, 'active']);
    const connector = connectorResult.rows[0];
    if (!connector) throw new WorkflowError('CONNECTOR_NOT_FOUND', 'Connector not found', 404, false);
    const supplied = Buffer.from(sha256(String(token || '')), 'hex');
    const expected = Buffer.from(connector.ingestion_token_hash, 'hex');
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
      throw new WorkflowError('CONNECTOR_UNAUTHORIZED', 'Connector token is invalid', 401, false);
    }
    const inputHash = sha256(stableJson(batch));
    return withTransaction(pool, async (client) => {
      const syncId = uuid();
      const inserted = await client.query(
        `INSERT INTO connector_syncs
           (id, tenant_id, connector_id, idempotency_key, cursor, input_hash, status)
         VALUES ($1,$2,$3,$4,$5,$6,'processing')
         ON CONFLICT (connector_id, idempotency_key) DO NOTHING
         RETURNING *`,
        [syncId, connector.tenant_id, connector.id, idempotencyKey, batch.cursor, inputHash]
      );
      if (!inserted.rows[0]) {
        const replay = await client.query(
          'SELECT * FROM connector_syncs WHERE connector_id = $1 AND idempotency_key = $2 FOR UPDATE',
          [connector.id, idempotencyKey]
        );
        if (replay.rows[0].input_hash !== inputHash) {
          throw new WorkflowError('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with a different sync payload', 409, false);
        }
        if (replay.rows[0].status !== 'completed') {
          throw new WorkflowError('SYNC_IN_PROGRESS', 'The original sync has not completed', 409, true);
        }
        return { ...replay.rows[0], replayed: true };
      }

      let upsertedCount = 0;
      let deletedCount = 0;
      for (const document of batch.documents) {
        if (document.deleted) {
          const deleted = await client.query(
            `UPDATE knowledge_documents
                SET deleted_at = NOW(), source_updated_at = $3
              WHERE connector_id = $1 AND source_id = $2
                AND source_updated_at <= $3::timestamptz AND deleted_at IS NULL`,
            [connector.id, document.sourceId, document.updatedAt]
          );
          deletedCount += deleted.rowCount;
          continue;
        }
        const result = await client.query(
          `INSERT INTO knowledge_documents
             (id, tenant_id, connector_id, source_id, title, content, source_url, content_hash,
              allowed_roles, source_updated_at, deleted_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL)
           ON CONFLICT (connector_id, source_id) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             source_url = EXCLUDED.source_url,
             content_hash = EXCLUDED.content_hash,
             allowed_roles = EXCLUDED.allowed_roles,
             source_updated_at = EXCLUDED.source_updated_at,
             indexed_at = NOW(),
             deleted_at = NULL
           WHERE knowledge_documents.source_updated_at <= EXCLUDED.source_updated_at
           RETURNING id`,
          [uuid(), connector.tenant_id, connector.id, document.sourceId, document.title,
            document.content, document.sourceUrl || null, sha256(document.content),
            document.allowedRoles, document.updatedAt]
        );
        upsertedCount += result.rowCount;
      }
      await client.query(
        `UPDATE knowledge_connectors
            SET last_cursor = $2, last_synced_at = NOW()
          WHERE id = $1`,
        [connector.id, batch.cursor]
      );
      const completed = await client.query(
        `UPDATE connector_syncs
            SET status = 'completed', upserted_count = $2, deleted_count = $3, completed_at = NOW()
          WHERE id = $1 RETURNING *`,
        [syncId, upsertedCount, deletedCount]
      );
      await appendAudit(client, {
        tenantId: connector.tenant_id,
        actorType: 'connector',
        actorId: connector.id,
        eventType: 'connector.sync_completed',
        entityType: 'connector_sync',
        entityId: syncId,
        data: { cursor: batch.cursor, upsertedCount, deletedCount }
      });
      return { ...completed.rows[0], replayed: false };
    });
  }

  async function hydrateRun(actor, runId) {
    const result = await pool.query(
      `SELECT r.*,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'documentId', c.document_id, 'quote', c.quote, 'sourceUrl', c.source_url
              )) FILTER (WHERE c.document_id IS NOT NULL), '[]') AS citations,
              COALESCE(json_agg(DISTINCT jsonb_build_object(
                'id', j.id, 'status', j.status, 'action', j.action, 'attemptCount', j.attempt_count,
                'approvedAt', j.approved_at, 'completedAt', j.completed_at, 'errorCode', j.error_code
              )) FILTER (WHERE j.id IS NOT NULL), '[]') AS jobs
         FROM agent_runs r
         LEFT JOIN agent_citations c ON c.run_id = r.id
         LEFT JOIN tool_jobs j ON j.run_id = r.id
        WHERE r.id = $1 AND r.tenant_id = $2
        GROUP BY r.id`,
      [runId, actor.tenantId]
    );
    if (!result.rows[0]) throw new WorkflowError('RUN_NOT_FOUND', 'Agent run not found', 404, false);
    return result.rows[0];
  }

  async function startRun(actor, idempotencyKey, inputHash, question, budgets) {
    return withTransaction(pool, async (client) => {
      const existing = await client.query(
        'SELECT id, input_hash FROM agent_runs WHERE tenant_id = $1 AND user_id = $2 AND idempotency_key = $3 FOR UPDATE',
        [actor.tenantId, actor.userId, idempotencyKey]
      );
      if (existing.rows[0]) {
        if (existing.rows[0].input_hash !== inputHash) {
          throw new WorkflowError('IDEMPOTENCY_CONFLICT', 'Idempotency key was reused with different run input', 409, false);
        }
        return { replayId: existing.rows[0].id };
      }

      const rateLimit = Math.floor(parsePositiveNumber(process.env.AGENT_RUNS_PER_MINUTE, 20, 1, 1000));
      const limited = await client.query(
        `INSERT INTO agent_rate_limits (tenant_id, user_id, bucket_start, request_count)
         VALUES ($1,$2,date_trunc('minute', NOW()),1)
         ON CONFLICT (tenant_id, user_id, bucket_start)
         DO UPDATE SET request_count = agent_rate_limits.request_count + 1
         RETURNING request_count`,
        [actor.tenantId, actor.userId]
      );
      if (limited.rows[0].request_count > rateLimit) {
        throw new WorkflowError('RATE_LIMITED', 'Tenant agent-run rate limit exceeded', 429, true, { retryAfterSeconds: 60 });
      }
      const runId = uuid();
      await client.query(
        `INSERT INTO agent_runs
           (id, tenant_id, user_id, idempotency_key, input_hash, question, status, latency_budget_ms, cost_budget_usd)
         VALUES ($1,$2,$3,$4,$5,$6,'running',$7,$8)`,
        [runId, actor.tenantId, actor.userId, idempotencyKey, inputHash, question, budgets.latencyMs, budgets.costUsd]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        eventType: 'agent_run.started',
        entityType: 'agent_run',
        entityId: runId,
        data: { latencyBudgetMs: budgets.latencyMs, costBudgetUsd: budgets.costUsd }
      });
      return { runId };
    });
  }

  async function rejectRun(actor, runId, code, providerOutput, providerError) {
    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE agent_runs SET status = 'rejected', schema_valid = FALSE, error_code = $2,
          provider_output = $3, provider_error = $4, completed_at = NOW() WHERE id = $1`,
        [runId, code, providerOutput || null, providerError || null]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'system',
        eventType: 'agent_run.rejected',
        entityType: 'agent_run',
        entityId: runId,
        data: { errorCode: code, outputHash: providerOutput ? sha256(stableJson(providerOutput)) : null }
      });
    });
  }

  async function ask(actor, { idempotencyKey, question, allowAction = false, latencyBudgetMs, costBudgetUsd }) {
    requireRole(actor, ROLES);
    requireIdempotencyKey(idempotencyKey);
    const normalizedQuestion = String(question || '').trim();
    if (normalizedQuestion.length < 3 || normalizedQuestion.length > 2000) {
      throw new WorkflowError('BAD_INPUT', 'Question must contain 3 to 2000 characters', 400, false);
    }
    const budgets = {
      latencyMs: Math.floor(parsePositiveNumber(latencyBudgetMs, process.env.AGENT_LATENCY_BUDGET_MS || 8000, 500, 30000)),
      costUsd: parsePositiveNumber(costBudgetUsd, process.env.AGENT_COST_BUDGET_USD || 0.05, 0.000001, 10)
    };
    const inputHash = sha256(stableJson({ question: normalizedQuestion, allowAction: !!allowAction, budgets }));
    const started = await startRun(actor, idempotencyKey, inputHash, normalizedQuestion, budgets);
    if (started.replayId) return { ...(await hydrateRun(actor, started.replayId)), replayed: true };
    const runId = started.runId;

    const maxStalenessMinutes = Math.floor(parsePositiveNumber(process.env.SOURCE_MAX_STALENESS_MINUTES, 1440, 1, 525600));
    const retrieved = await pool.query(
      `WITH terms AS (
         SELECT tsvector_to_array(to_tsvector('english', $2)) lexemes
       ), q AS (
         SELECT to_tsquery('english', array_to_string(lexemes, ' | ')) query FROM terms
       )
       SELECT d.*, c.last_synced_at, c.action_url, c.allowed_actions,
              ts_rank(to_tsvector('english', COALESCE(d.title,'') || ' ' || COALESCE(d.content,'')), q.query) rank,
              EXTRACT(EPOCH FROM (NOW() - c.last_synced_at))::integer AS freshness_age_seconds
         FROM knowledge_documents d
         JOIN knowledge_connectors c ON c.id = d.connector_id
         CROSS JOIN q
        WHERE d.tenant_id = $1
          AND d.deleted_at IS NULL
          AND c.status = 'active'
          AND c.last_synced_at >= NOW() - ($4::text || ' minutes')::interval
          AND $3 = ANY(d.allowed_roles)
          AND to_tsvector('english', COALESCE(d.title,'') || ' ' || COALESCE(d.content,'')) @@ q.query
        ORDER BY rank DESC, d.source_updated_at DESC
        LIMIT 8`,
      [actor.tenantId, normalizedQuestion, actor.role, maxStalenessMinutes]
    );
    const documents = retrieved.rows;
    if (!documents.length) {
      await rejectRun(actor, runId, 'NO_FRESH_GROUNDED_CONTEXT');
      throw new WorkflowError('NO_FRESH_GROUNDED_CONTEXT', 'No fresh source visible to this tenant role matched the question', 422, false);
    }
    await pool.query('UPDATE agent_runs SET retrieved_document_ids = $2 WHERE id = $1', [runId, documents.map((document) => document.id)]);

    let provider;
    try {
      provider = await modelClient.answer({
        question: normalizedQuestion,
        documents,
        timeoutMs: budgets.latencyMs,
        requestId: runId,
        allowAction
      });
    } catch (error) {
      const providerError = String(error.details?.rawPreview || error.message || '').slice(0, 2000);
      await withTransaction(pool, async (client) => {
        await client.query(
          `UPDATE agent_runs SET status = 'provider_failed', error_code = $2, provider_error = $3,
           completed_at = NOW() WHERE id = $1`,
          [runId, error.code || 'MODEL_PROVIDER_FAILED', providerError]
        );
        await appendAudit(client, {
          tenantId: actor.tenantId,
          actorType: 'system',
          eventType: 'agent_run.provider_failed',
          entityType: 'agent_run',
          entityId: runId,
          data: { errorCode: error.code || 'MODEL_PROVIDER_FAILED' }
        });
      });
      throw error;
    }

    let provenance;
    try {
      provenance = validateModelOutput(provider.output, documents, actor, !!allowAction);
    } catch (error) {
      await rejectRun(actor, runId, error.code, provider.output, error.message);
      throw error;
    }
    if (provider.latencyMs > budgets.latencyMs || provider.costUsd > budgets.costUsd) {
      await withTransaction(pool, async (client) => {
        await client.query(
          `UPDATE agent_runs SET status = 'budget_exceeded', model_id = $2, provider_output = $3,
           latency_ms = $4, prompt_tokens = $5, completion_tokens = $6, cost_usd = $7,
           error_code = 'BUDGET_EXCEEDED', completed_at = NOW() WHERE id = $1`,
          [runId, provider.model, provider.output, provider.latencyMs, provider.promptTokens,
            provider.completionTokens, provider.costUsd]
        );
        await appendAudit(client, {
          tenantId: actor.tenantId,
          actorType: 'system',
          eventType: 'agent_run.budget_exceeded',
          entityType: 'agent_run',
          entityId: runId,
          data: { latencyMs: provider.latencyMs, costUsd: provider.costUsd, outputHash: sha256(stableJson(provider.output)) }
        });
      });
      throw new WorkflowError('BUDGET_EXCEEDED', 'The model response exceeded the configured latency or cost budget', 422, false);
    }

    await withTransaction(pool, async (client) => {
      await client.query(
        `UPDATE agent_runs SET status = 'completed', model_id = $2, answer = $3, provider_output = $3,
          schema_valid = TRUE, citation_coverage = $4, latency_ms = $5, prompt_tokens = $6,
          completion_tokens = $7, cost_usd = $8, completed_at = NOW() WHERE id = $1`,
        [runId, provider.model, provider.output, provenance.citationCoverage, provider.latencyMs,
          provider.promptTokens, provider.completionTokens, provider.costUsd]
      );
      for (const citation of provider.output.citations) {
        const document = documents.find((item) => item.id === citation.documentId);
        await client.query(
          `INSERT INTO agent_citations (run_id, document_id, quote, source_url)
           VALUES ($1,$2,$3,$4)`,
          [runId, citation.documentId, citation.quote, document.source_url]
        );
      }
      if (provider.output.proposedAction) {
        await client.query(
          `INSERT INTO tool_jobs
             (id, tenant_id, run_id, connector_id, action, input_payload, idempotency_key,
              status, created_by, timeout_ms, max_attempts)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pending_approval',$8,$9,$10)`,
          [uuid(), actor.tenantId, runId, provider.output.proposedAction.connectorId,
            provider.output.proposedAction.action, provider.output.proposedAction.payload,
            `${idempotencyKey}:action`, actor.userId,
            Math.floor(parsePositiveNumber(process.env.TOOL_TIMEOUT_MS, 5000, 100, 30000)),
            Math.floor(parsePositiveNumber(process.env.TOOL_MAX_ATTEMPTS, 3, 1, 5))]
        );
      }
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'system',
        eventType: 'agent_run.completed',
        entityType: 'agent_run',
        entityId: runId,
        data: {
          model: provider.model,
          documentIds: documents.map((document) => document.id),
          citationCoverage: provenance.citationCoverage,
          actionProposed: !!provider.output.proposedAction,
          latencyMs: provider.latencyMs,
          costUsd: provider.costUsd,
          outputHash: sha256(stableJson(provider.output))
        }
      });
    });
    return { ...(await hydrateRun(actor, runId)), replayed: false };
  }

  async function approveJob(actor, jobId, { decision, note }) {
    requireRole(actor, APPROVAL_ROLES);
    if (!['approve', 'reject'].includes(decision)) throw new WorkflowError('BAD_INPUT', 'decision must be approve or reject', 400, false);
    return withTransaction(pool, async (client) => {
      const current = await client.query(
        'SELECT * FROM tool_jobs WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
        [jobId, actor.tenantId]
      );
      const job = current.rows[0];
      if (!job) throw new WorkflowError('JOB_NOT_FOUND', 'Tool job not found', 404, false);
      if (job.status !== 'pending_approval') throw new WorkflowError('INVALID_JOB_STATE', 'Tool job is not awaiting approval', 409, false);
      if (Number(job.created_by) === Number(actor.userId)) {
        throw new WorkflowError('SEPARATION_OF_DUTIES', 'The job creator cannot approve their own action', 403, false);
      }
      const status = decision === 'approve' ? 'approved' : 'rejected';
      const result = await client.query(
        `UPDATE tool_jobs SET status = $2::varchar, approved_by = $3, approval_note = $4,
          approved_at = NOW(), completed_at = CASE WHEN $2::text = 'rejected' THEN NOW() ELSE NULL END
          WHERE id = $1 RETURNING *`,
        [jobId, status, actor.userId, String(note || '').slice(0, 2000) || null]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        eventType: `tool_job.${status}`,
        entityType: 'tool_job',
        entityId: jobId,
        data: { decision, notePresent: !!note }
      });
      return result.rows[0];
    });
  }

  async function createEvalCase(actor, input) {
    requireRole(actor, APPROVAL_ROLES);
    const name = String(input.name || '').trim();
    const question = String(input.question || '').trim();
    const expected = Array.isArray(input.expectedSourceIds) ? [...new Set(input.expectedSourceIds.map(String))] : [];
    const terms = Array.isArray(input.requiredTerms) ? [...new Set(input.requiredTerms.map((term) => String(term).toLowerCase()))] : [];
    const minimumScore = parsePositiveNumber(input.minimumScore, 0.8, 0.01, 1);
    if (!name || !question || !expected.length) throw new WorkflowError('BAD_INPUT', 'name, question, and expectedSourceIds are required', 400, false);
    const id = uuid();
    const result = await pool.query(
      `INSERT INTO agent_eval_cases
         (id, tenant_id, name, question, expected_source_ids, required_terms, minimum_score, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, actor.tenantId, name, question, expected, terms, minimumScore, actor.userId]
    );
    return result.rows[0];
  }

  async function evaluateRun(actor, caseId, runId) {
    requireRole(actor, APPROVAL_ROLES);
    const result = await withTransaction(pool, async (client) => {
      const cases = await client.query('SELECT * FROM agent_eval_cases WHERE id = $1 AND tenant_id = $2', [caseId, actor.tenantId]);
      const evalCase = cases.rows[0];
      if (!evalCase) throw new WorkflowError('EVAL_CASE_NOT_FOUND', 'Evaluation case not found', 404, false);
      const runs = await client.query('SELECT * FROM agent_runs WHERE id = $1 AND tenant_id = $2', [runId, actor.tenantId]);
      const run = runs.rows[0];
      if (!run || run.status !== 'completed') throw new WorkflowError('RUN_NOT_EVALUABLE', 'A completed tenant run is required', 409, false);
      const cited = await client.query(
        `SELECT DISTINCT d.source_id FROM agent_citations c
         JOIN knowledge_documents d ON d.id = c.document_id WHERE c.run_id = $1`,
        [runId]
      );
      const citedIds = new Set(cited.rows.map((row) => row.source_id));
      const sourceRecall = evalCase.expected_source_ids.filter((id) => citedIds.has(id)).length / evalCase.expected_source_ids.length;
      const answerText = String(run.answer?.answer || '').toLowerCase();
      const termCoverage = evalCase.required_terms.length
        ? evalCase.required_terms.filter((term) => answerText.includes(term.toLowerCase())).length / evalCase.required_terms.length
        : 1;
      const score = (sourceRecall * 0.7) + (termCoverage * 0.3);
      const latencyWithin = Number(run.latency_ms) <= Number(run.latency_budget_ms);
      const costWithin = Number(run.cost_usd) <= Number(run.cost_budget_usd);
      const passed = score >= Number(evalCase.minimum_score) && latencyWithin && costWithin && run.schema_valid;
      const evalId = uuid();
      const inserted = await client.query(
        `INSERT INTO agent_eval_runs
           (id, tenant_id, case_id, agent_run_id, source_recall, term_coverage, score, passed,
            latency_within_budget, cost_within_budget)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [evalId, actor.tenantId, caseId, runId, sourceRecall, termCoverage, score, passed, latencyWithin, costWithin]
      );
      await appendAudit(client, {
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        eventType: 'evaluation.completed',
        entityType: 'agent_eval_run',
        entityId: evalId,
        data: { caseId, runId, score, passed }
      });
      return inserted.rows[0];
    });
    return result;
  }

  async function listConnectors(actor) {
    requireRole(actor, ROLES);
    const result = await pool.query(
      `SELECT id, name, kind, action_url IS NOT NULL AS action_configured, allowed_actions, status,
              last_cursor, last_synced_at, created_at,
              EXTRACT(EPOCH FROM (NOW() - last_synced_at))::integer AS freshness_age_seconds
         FROM knowledge_connectors WHERE tenant_id = $1 ORDER BY name`,
      [actor.tenantId]
    );
    return result.rows;
  }

  return {
    createTenant,
    addMember,
    createConnector,
    ingest,
    ask,
    approveJob,
    createEvalCase,
    evaluateRun,
    getRun: hydrateRun,
    listConnectors
  };
}

module.exports = {
  APPROVAL_ROLES,
  WRITE_ROLES,
  createWorkflowService,
  requireIdempotencyKey,
  validateHttpsUrl,
  validateModelOutput
};
