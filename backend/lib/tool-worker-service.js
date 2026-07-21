const crypto = require('crypto');
const { appendAudit, stableJson, withTransaction } = require('./workflow-audit');

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function claimNextJob(pool, workerId) {
  return withTransaction(pool, async (client) => {
    const selected = await client.query(
      `SELECT j.*, c.action_url, c.action_token_env, c.allowed_actions, c.status connector_status
         FROM tool_jobs j
         JOIN knowledge_connectors c ON c.id = j.connector_id
        WHERE (
          (j.status IN ('approved', 'retry_wait') AND j.next_attempt_at <= NOW()) OR
          (j.status = 'running' AND j.lease_expires_at < NOW())
        )
        ORDER BY j.next_attempt_at, j.created_at
        FOR UPDATE OF j SKIP LOCKED
        LIMIT 1`
    );
    const job = selected.rows[0];
    if (!job) return null;
    const attemptNumber = Number(job.attempt_count) + 1;
    const updated = await client.query(
      `UPDATE tool_jobs SET status = 'running', attempt_count = $2, worker_id = $3,
         lease_expires_at = NOW() + (($4 + 5000)::text || ' milliseconds')::interval
       WHERE id = $1 RETURNING *`,
      [job.id, attemptNumber, workerId, job.timeout_ms]
    );
    await appendAudit(client, {
      tenantId: job.tenant_id,
      actorType: 'worker',
      actorId: workerId,
      eventType: 'tool_job.attempt_started',
      entityType: 'tool_job',
      entityId: job.id,
      data: { attemptNumber }
    });
    return { ...job, ...updated.rows[0], attemptNumber };
  });
}

async function finishAttempt(pool, job, outcome) {
  return withTransaction(pool, async (client) => {
    await client.query(
      `INSERT INTO tool_job_attempts
         (id, job_id, attempt_number, request_payload, response_status, response_preview,
          duration_ms, outcome, error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [crypto.randomUUID(), job.id, job.attemptNumber, job.input_payload, outcome.responseStatus || null,
        outcome.responsePreview || null, outcome.durationMs, outcome.outcome, outcome.errorCode || null]
    );
    const exhausted = job.attemptNumber >= Number(job.max_attempts);
    let status;
    if (outcome.outcome === 'succeeded') status = 'succeeded';
    else if (outcome.retryable && !exhausted) status = 'retry_wait';
    else status = 'failed';
    const delaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, job.attemptNumber - 1)));
    const result = await client.query(
      `UPDATE tool_jobs SET status = $2::varchar, result_payload = $3, error_code = $4,
         next_attempt_at = CASE WHEN $2::text = 'retry_wait'
           THEN NOW() + ($5::text || ' seconds')::interval ELSE next_attempt_at END,
         lease_expires_at = NULL, worker_id = NULL,
         completed_at = CASE WHEN $2::text IN ('succeeded', 'failed') THEN NOW() ELSE NULL END
       WHERE id = $1 RETURNING *`,
      [job.id, status, outcome.resultPayload || null, outcome.errorCode || null, delaySeconds]
    );
    await appendAudit(client, {
      tenantId: job.tenant_id,
      actorType: 'worker',
      actorId: job.worker_id,
      eventType: `tool_job.${status}`,
      entityType: 'tool_job',
      entityId: job.id,
      data: {
        attemptNumber: job.attemptNumber,
        responseStatus: outcome.responseStatus || null,
        errorCode: outcome.errorCode || null,
        nextRetrySeconds: status === 'retry_wait' ? delaySeconds : null,
        inputHash: crypto.createHash('sha256').update(stableJson(job.input_payload)).digest('hex'),
        responseHash: crypto.createHash('sha256').update(outcome.responsePreview || '').digest('hex')
      }
    });
    return result.rows[0];
  });
}

function createToolWorker({ pool, fetchImpl = global.fetch, env = process.env, workerId = `worker-${process.pid}` }) {
  return {
    async runOnce() {
      const job = await claimNextJob(pool, workerId);
      if (!job) return null;
      const started = Date.now();
      let outcome;
      if (job.connector_status !== 'active' || !job.action_url || !job.allowed_actions.includes(job.action)) {
        outcome = {
          outcome: 'terminal_failure',
          retryable: false,
          errorCode: 'CONNECTOR_ACTION_DISABLED',
          durationMs: 0
        };
      } else if (!job.action_token_env || !env[job.action_token_env]) {
        outcome = {
          outcome: 'terminal_failure',
          retryable: false,
          errorCode: 'CONNECTOR_CREDENTIAL_MISSING',
          durationMs: 0
        };
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), job.timeout_ms);
        try {
          const response = await fetchImpl(job.action_url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env[job.action_token_env]}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': job.id,
              'X-AgentHub-Job-ID': job.id
            },
            body: JSON.stringify({
              schemaVersion: '2026-07-20',
              deliveryId: job.id,
              action: job.action,
              payload: job.input_payload
            }),
            signal: controller.signal
          });
          const text = String(await response.text()).slice(0, 2000);
          if (response.ok) {
            let parsed;
            try { parsed = text ? JSON.parse(text) : { accepted: true }; } catch { parsed = { response: text }; }
            outcome = {
              outcome: 'succeeded',
              retryable: false,
              responseStatus: response.status,
              responsePreview: text,
              resultPayload: parsed,
              durationMs: Date.now() - started
            };
          } else {
            const retryable = retryableStatus(response.status);
            outcome = {
              outcome: retryable ? 'retryable_failure' : 'terminal_failure',
              retryable,
              responseStatus: response.status,
              responsePreview: text,
              errorCode: retryable ? 'CONNECTOR_RETRYABLE_RESPONSE' : 'CONNECTOR_REJECTED',
              durationMs: Date.now() - started
            };
          }
        } catch (error) {
          const timeout = error.name === 'AbortError';
          outcome = {
            outcome: timeout ? 'timeout' : 'retryable_failure',
            retryable: true,
            errorCode: timeout ? 'CONNECTOR_TIMEOUT' : 'CONNECTOR_NETWORK_FAILED',
            durationMs: Date.now() - started
          };
        } finally {
          clearTimeout(timer);
        }
      }
      return finishAttempt(pool, job, outcome);
    }
  };
}

module.exports = { claimNextJob, createToolWorker, retryableStatus };
