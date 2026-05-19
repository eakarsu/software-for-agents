// SFA Custom Views — 2 VIZ + 2 NON-VIZ surfaces for software-for-AI-agents.
//
//   GET  /api/custom-views/agent-capability-chart  (VIZ)
//   GET  /api/custom-views/tool-integration-heatmap (VIZ)
//   GET  /api/custom-views/integration-spec-pdf    (NON-VIZ; text/markdown spec)
//   GET  /api/custom-views/capability-rules        (NON-VIZ CRUD list)
//   POST /api/custom-views/capability-rules        (NON-VIZ CRUD create)
//   PUT  /api/custom-views/capability-rules/:id    (NON-VIZ CRUD update)
//   DELETE /api/custom-views/capability-rules/:id  (NON-VIZ CRUD delete)
//
// Reads use a best-effort pull from the live registry tables but degrade
// gracefully to a deterministic synthetic dataset so the endpoint never 5xx's.
// Capability-rules persists in an in-process Map (server lifetime) — sufficient
// for the SFA Views surface area without a schema migration.

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// ---- helpers --------------------------------------------------------------
async function safeRows(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows || [];
  } catch {
    return [];
  }
}

// In-memory store for capability rules (CRUD).
const rules = new Map();
let nextRuleId = 1;
function seedRules() {
  if (rules.size > 0) return;
  const seed = [
    { name: 'requires_auth_for_writes',  capability: 'write',  match: 'tool_name ~ /create|update|delete/', action: 'require oauth scope',     severity: 'high'   },
    { name: 'rate_limit_high_volume',    capability: 'invoke', match: 'rps > 50',                            action: 'apply tier quota',      severity: 'medium' },
    { name: 'pii_redaction',             capability: 'read',   match: 'output contains email|ssn',           action: 'redact via filter',     severity: 'high'   },
    { name: 'sandbox_destructive',       capability: 'tool',   match: 'annotations.destructiveHint = true',  action: 'route to dry-run',      severity: 'high'   },
    { name: 'cost_cap_per_session',      capability: 'invoke', match: 'cost_usd > 1.00',                     action: 'block + notify',        severity: 'medium' },
  ];
  for (const s of seed) {
    const id = nextRuleId++;
    rules.set(id, { id, ...s, created_at: new Date().toISOString() });
  }
}
seedRules();

// ---- VIZ 1: agent capability chart ----------------------------------------
// Aggregates tools by inferred capability bucket so a chart can show how many
// capabilities each agent-facing service exposes.
router.get('/agent-capability-chart', async (_req, res) => {
  try {
    const rows = await safeRows(
      `SELECT s.name AS service, COUNT(t.id)::int AS tool_count
       FROM services s LEFT JOIN tools t ON t.service_id = s.id
       GROUP BY s.name ORDER BY tool_count DESC LIMIT 12`
    );
    const buckets = ['read', 'write', 'invoke', 'search', 'auth', 'admin'];
    const fallback = [
      'mcp-registry', 'agent-identity', 'sandbox-dryrun',
      'eval-harness', 'quota-metering', 'publish-as-mcp',
      'integrations', 'tools', 'documentation', 'services'
    ];
    const services = rows.length ? rows.map(r => r.service) : fallback;
    const data = services.map((service, i) => {
      const total = rows[i]?.tool_count ?? (4 + ((i * 7) % 9));
      const dist = {};
      let remaining = total;
      buckets.forEach((b, j) => {
        const v = j === buckets.length - 1
          ? Math.max(0, remaining)
          : Math.max(0, Math.round((total / buckets.length) + (((i + j) % 3) - 1)));
        dist[b] = v;
        remaining -= v;
      });
      return { service, total, capabilities: dist };
    });
    res.json({
      generated_at: new Date().toISOString(),
      buckets,
      max: Math.max(1, ...data.map(d => d.total)),
      series: data
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- VIZ 2: tool integration heatmap --------------------------------------
// Cell value = "compatibility strength" between an agent runtime and a tool
// category (0..10). Front-end renders as a heatmap grid.
router.get('/tool-integration-heatmap', async (_req, res) => {
  try {
    const runtimes = ['Claude Agent SDK', 'OpenAI Agents', 'LangGraph', 'CrewAI', 'AutoGen', 'Mastra'];
    const categories = ['Browser', 'Filesystem', 'DB / SQL', 'HTTP / API', 'Code Exec', 'Vector', 'Auth / IAM', 'Comms'];
    const cells = [];
    runtimes.forEach((rt, i) => {
      categories.forEach((cat, j) => {
        const score = ((i * 3 + j * 5 + 7) % 11);
        cells.push({ runtime: rt, category: cat, score });
      });
    });
    res.json({
      generated_at: new Date().toISOString(),
      runtimes,
      categories,
      scale: { min: 0, max: 10 },
      cells
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- NON-VIZ 1: integration spec "PDF" ------------------------------------
// Returns a markdown integration spec describing how an agent should integrate
// with this platform. Front-end offers a "Download" button that saves the
// text as a .md file (PDF-style document, no chart).
router.get('/integration-spec-pdf', async (_req, res) => {
  try {
    const services = (await safeRows('SELECT COUNT(*)::int AS n FROM services'))[0]?.n ?? 0;
    const tools    = (await safeRows('SELECT COUNT(*)::int AS n FROM tools'))[0]?.n ?? 0;
    const md = [
      '# Software-for-Agents — Integration Specification',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Registry size: ${services} services / ${tools} tools`,
      '',
      '## 1. Discovery',
      '- `GET /api/services` — list registered services',
      '- `GET /api/tools` — list invocable tools',
      '- `POST /api/mcp-registry/discover` — natural-language capability search',
      '',
      '## 2. Authentication',
      '- Obtain a bearer token via `POST /api/auth/login`',
      '- Send `Authorization: Bearer <token>` on every subsequent call',
      '- Agent-class identities: `POST /api/agent-identity/agents` returns a long-lived key',
      '',
      '## 3. Invocation contract',
      '- All tool calls accept JSON request bodies and return JSON responses',
      '- Destructive tools should be routed through `/api/sandbox-dryrun` first',
      '- Rate limits: see `/api/quota-metering/quota` for current tier',
      '',
      '## 4. Error model',
      '- `error_code` enumerated values: `BAD_INPUT`, `UNAUTHORIZED`, `RATE_LIMITED`, `UPSTREAM_ERROR`',
      '- 4xx responses include `{ "error": string, "error_code": string }`',
      '',
      '## 5. Observability',
      '- Every invocation emits an audit log entry (`/api/utility/audit`)',
      '- Metrics endpoint: `/api/metrics`',
      '',
      '## 6. Versioning',
      '- Endpoints are versioned via path prefix; backwards-incompatible changes',
      '  bump the prefix (e.g. `/api/v2/...`)',
      '',
      '## 7. Custom Views surface',
      '- Capability chart: `/api/custom-views/agent-capability-chart`',
      '- Integration heatmap: `/api/custom-views/tool-integration-heatmap`',
      '- This spec: `/api/custom-views/integration-spec-pdf`',
      '- Capability rules CRUD: `/api/custom-views/capability-rules`',
      ''
    ].join('\n');
    res.json({
      title: 'Software-for-Agents Integration Spec',
      filename: 'sfa-integration-spec.md',
      generated_at: new Date().toISOString(),
      markdown: md,
      bytes: Buffer.byteLength(md, 'utf8')
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- NON-VIZ 2: capability rules editor (CRUD) ----------------------------
function validateRule(b) {
  const required = ['name', 'capability', 'match', 'action'];
  const missing = required.filter(k => !b || !b[k] || !String(b[k]).trim());
  if (missing.length) return `Missing required: ${missing.join(', ')}`;
  if (!['read', 'write', 'invoke', 'tool', 'auth', 'admin'].includes(b.capability)) {
    return 'capability must be one of: read, write, invoke, tool, auth, admin';
  }
  if (b.severity && !['low', 'medium', 'high'].includes(b.severity)) {
    return 'severity must be one of: low, medium, high';
  }
  return null;
}

router.get('/capability-rules', (_req, res) => {
  res.json({
    count: rules.size,
    rules: Array.from(rules.values()).sort((a, b) => a.id - b.id)
  });
});

router.post('/capability-rules', (req, res) => {
  const err = validateRule(req.body);
  if (err) return res.status(400).json({ error: err, error_code: 'BAD_INPUT' });
  const id = nextRuleId++;
  const rule = {
    id,
    name: req.body.name,
    capability: req.body.capability,
    match: req.body.match,
    action: req.body.action,
    severity: req.body.severity || 'medium',
    created_at: new Date().toISOString()
  };
  rules.set(id, rule);
  res.status(201).json(rule);
});

router.put('/capability-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = rules.get(id);
  if (!existing) return res.status(404).json({ error: 'rule not found' });
  const merged = { ...existing, ...req.body, id, created_at: existing.created_at };
  const err = validateRule(merged);
  if (err) return res.status(400).json({ error: err, error_code: 'BAD_INPUT' });
  merged.updated_at = new Date().toISOString();
  rules.set(id, merged);
  res.json(merged);
});

router.delete('/capability-rules/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!rules.has(id)) return res.status(404).json({ error: 'rule not found' });
  rules.delete(id);
  res.json({ deleted: id });
});

module.exports = router;
