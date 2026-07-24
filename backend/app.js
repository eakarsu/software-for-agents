const express = require('express');
const cors = require('cors');
const { createNonAppBoundary } = require('./routes/non-app-boundary');
const { createAuthRouter } = require('./routes/auth');
const { createAgentWorkflowRouter } = require('./routes/agent-workflow');
const { createRuntimeAiRouter } = require('./routes/runtime-ai');

function validateRuntimeConfig() {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) missing.push('JWT_SECRET (minimum 32 characters)');
  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS');
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}`);
}

function corsOptions() {
  const configured = String(process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  return {
    credentials: false,
    origin(origin, callback) {
      if (!origin || configured.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    }
  };
}

function createApp(options = {}) {
  const pool = options.pool || require('./db');
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: '1mb', strict: true }));

  app.use('/api/auth', createAuthRouter(pool));
  app.use('/api/runtime-ai', createRuntimeAiRouter(pool));
  app.use('/api/agent-workflow', options.workflowRouter || createAgentWorkflowRouter({
    pool,
    modelClient: options.modelClient
  }));

  app.get('/.well-known/agent-manifest.json', (_req, res) => res.json({
    schema_version: '2026-07-20',
    name: 'AgentHub grounded workflow',
    description: 'Tenant-scoped grounded answers and approval-gated connector actions.',
    auth: { type: 'bearer', tenant_header: 'X-Tenant-ID' },
    endpoints: {
      login: 'POST /api/auth/login',
      tenant_bootstrap: 'POST /api/agent-workflow/tenants',
      connectors: '/api/agent-workflow/connectors',
      runs: '/api/agent-workflow/runs',
      approvals: 'POST /api/agent-workflow/jobs/:id/decision',
      evaluations: '/api/agent-workflow/evaluations'
    }
  }));

  app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not_ready' });
    }
  });

  const legacyPrefixes = [
      '/api/ai', '/api/services', '/api/tools', '/api/integrations', '/api/executions',
      '/api/documentation', '/api/metrics', '/api/utility', '/api/admin', '/api/dashboard',
      '/api/mcp-registry', '/api/agent-identity', '/api/sandbox-dryrun', '/api/eval-harness',
      '/api/quota-metering', '/api/publish-as-mcp', '/api/custom-views', '/api/webhooks',
      '/api/discovery', '/api/agent-compat'
  ];
  for (const prefix of legacyPrefixes) app.use(prefix, createNonAppBoundary('Legacy prototype surface'));

  const generatedPrefixes = [
    '/api/gap-ai-auto-signup', '/api/gap-ai-oauth-completer', '/api/gap-ai-api-spec-linter',
    '/api/gap-ai-rate-limit-negotiator', '/api/gap-ai-synthetic-load-tester',
    '/api/gap-nonai-mcp-hosting', '/api/gap-nonai-openapi-manifest', '/api/gap-nonai-agent-authn',
    '/api/gap-nonai-sandbox-dryrun', '/api/gap-nonai-billing-metering', '/api/gap-nonai-quota-tiers',
    '/api/cf-publish-as-mcp', '/api/cf-agent-onboarding', '/api/cf-semver-compat',
    '/api/cf-toolcall-replay', '/api/cf-mcp-marketplace'
  ];
  for (const prefix of generatedPrefixes) app.use(prefix, createNonAppBoundary('Generated feature concept'));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', error_code: 'NOT_FOUND', path: req.originalUrl }));
  app.use((error, _req, res, _next) => {
    if (error.message === 'Origin is not allowed') return res.status(403).json({ error: error.message, error_code: 'CORS_DENIED' });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON', error_code: 'BAD_JSON' });
    return res.status(500).json({ error: 'Unexpected server failure', error_code: 'INTERNAL_ERROR' });
  });
  return app;
}

module.exports = { createApp, corsOptions, validateRuntimeConfig };
