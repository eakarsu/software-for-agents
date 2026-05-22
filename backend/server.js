require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/services', require('./routes/services'));
app.use('/api/tools', require('./routes/tools'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/executions', require('./routes/executions'));
app.use('/api/documentation', require('./routes/documentation'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/utility', require('./routes/utility'));
app.use('/api/admin', require('./routes/sample_data'));
app.use('/api/dashboard', require('./routes/dashboard'));

const PORT = process.env.PORT || 3013;
app.listen(PORT, () => console.log(`AgentHub backend running on port ${PORT}`));
app.use('/api/gap-ai-auto-signup', require('./routes/gap-ai-auto-signup'));
app.use('/api/gap-ai-oauth-completer', require('./routes/gap-ai-oauth-completer'));
app.use('/api/gap-ai-api-spec-linter', require('./routes/gap-ai-api-spec-linter'));
app.use('/api/gap-ai-rate-limit-negotiator', require('./routes/gap-ai-rate-limit-negotiator'));
app.use('/api/gap-ai-synthetic-load-tester', require('./routes/gap-ai-synthetic-load-tester'));
app.use('/api/gap-nonai-mcp-hosting', require('./routes/gap-nonai-mcp-hosting'));
app.use('/api/gap-nonai-openapi-manifest', require('./routes/gap-nonai-openapi-manifest'));
app.use('/api/gap-nonai-agent-authn', require('./routes/gap-nonai-agent-authn'));
app.use('/api/gap-nonai-sandbox-dryrun', require('./routes/gap-nonai-sandbox-dryrun'));
app.use('/api/gap-nonai-billing-metering', require('./routes/gap-nonai-billing-metering'));
app.use('/api/gap-nonai-quota-tiers', require('./routes/gap-nonai-quota-tiers'));
app.use('/api/cf-publish-as-mcp', require('./routes/cf-publish-as-mcp'));
app.use('/api/cf-agent-onboarding', require('./routes/cf-agent-onboarding'));
app.use('/api/cf-semver-compat', require('./routes/cf-semver-compat'));
app.use('/api/cf-toolcall-replay', require('./routes/cf-toolcall-replay'));
app.use('/api/cf-mcp-marketplace', require('./routes/cf-mcp-marketplace'));

// Audit-implementation 2026-05-14: deep features for agent-first infrastructure.
app.use('/api/mcp-registry', require('./routes/mcp-registry'));
app.use('/api/agent-identity', require('./routes/agent-identity'));
app.use('/api/sandbox-dryrun', require('./routes/sandbox-dryrun'));
app.use('/api/eval-harness', require('./routes/eval-harness'));
app.use('/api/quota-metering', require('./routes/quota-metering'));
app.use('/api/publish-as-mcp', require('./routes/publish-as-mcp'));

// SFA Custom Views — mounted BEFORE any 404 handler.
app.use('/api/custom-views', require('./routes/customViews'));

// Apply pass 7 (2026-05-21): webhook subscriptions + agent discovery surface.
// Both mounted BEFORE the 404 handler (which lives at the bottom of this file).
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/agent-compat', require('./routes/agentCompatMatrix'));

// Public well-known endpoint so unauthenticated agents can self-onboard.
// Mirrors a subset of /api/discovery/manifest with zero JWT requirement.
app.get('/.well-known/agent-manifest.json', (_req, res) => res.json({
  schema_version: '2026-05-21',
  name: 'AgentHub — Software for Agents',
  description: 'Agent-first registry of services, tools, and MCP servers.',
  base_url: '/api',
  auth: { type: 'bearer', login: 'POST /api/auth/login' },
  manifest: '/api/discovery/manifest',
  endpoints: {
    list_services: 'GET /api/services',
    list_tools: 'GET /api/tools',
    sdk_snippets: 'GET /api/discovery/sdk-snippets',
    webhooks: 'GET /api/webhooks',
    sandbox_dryrun: 'POST /api/sandbox-dryrun'
  },
  generated_at: new Date().toISOString()
}));

// Health endpoint (kept after custom-views, still before 404).
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'software-for-agents', ts: new Date().toISOString() }));

// 404 catch-all (must remain last).
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }));
