// Publish-as-MCP Pipeline.
//
// "One-click publish my SaaS as an MCP server" — takes an OpenAPI 3.x spec or
// an internal service_id and emits:
//   * An MCP manifest (protocol 2025-06-18)
//   * Per-operation tool descriptors with title/description/input/outputSchema
//   * An agent-readable usage guide
//   * A linter score over the source spec (well-known agent-friendliness
//     heuristics: operationId presence, descriptions, examples, idempotency hints)
//
// Endpoints:
//   POST  /api/publish-as-mcp/from-service        — convert an internal service to MCP
//   POST  /api/publish-as-mcp/from-openapi        — convert a pasted OpenAPI 3.x doc to MCP
//   POST  /api/publish-as-mcp/lint                — agent-friendliness linter (no publish)
//   GET   /api/publish-as-mcp/published           — list MCP servers published via this pipeline
//   GET   /api/publish-as-mcp/templates           — starter templates (auth, pagination, errors)

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

const MCP_VERSION = '2025-06-18';

// --- agent-friendliness linter --------------------------------------------
// Heuristics drawn from the "Software for Agents" brief: typed schemas,
// thorough docs, idempotency hints, structured errors, programmatic auth.
function lintOpenAPI(spec) {
  const findings = [];
  let score = 100;
  const ops = [];
  const paths = spec?.paths || {};
  Object.entries(paths).forEach(([p, methods]) => {
    Object.entries(methods).forEach(([m, op]) => {
      if (!['get', 'post', 'put', 'delete', 'patch'].includes(m)) return;
      ops.push({ path: p, method: m, op });
    });
  });
  if (ops.length === 0) {
    findings.push({ severity: 'error', code: 'NO_OPS', message: 'No operations found in spec.' });
    score -= 50;
  }
  ops.forEach(({ path, method, op }) => {
    if (!op.operationId) {
      findings.push({ severity: 'warn', code: 'MISSING_OPERATION_ID', path, method, message: 'operationId missing — agents identify tools by operationId.' });
      score -= 2;
    }
    if (!op.summary && !op.description) {
      findings.push({ severity: 'warn', code: 'MISSING_DOCSTRING', path, method, message: 'No summary/description — agents need natural-language intent.' });
      score -= 3;
    }
    if (op.requestBody && !findExamples(op.requestBody)) {
      findings.push({ severity: 'info', code: 'NO_REQUEST_EXAMPLE', path, method, message: 'No request example — agents benefit from realistic samples.' });
      score -= 1;
    }
    const has2xx = Object.keys(op.responses || {}).some(k => /^2/.test(k));
    if (!has2xx) {
      findings.push({ severity: 'warn', code: 'NO_SUCCESS_RESPONSE', path, method, message: 'No 2xx response defined.' });
      score -= 3;
    }
    if (['post', 'put', 'patch', 'delete'].includes(method) && !hasIdempotencyHeader(op)) {
      findings.push({ severity: 'info', code: 'NO_IDEMPOTENCY_HEADER', path, method, message: 'Side-effecting op without Idempotency-Key header parameter.' });
      score -= 1;
    }
  });
  const sec = spec?.components?.securitySchemes || {};
  const hasOAuth = Object.values(sec).some(s => s.type === 'oauth2');
  const hasApiKey = Object.values(sec).some(s => s.type === 'apiKey');
  if (!hasOAuth && !hasApiKey) {
    findings.push({ severity: 'warn', code: 'NO_AUTH_SCHEME', message: 'No apiKey or oauth2 securityScheme — agents cannot self-onboard.' });
    score -= 4;
  }
  return { score: Math.max(0, score), op_count: ops.length, findings };
}
function findExamples(rb) {
  const content = rb?.content || {};
  return Object.values(content).some(c => c?.example || c?.examples);
}
function hasIdempotencyHeader(op) {
  return (op.parameters || []).some(p => p.in === 'header' && /idempotency/i.test(p.name));
}

// --- conversion helpers ----------------------------------------------------
function openapiOpToTool(path, method, op) {
  const operationId = op.operationId || `${method}_${path.replace(/[^a-z0-9]/gi, '_')}`;
  const inputSchema = { type: 'object', properties: {}, required: [] };
  (op.parameters || []).forEach(p => {
    inputSchema.properties[p.name] = {
      type: p.schema?.type || 'string',
      description: p.description || ''
    };
    if (p.required) inputSchema.required.push(p.name);
  });
  if (op.requestBody?.content?.['application/json']?.schema) {
    Object.assign(inputSchema, op.requestBody.content['application/json'].schema);
  }
  const out = op.responses?.['200']?.content?.['application/json']?.schema || op.responses?.['201']?.content?.['application/json']?.schema || undefined;
  return {
    name: operationId,
    description: op.summary || op.description || '',
    inputSchema,
    outputSchema: out,
    annotations: {
      readOnlyHint: method === 'get',
      idempotentHint: method === 'get' || hasIdempotencyHeader(op),
      destructiveHint: method === 'delete'
    },
    _http: { path, method: method.toUpperCase() }
  };
}

function internalToolToMcpTool(row) {
  let inputSchema = {};
  try { inputSchema = JSON.parse(row.input_schema || '{}'); } catch {}
  let outputSchema; try { outputSchema = JSON.parse(row.output_schema); } catch {}
  return {
    name: row.name,
    description: row.description || '',
    inputSchema: { type: 'object', properties: inputSchema },
    outputSchema,
    annotations: {
      readOnlyHint: /search|read|get|list|fetch/i.test(row.name),
      idempotentHint: /search|read|get|list|fetch|summari/i.test(row.name),
      destructiveHint: /delete|drop|revoke|terminate/i.test(row.name)
    }
  };
}

// --- POST /from-service ----------------------------------------------------
router.post('/from-service', async (req, res) => {
  try {
    const { service_id, slug, category, pricing_model = 'usage' } = req.body || {};
    if (!service_id || !slug) {
      return res.status(400).json({ error: 'service_id and slug required', error_code: 'BAD_INPUT' });
    }
    const svc = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (!svc.rows[0]) return res.status(404).json({ error: 'service not found' });
    const tools = await pool.query('SELECT * FROM tools WHERE service_id = $1', [service_id]);
    const mcpTools = tools.rows.map(internalToolToMcpTool);
    const manifest = {
      protocolVersion: MCP_VERSION,
      serverInfo: { name: svc.rows[0].name, version: svc.rows[0].version || '1.0.0', publisher: 'AgentHub' },
      capabilities: { tools: { listChanged: true }, logging: {} },
      transport: { type: 'http', endpoint: `/api/mcp/${slug}` },
      pricing: { model: pricing_model },
      tools: mcpTools
    };
    const ins = await pool.query(
      `INSERT INTO mcp_servers (slug, name, description, source_service_id, transport,
         manifest_url, endpoint_url, mcp_version, tools_count, publisher, publisher_verified,
         pricing_model, category, tags)
       VALUES ($1,$2,$3,$4,'http',$5,$6,$7,$8,'AgentHub',TRUE,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET
         description = EXCLUDED.description,
         tools_count = EXCLUDED.tools_count,
         endpoint_url = EXCLUDED.endpoint_url
       RETURNING *`,
      [slug, svc.rows[0].name, svc.rows[0].description || '', service_id,
       `/api/mcp/${slug}/manifest`, `/api/mcp/${slug}`, MCP_VERSION,
       mcpTools.length, pricing_model, category || svc.rows[0].category || null,
       JSON.stringify([svc.rows[0].category, 'auto-published'].filter(Boolean))]
    );
    res.status(201).json({ published: ins.rows[0], manifest });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- POST /from-openapi ----------------------------------------------------
router.post('/from-openapi', async (req, res) => {
  try {
    const { spec, slug, publisher = 'self', pricing_model = 'byok', category } = req.body || {};
    if (!spec || !slug) return res.status(400).json({ error: 'spec and slug required', error_code: 'BAD_INPUT' });
    if (!spec.openapi || !spec.openapi.startsWith('3.')) {
      return res.status(400).json({ error: 'Only OpenAPI 3.x specs accepted.', error_code: 'BAD_INPUT' });
    }
    const lint = lintOpenAPI(spec);
    const tools = [];
    Object.entries(spec.paths || {}).forEach(([p, methods]) => {
      Object.entries(methods).forEach(([m, op]) => {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(m)) {
          tools.push(openapiOpToTool(p, m, op));
        }
      });
    });
    const manifest = {
      protocolVersion: MCP_VERSION,
      serverInfo: {
        name: spec.info?.title || slug,
        version: spec.info?.version || '1.0.0',
        publisher
      },
      capabilities: { tools: { listChanged: true }, logging: {} },
      transport: { type: 'http', endpoint: spec.servers?.[0]?.url || `/api/mcp/${slug}` },
      pricing: { model: pricing_model },
      tools,
      _lint: lint
    };
    const ins = await pool.query(
      `INSERT INTO mcp_servers (slug, name, description, transport, manifest_url, endpoint_url,
         mcp_version, tools_count, publisher, publisher_verified, pricing_model, category, tags, source_url)
       VALUES ($1,$2,$3,'http',$4,$5,$6,$7,$8,FALSE,$9,$10,$11,$12)
       ON CONFLICT (slug) DO UPDATE SET tools_count = EXCLUDED.tools_count RETURNING *`,
      [slug, manifest.serverInfo.name, spec.info?.description || '',
       `/api/mcp/${slug}/manifest`, manifest.transport.endpoint, MCP_VERSION,
       tools.length, publisher, pricing_model, category || null,
       JSON.stringify(['openapi-imported']), spec.externalDocs?.url || null]
    );
    res.status(201).json({ published: ins.rows[0], manifest, lint });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- POST /lint ------------------------------------------------------------
router.post('/lint', (req, res) => {
  const spec = req.body?.spec;
  if (!spec) return res.status(400).json({ error: 'spec required', error_code: 'BAD_INPUT' });
  res.json(lintOpenAPI(spec));
});

// --- GET /published --------------------------------------------------------
router.get('/published', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM mcp_servers WHERE publisher = 'AgentHub' OR tags ILIKE '%auto-published%' OR tags ILIKE '%openapi-imported%'
       ORDER BY id DESC`
    );
    res.json(r.rows.map(row => ({ ...row, tags: tryParse(row.tags, []) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GET /templates --------------------------------------------------------
router.get('/templates', (_req, res) => {
  res.json({
    auth_scheme: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Bearer token. Use POST /api/agent-identity/keys to mint scoped keys.'
    },
    error_envelope: {
      error: 'BAD_INPUT',
      error_code: 'BAD_INPUT',
      retryable: false,
      description: 'See GET /api/sandbox-dryrun/error-codes for the full registry.',
      schema_errors: [{ path: 'field', message: 'why this failed' }]
    },
    idempotency_header: {
      name: 'Idempotency-Key',
      in: 'header',
      schema: { type: 'string' },
      description: 'Optional. Repeating a call with the same key returns the prior result.'
    },
    pagination: {
      strategy: 'cursor',
      params: { limit: 50, cursor: 'opaque_string' },
      response_meta: { next_cursor: 'string | null', has_more: 'boolean' }
    },
    rate_limit_headers: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After']
  });
});

function tryParse(s, fb = null) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

module.exports = router;
