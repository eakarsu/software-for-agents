const test = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { createWorkflowService } = require('../lib/workflow-service');
const { createToolWorker } = require('../lib/tool-worker-service');

const connectionString = process.env.WORKFLOW_TEST_DATABASE_URL;

test('tenant workflow integration', { skip: !connectionString }, async (t) => {
  const pool = new Pool({ connectionString, max: 3 });
  t.after(() => pool.end());
  await pool.query('TRUNCATE users CASCADE');
  const users = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES
      ('creator@example.test','x','Creator','admin'),
      ('approver@example.test','x','Approver','user'),
      ('viewer@example.test','x','Viewer','user')
     RETURNING id, email`
  );
  const ids = Object.fromEntries(users.rows.map((row) => [row.email, row.id]));
  let modelMode = 'valid';
  let modelCalls = 0;
  const modelClient = {
    async answer({ documents, allowAction }) {
      modelCalls += 1;
      const source = documents[0];
      const output = {
        answer: `The circuit breaker requires human approval. [source:${source.id}]`,
        citations: [{ documentId: source.id, quote: 'Circuit breaker requires human approval' }],
        confidence: 0.94,
        proposedAction: allowAction ? {
          connectorId: source.connector_id,
          action: 'create_case',
          payload: { summary: 'Circuit breaker review', description: 'Review the production policy.', severity: 'high' }
        } : null
      };
      if (modelMode === 'invalid') output.citations[0].quote = 'fabricated quote';
      return {
        output,
        model: 'test/grounded-model',
        latencyMs: modelMode === 'slow' ? 9000 : 25,
        promptTokens: 30,
        completionTokens: 20,
        costUsd: modelMode === 'expensive' ? 2 : 0.001
      };
    }
  };
  const service = createWorkflowService({ pool, modelClient });
  const creatorGlobal = { userId: ids['creator@example.test'], globalRole: 'admin' };
  const tenant = await service.createTenant(creatorGlobal, { name: 'Operations' });
  const otherTenant = await service.createTenant(creatorGlobal, { name: 'Other tenant' });
  const creator = { userId: ids['creator@example.test'], tenantId: tenant.id, role: 'admin' };
  await service.addMember(creator, { email: 'approver@example.test', role: 'approver' });
  await service.addMember(creator, { email: 'viewer@example.test', role: 'viewer' });
  const approver = { userId: ids['approver@example.test'], tenantId: tenant.id, role: 'approver' };
  const viewer = { userId: ids['viewer@example.test'], tenantId: tenant.id, role: 'viewer' };
  const outsider = { userId: ids['creator@example.test'], tenantId: otherTenant.id, role: 'admin' };
  const connector = await service.createConnector(creator, {
    name: 'Operations source',
    actionUrl: 'https://actions.example.test/cases',
    actionTokenEnv: 'CONNECTOR_TOKEN_OPERATIONS',
    allowedActions: ['create_case']
  });

  await t.test('signed incremental sync is idempotent and records freshness', async () => {
    const payload = {
      cursor: 'cursor-1',
      documents: [
        {
          sourceId: 'policy-1',
          updatedAt: new Date().toISOString(),
          deleted: false,
          title: 'Circuit breaker policy',
          content: 'Circuit breaker requires human approval before every production change.',
          sourceUrl: 'https://kb.example.test/policy-1',
          allowedRoles: ['viewer', 'operator', 'approver', 'admin']
        },
        {
          sourceId: 'secret-1',
          updatedAt: new Date().toISOString(),
          deleted: false,
          title: 'Classified escalation',
          content: 'Classified escalation uses the internal red channel.',
          sourceUrl: 'https://kb.example.test/secret-1',
          allowedRoles: ['admin']
        }
      ]
    };
    const first = await service.ingest(connector.id, connector.ingestionToken, 'sync-1', payload);
    const replay = await service.ingest(connector.id, connector.ingestionToken, 'sync-1', payload);
    assert.equal(first.upserted_count, 2);
    assert.equal(replay.replayed, true);
    await assert.rejects(
      service.ingest(connector.id, connector.ingestionToken, 'sync-1', { ...payload, cursor: 'changed' }),
      { code: 'IDEMPOTENCY_CONFLICT' }
    );
    await assert.rejects(service.ingest(connector.id, 'wrong-token', 'sync-2', payload), { code: 'CONNECTOR_UNAUTHORIZED' });
    const listed = await service.listConnectors(viewer);
    assert.equal(listed[0].last_cursor, 'cursor-1');
    assert.ok(Number(listed[0].freshness_age_seconds) >= 0);
  });

  let completedRun;
  await t.test('grounded run is schema/provenance checked and idempotent', async () => {
    completedRun = await service.ask(creator, {
      idempotencyKey: 'run-1',
      question: 'What does the circuit breaker require?',
      allowAction: true,
      latencyBudgetMs: 1000,
      costBudgetUsd: 0.01
    });
    assert.equal(completedRun.status, 'completed');
    assert.equal(completedRun.citations.length, 1);
    assert.equal(completedRun.jobs[0].status, 'pending_approval');
    const replay = await service.ask(creator, {
      idempotencyKey: 'run-1',
      question: 'What does the circuit breaker require?',
      allowAction: true,
      latencyBudgetMs: 1000,
      costBudgetUsd: 0.01
    });
    assert.equal(replay.replayed, true);
    assert.equal(replay.id, completedRun.id);
    assert.equal(modelCalls, 1);
    await assert.rejects(service.ask(creator, {
      idempotencyKey: 'run-1',
      question: 'Different request content',
      allowAction: true,
      latencyBudgetMs: 1000,
      costBudgetUsd: 0.01
    }), { code: 'IDEMPOTENCY_CONFLICT' });
    await assert.rejects(service.getRun(outsider, completedRun.id), { code: 'RUN_NOT_FOUND' });
  });

  await t.test('role-scoped retrieval does not expose admin-only documents', async () => {
    await assert.rejects(service.ask(viewer, {
      idempotencyKey: 'viewer-secret',
      question: 'How does the classified escalation red channel work?'
    }), { code: 'NO_FRESH_GROUNDED_CONTEXT' });
  });

  await t.test('separate human approval and isolated worker retries use stable delivery identity', async () => {
    const jobId = completedRun.jobs[0].id;
    await assert.rejects(service.approveJob(creator, jobId, { decision: 'approve' }), { code: 'SEPARATION_OF_DUTIES' });
    const approved = await service.approveJob(approver, jobId, { decision: 'approve', note: 'Reviewed source and payload' });
    assert.equal(approved.status, 'approved');
    const requests = [];
    const worker = createToolWorker({
      pool,
      env: { CONNECTOR_TOKEN_OPERATIONS: 'external-secret' },
      workerId: 'integration-worker',
      fetchImpl: async (_url, options) => {
        requests.push(options);
        if (requests.length === 1) return new Response('retry later', { status: 503 });
        return new Response(JSON.stringify({ caseId: 'case-42' }), { status: 201 });
      }
    });
    const retry = await worker.runOnce();
    assert.equal(retry.status, 'retry_wait');
    await pool.query("UPDATE tool_jobs SET next_attempt_at = NOW() - INTERVAL '1 second' WHERE id = $1", [jobId]);
    const succeeded = await worker.runOnce();
    assert.equal(succeeded.status, 'succeeded');
    assert.equal(requests.length, 2);
    assert.equal(requests[0].headers['Idempotency-Key'], jobId);
    assert.equal(requests[1].headers['Idempotency-Key'], jobId);
    const attempts = await pool.query('SELECT * FROM tool_job_attempts WHERE job_id = $1 ORDER BY attempt_number', [jobId]);
    assert.equal(attempts.rows.length, 2);
  });

  await t.test('expired worker leases are recovered without duplicating job identity', async () => {
    const run = await service.ask(creator, {
      idempotencyKey: 'run-lease-recovery',
      question: 'What does the circuit breaker require?',
      allowAction: true
    });
    const jobId = run.jobs[0].id;
    await service.approveJob(approver, jobId, { decision: 'approve', note: 'Approved for lease recovery test' });
    await pool.query(
      `UPDATE tool_jobs SET status = 'running', worker_id = 'dead-worker',
       lease_expires_at = NOW() - INTERVAL '1 second' WHERE id = $1`,
      [jobId]
    );
    const worker = createToolWorker({
      pool,
      env: { CONNECTOR_TOKEN_OPERATIONS: 'external-secret' },
      workerId: 'recovery-worker',
      fetchImpl: async () => new Response(JSON.stringify({ caseId: 'case-recovered' }), { status: 201 })
    });
    const recovered = await worker.runOnce();
    assert.equal(recovered.id, jobId);
    assert.equal(recovered.status, 'succeeded');
    assert.equal(recovered.attempt_count, 1);
  });

  await t.test('evaluation gates measure source recall, terms, latency, and cost', async () => {
    const evalCase = await service.createEvalCase(approver, {
      name: 'Circuit breaker grounding',
      question: 'What does the circuit breaker require?',
      expectedSourceIds: ['policy-1'],
      requiredTerms: ['human approval'],
      minimumScore: 0.9
    });
    const result = await service.evaluateRun(approver, evalCase.id, completedRun.id);
    assert.equal(result.passed, true);
    assert.equal(Number(result.score), 1);
  });

  await t.test('invalid model provenance is rejected and retained as auditable output', async () => {
    modelMode = 'invalid';
    try {
      await assert.rejects(service.ask(creator, {
        idempotencyKey: 'run-invalid',
        question: 'Explain the circuit breaker policy'
      }), { code: 'PROVENANCE_INVALID' });
      const rejected = await pool.query("SELECT status, error_code, provider_output FROM agent_runs WHERE idempotency_key = 'run-invalid'");
      assert.equal(rejected.rows[0].status, 'rejected');
      assert.equal(rejected.rows[0].error_code, 'PROVENANCE_INVALID');
      assert.ok(rejected.rows[0].provider_output);
    } finally {
      modelMode = 'valid';
    }
  });

  await t.test('cost budget gates prevent an over-budget result from being served', async () => {
    modelMode = 'expensive';
    try {
      await assert.rejects(service.ask(creator, {
        idempotencyKey: 'run-expensive',
        question: 'Explain the circuit breaker policy',
        costBudgetUsd: 0.01
      }), { code: 'BUDGET_EXCEEDED' });
      const row = await pool.query("SELECT status, cost_usd FROM agent_runs WHERE idempotency_key = 'run-expensive'");
      assert.equal(row.rows[0].status, 'budget_exceeded');
      assert.equal(Number(row.rows[0].cost_usd), 2);
    } finally {
      modelMode = 'valid';
    }
  });

  await t.test('per-user rate limit is durable and returns a retryable error', async () => {
    await pool.query('DELETE FROM agent_rate_limits WHERE tenant_id = $1 AND user_id = $2', [tenant.id, viewer.userId]);
    process.env.AGENT_RUNS_PER_MINUTE = '1';
    try {
      await service.ask(viewer, { idempotencyKey: 'viewer-rate-1', question: 'What does the circuit breaker require?' });
      await assert.rejects(
        service.ask(viewer, { idempotencyKey: 'viewer-rate-2', question: 'What does the circuit breaker require?' }),
        { code: 'RATE_LIMITED' }
      );
    } finally {
      delete process.env.AGENT_RUNS_PER_MINUTE;
    }
  });

  await t.test('deletion propagation removes a source from retrieval', async () => {
    const deleted = await service.ingest(connector.id, connector.ingestionToken, 'sync-delete', {
      cursor: 'cursor-2',
      documents: [{ sourceId: 'policy-1', updatedAt: new Date(Date.now() + 1000).toISOString(), deleted: true }]
    });
    assert.equal(deleted.deleted_count, 1);
    await assert.rejects(service.ask(creator, {
      idempotencyKey: 'run-after-delete',
      question: 'What does the circuit breaker require?'
    }), { code: 'NO_FRESH_GROUNDED_CONTEXT' });
  });

  await t.test('database trigger prevents audit update and deletion', async () => {
    const event = await pool.query('SELECT id FROM workflow_audit_events WHERE tenant_id = $1 LIMIT 1', [tenant.id]);
    await assert.rejects(pool.query("UPDATE workflow_audit_events SET event_type = 'tampered' WHERE id = $1", [event.rows[0].id]), /immutable/);
    await assert.rejects(pool.query('DELETE FROM workflow_audit_events WHERE id = $1', [event.rows[0].id]), /immutable/);
    const attempt = await pool.query('SELECT id FROM tool_job_attempts LIMIT 1');
    await assert.rejects(pool.query("UPDATE tool_job_attempts SET response_preview = 'tampered' WHERE id = $1", [attempt.rows[0].id]), /immutable/);
  });

});
