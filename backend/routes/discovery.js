// Apply pass 7 — Agent-first discovery surface.
//
//   GET /api/discovery/manifest      — public-ish manifest (JWT-protected here,
//                                       mirrors what /.well-known would expose)
//   GET /api/discovery/facets        — service facets (categories / auth_type /
//                                       status / counts) for narrow filtering
//   GET /api/discovery/tags          — tool tags inferred from tool names
//   GET /api/discovery/sdk-snippets  — copy-pasteable bearer-auth snippets in
//                                       curl / python / node for agents
//
// All read-only. No new schema. Falls back to safe defaults so it never 5xx's
// on an empty database.

const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

async function safeOne(sql, params = []) {
  try { const r = await db.query(sql, params); return r.rows[0]; }
  catch { return null; }
}
async function safeRows(sql, params = []) {
  try { const r = await db.query(sql, params); return r.rows || []; }
  catch { return []; }
}

router.get('/manifest', auth, async (_req, res) => {
  try {
    const svc = await safeOne('SELECT COUNT(*)::int AS n FROM services');
    const tls = await safeOne('SELECT COUNT(*)::int AS n FROM tools');
    const integ = await safeOne('SELECT COUNT(*)::int AS n FROM integrations');
    const docs = await safeOne('SELECT COUNT(*)::int AS n FROM documentation');
    const mcps = await safeOne('SELECT COUNT(*)::int AS n FROM mcp_servers');
    res.json({
      schema_version: '2026-05-21',
      name: 'AgentHub — Software for Agents',
      description: 'Agent-first registry of services, tools, and MCP servers.',
      base_url: '/api',
      auth: {
        type: 'bearer',
        login: 'POST /api/auth/login',
        header: 'Authorization: Bearer <token>'
      },
      capabilities: {
        services: !!svc, tools: !!tls, integrations: !!integ,
        documentation: !!docs, mcp_servers: !!mcps,
        sandbox_dry_run: true, eval_harness: true,
        quota_metering: true, publish_as_mcp: true,
        webhooks: true, custom_views: true
      },
      counts: {
        services: svc?.n ?? 0,
        tools: tls?.n ?? 0,
        integrations: integ?.n ?? 0,
        documentation: docs?.n ?? 0,
        mcp_servers: mcps?.n ?? 0
      },
      endpoints: {
        list_services: 'GET /api/services',
        list_tools: 'GET /api/tools',
        list_integrations: 'GET /api/integrations',
        discover_facets: 'GET /api/discovery/facets',
        discover_tags: 'GET /api/discovery/tags',
        sdk_snippets: 'GET /api/discovery/sdk-snippets',
        webhooks: 'GET /api/webhooks',
        ai_discover: 'POST /api/ai/discover-services',
        sandbox_dryrun: 'POST /api/sandbox-dryrun',
        publish_as_mcp: 'POST /api/publish-as-mcp/publish',
        dashboard_stats: 'GET /api/dashboard/stats'
      },
      conventions: {
        error_shape: { error: 'string', error_code: 'string?' },
        rate_limit: 'see /api/quota-metering/quota',
        pagination: 'limit query parameter where supported',
        idempotency: 'sandbox/dry-run accepts idempotency_key',
        content_type: 'application/json'
      },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/facets', auth, async (_req, res) => {
  try {
    const byCategory = await safeRows(
      `SELECT COALESCE(NULLIF(category,''),'uncategorized') AS category,
              COUNT(*)::int AS count
         FROM services
        GROUP BY category ORDER BY count DESC, category`
    );
    const byAuth = await safeRows(
      `SELECT COALESCE(NULLIF(auth_type,''),'none') AS auth_type,
              COUNT(*)::int AS count
         FROM services
        GROUP BY auth_type ORDER BY count DESC, auth_type`
    );
    const byStatus = await safeRows(
      `SELECT COALESCE(NULLIF(status,''),'unknown') AS status,
              COUNT(*)::int AS count
         FROM services
        GROUP BY status ORDER BY count DESC, status`
    );
    res.json({
      generated_at: new Date().toISOString(),
      services: {
        by_category: byCategory,
        by_auth_type: byAuth,
        by_status: byStatus,
        total: byCategory.reduce((a, b) => a + b.count, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tags', auth, async (_req, res) => {
  try {
    // Tool tags inferred from common verb prefixes: create_*, list_*, etc.
    const rows = await safeRows('SELECT name FROM tools');
    const VERBS = ['create','list','get','update','delete','send','search','post','open','embed','generate','run','sync','fetch','upload','download'];
    const counts = Object.fromEntries(VERBS.map(v => [v, 0]));
    for (const r of rows) {
      const n = String(r.name || '').toLowerCase();
      for (const v of VERBS) {
        if (n.startsWith(v + '_') || n === v) { counts[v] += 1; break; }
      }
    }
    const tags = VERBS
      .map(v => ({ tag: v, count: counts[v] }))
      .filter(t => t.count > 0)
      .sort((a, b) => b.count - a.count);
    res.json({ generated_at: new Date().toISOString(), total_tools: rows.length, tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sdk-snippets', auth, (_req, res) => {
  const sample = {
    curl: [
      '# 1. Login (returns { token })',
      "curl -s -X POST $HOST/api/auth/login \\",
      "  -H 'Content-Type: application/json' \\",
      "  -d '{\"email\":\"agent@example.com\",\"password\":\"...\"}'",
      '',
      '# 2. Use the bearer token',
      "curl -s $HOST/api/discovery/manifest \\",
      "  -H \"Authorization: Bearer $TOKEN\""
    ].join('\n'),
    python: [
      'import os, requests',
      "HOST = os.environ['AGENTHUB_HOST']",
      "tok = requests.post(f'{HOST}/api/auth/login', json={'email':'agent@example.com','password':'...'}).json()['token']",
      "h = {'Authorization': f'Bearer {tok}'}",
      "manifest = requests.get(f'{HOST}/api/discovery/manifest', headers=h).json()",
      'print(manifest["counts"])'
    ].join('\n'),
    node: [
      "const HOST = process.env.AGENTHUB_HOST;",
      "const { token } = await (await fetch(`${HOST}/api/auth/login`, {",
      "  method: 'POST', headers: { 'Content-Type': 'application/json' },",
      "  body: JSON.stringify({ email: 'agent@example.com', password: '...' })",
      "})).json();",
      "const manifest = await (await fetch(`${HOST}/api/discovery/manifest`, {",
      "  headers: { Authorization: `Bearer ${token}` }",
      "})).json();",
      "console.log(manifest.counts);"
    ].join('\n')
  };
  res.json({
    generated_at: new Date().toISOString(),
    description: 'Bearer-auth quick-start snippets for agents in three runtimes.',
    languages: Object.keys(sample),
    snippets: sample
  });
});

module.exports = router;
