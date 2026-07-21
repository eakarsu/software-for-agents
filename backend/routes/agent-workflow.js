const express = require('express');
const auth = require('../middleware/auth');
const { createTenantContext } = require('../middleware/tenant-context');
const { createOpenRouterClient } = require('../lib/openrouter-client');
const { asWorkflowError } = require('../lib/errors');
const { createWorkflowService } = require('../lib/workflow-service');

function createAgentWorkflowRouter(options = {}) {
  const router = express.Router();
  const pool = options.pool;
  if (!pool) throw new Error('pool is required');
  const service = options.service || createWorkflowService({
    pool,
    modelClient: options.modelClient || createOpenRouterClient()
  });

  const actor = (req) => ({
    userId: req.user.id,
    tenantId: req.tenant.id,
    role: req.tenant.role,
    globalRole: req.user.role
  });
  const handle = (handler) => async (req, res) => {
    try { await handler(req, res); } catch (raw) {
      const error = asWorkflowError(raw);
      const body = { error: error.message, error_code: error.code, retryable: error.retryable };
      if (error.details) body.details = error.details;
      if (error.code === 'RATE_LIMITED') res.set('Retry-After', String(error.details?.retryAfterSeconds || 60));
      res.status(error.status).json(body);
    }
  };

  router.post('/connectors/:id/sync', handle(async (req, res) => {
    const result = await service.ingest(
      req.params.id,
      req.headers['x-connector-token'],
      req.headers['idempotency-key'],
      req.body
    );
    res.status(result.replayed ? 200 : 202).json(result);
  }));

  router.post('/tenants', auth, handle(async (req, res) => {
    const result = await service.createTenant(
      { userId: req.user.id, globalRole: req.user.role },
      req.body || {}
    );
    res.status(201).json(result);
  }));

  router.use(auth, createTenantContext(pool));

  router.get('/connectors', handle(async (req, res) => res.json(await service.listConnectors(actor(req)))));
  router.post('/members', handle(async (req, res) => {
    res.status(201).json(await service.addMember(actor(req), req.body || {}));
  }));
  router.post('/connectors', handle(async (req, res) => {
    res.status(201).json(await service.createConnector(actor(req), req.body || {}));
  }));
  router.post('/runs', handle(async (req, res) => {
    const result = await service.ask(actor(req), {
      idempotencyKey: req.headers['idempotency-key'],
      question: req.body?.question,
      allowAction: req.body?.allowAction === true,
      latencyBudgetMs: req.body?.latencyBudgetMs,
      costBudgetUsd: req.body?.costBudgetUsd
    });
    res.status(result.replayed ? 200 : 201).json(result);
  }));
  router.get('/runs/:id', handle(async (req, res) => res.json(await service.getRun(actor(req), req.params.id))));
  router.post('/jobs/:id/decision', handle(async (req, res) => {
    res.json(await service.approveJob(actor(req), req.params.id, req.body || {}));
  }));
  router.post('/evaluations/cases', handle(async (req, res) => {
    res.status(201).json(await service.createEvalCase(actor(req), req.body || {}));
  }));
  router.post('/evaluations/run', handle(async (req, res) => {
    res.status(201).json(await service.evaluateRun(actor(req), req.body?.caseId, req.body?.runId));
  }));

  return router;
}

module.exports = { createAgentWorkflowRouter };
