// MCP Registry & Catalog — agent-facing index of MCP servers.
//
// Provides:
//   * GET  /api/mcp-registry/servers                  — list with filters (category, transport, pricing)
//   * GET  /api/mcp-registry/servers/:slug            — full record
//   * GET  /api/mcp-registry/servers/:slug/manifest   — synthesizes MCP /.well-known/mcp.json manifest
//                                                       conforming to MCP protocol version 2025-06-18
//   * GET  /api/mcp-registry/categories               — facet counts
//   * GET  /api/mcp-registry/stats                    — aggregate registry stats
//   * POST /api/mcp-registry/servers                  — register a new MCP server
//   * POST /api/mcp-registry/servers/:slug/install    — increment install_count (agent action)
//   * POST /api/mcp-registry/discover                 — natural-language discovery (capability -> servers)
//
// Domain notes: MCP is Anthropic's Model Context Protocol. Servers expose tools,
// prompts, and resources. Transports: stdio (local), http+SSE (remote), websocket.
// The manifest synthesized here mirrors the Anthropic reference server shape.

const express = require('express');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

const MCP_PROTOCOL_VERSION = '2025-06-18';
const SUPPORTED_TRANSPORTS = ['stdio', 'http', 'sse', 'websocket'];

// --- helpers ---------------------------------------------------------------
function parseJSON(s, fallback) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

async function loadToolsForService(serviceId) {
  if (!serviceId) return [];
  const r = await pool.query(
    `SELECT id, name, description, input_schema, output_schema, example_input, example_output
     FROM tools WHERE service_id = $1 ORDER BY name`,
    [serviceId]
  );
  return r.rows.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: parseJSON(t.input_schema, { type: 'object', properties: {} }),
    outputSchema: parseJSON(t.output_schema, undefined),
    annotations: {
      title: t.name,
      readOnlyHint: /search|read|get|list|fetch/i.test(t.name),
      idempotentHint: /search|read|get|list|fetch|summari/i.test(t.name),
      destructiveHint: /delete|drop|revoke|terminate/i.test(t.name)
    },
    _example: t.example_input ? parseJSON(t.example_input, {}) : undefined
  }));
}

// --- list / detail ---------------------------------------------------------
router.get('/servers', async (req, res) => {
  try {
    const { category, transport, pricing, publisher, q } = req.query;
    const params = [];
    const where = [];
    if (category)  { params.push(category);          where.push(`category = $${params.length}`); }
    if (transport) { params.push(transport);         where.push(`transport = $${params.length}`); }
    if (pricing)   { params.push(pricing);           where.push(`pricing_model = $${params.length}`); }
    if (publisher) { params.push(publisher);         where.push(`publisher = $${params.length}`); }
    if (q)         { params.push(`%${q}%`);          where.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length} OR tags ILIKE $${params.length})`); }
    const sql = `SELECT * FROM mcp_servers ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY install_count DESC NULLS LAST, name`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map(row => ({ ...row, tags: parseJSON(row.tags, []) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/servers/:slug', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM mcp_servers WHERE slug = $1', [req.params.slug]);
    const row = r.rows[0];
    if (!row) return res.status(404).json({ error: 'MCP server not found' });
    const tools = await loadToolsForService(row.source_service_id);
    res.json({ ...row, tags: parseJSON(row.tags, []), tools });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- manifest (the agent-facing thing) -------------------------------------
router.get('/servers/:slug/manifest', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM mcp_servers WHERE slug = $1', [req.params.slug]);
    const row = r.rows[0];
    if (!row) return res.status(404).json({ error: 'MCP server not found' });
    const tools = await loadToolsForService(row.source_service_id);
    res.json({
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: {
        name: row.name,
        version: '1.0.0',
        publisher: row.publisher,
        publisherVerified: row.publisher_verified
      },
      capabilities: {
        tools: { listChanged: true },
        prompts: row.prompts_count > 0 ? { listChanged: true } : undefined,
        resources: row.resources_count > 0 ? { listChanged: true, subscribe: true } : undefined,
        logging: {}
      },
      transport: { type: row.transport, endpoint: row.endpoint_url || undefined },
      pricing: {
        model: row.pricing_model,
        note: row.pricing_model === 'byok' ? 'Bring your own provider key.' :
              row.pricing_model === 'usage' ? 'Metered per tool call.' :
              row.pricing_model === 'subscription' ? 'Monthly subscription required.' : 'Free.'
      },
      tools,
      _meta: {
        installCount: row.install_count,
        rating: row.rating,
        category: row.category,
        tags: parseJSON(row.tags, [])
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- facets / stats --------------------------------------------------------
router.get('/categories', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT category, COUNT(*)::int AS count,
              SUM(install_count)::bigint AS total_installs,
              ROUND(AVG(rating)::numeric, 2) AS avg_rating
       FROM mcp_servers WHERE category IS NOT NULL
       GROUP BY category ORDER BY count DESC`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (_req, res) => {
  try {
    const overall = await pool.query(
      `SELECT COUNT(*)::int AS total_servers,
              SUM(install_count)::bigint AS total_installs,
              SUM(tools_count)::int AS total_tools,
              ROUND(AVG(rating)::numeric,2) AS avg_rating,
              COUNT(*) FILTER (WHERE publisher_verified)::int AS verified_count
       FROM mcp_servers`
    );
    const transports = await pool.query(
      `SELECT transport, COUNT(*)::int AS count FROM mcp_servers GROUP BY transport`
    );
    const top = await pool.query(
      `SELECT slug, name, install_count, rating FROM mcp_servers
       ORDER BY install_count DESC LIMIT 5`
    );
    res.json({
      protocolVersion: MCP_PROTOCOL_VERSION,
      supportedTransports: SUPPORTED_TRANSPORTS,
      ...overall.rows[0],
      transports: transports.rows,
      top_servers: top.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- register --------------------------------------------------------------
router.post('/servers', async (req, res) => {
  try {
    const b = req.body || {};
    const required = ['slug', 'name', 'transport'];
    const missing = required.filter(k => !b[k]);
    if (missing.length) return res.status(400).json({ error: `Missing required: ${missing.join(', ')}`, error_code: 'BAD_INPUT' });
    if (!SUPPORTED_TRANSPORTS.includes(b.transport)) {
      return res.status(400).json({
        error: `Unsupported transport. Allowed: ${SUPPORTED_TRANSPORTS.join(', ')}`,
        error_code: 'BAD_INPUT'
      });
    }
    const r = await pool.query(
      `INSERT INTO mcp_servers (slug, name, description, source_service_id, transport, manifest_url,
         endpoint_url, mcp_version, tools_count, publisher, publisher_verified, pricing_model,
         category, tags, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [b.slug, b.name, b.description || '', b.source_service_id || null, b.transport,
       b.manifest_url || null, b.endpoint_url || null, b.mcp_version || MCP_PROTOCOL_VERSION,
       b.tools_count || 0, b.publisher || (req.user?.email || 'self'), !!b.publisher_verified,
       b.pricing_model || 'free', b.category || null, JSON.stringify(b.tags || []), b.source_url || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (String(err.message).includes('duplicate key')) {
      return res.status(409).json({ error: 'slug already exists', error_code: 'DUPLICATE_SLUG' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- install (agent declares "I now use this server") ----------------------
router.post('/servers/:slug/install', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE mcp_servers SET install_count = install_count + 1 WHERE slug = $1 RETURNING slug, install_count`,
      [req.params.slug]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'MCP server not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- natural-language discovery -------------------------------------------
// Lightweight, non-LLM keyword/tag scorer so agents can ask "I need browser
// automation" and get a ranked shortlist without paying for inference.
router.post('/discover', async (req, res) => {
  try {
    const { query = '', limit = 5 } = req.body || {};
    if (!query.trim()) return res.status(400).json({ error: 'query required', error_code: 'BAD_INPUT' });
    const all = await pool.query('SELECT * FROM mcp_servers');
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const scored = all.rows.map(r => {
      const tags = parseJSON(r.tags, []);
      const hay = `${r.name} ${r.description} ${tags.join(' ')} ${r.category || ''}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { ...r, tags, _score: score };
    }).filter(r => r._score > 0).sort((a, b) =>
      (b._score - a._score) ||
      (b.install_count - a.install_count) ||
      (Number(b.rating) - Number(a.rating))
    ).slice(0, Number(limit) || 5);
    res.json({ query, matches: scored });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
