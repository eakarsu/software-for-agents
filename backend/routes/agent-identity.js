// Agent Identity & API Keys — AGENTPASS-style programmatic identity for agents.
//
// Design notes:
//   * An "agent" is a first-class principal (not a human user). It has a stable
//     agent_id ("agt_..."), a framework (langgraph/crewai/claude-agent-sdk/...),
//     a model, a verified human/org principal, and trust tier.
//   * Each agent can hold multiple scoped API keys. Keys carry rate limits.
//   * Verification methods: dns_txt (org owns domain), oidc (workload identity),
//     email (low trust), manual (admin signoff).
//   * Trust tiers gate which scopes can be requested: unverified < verified < trusted < partner.
//
// Endpoints:
//   GET   /api/agent-identity/agents                 — list (filters: framework, trust_tier, status)
//   GET   /api/agent-identity/agents/:agent_id       — full record incl. keys (hashes redacted)
//   POST  /api/agent-identity/agents                 — programmatic signup
//   POST  /api/agent-identity/agents/:agent_id/verify — submit verification proof
//   POST  /api/agent-identity/keys                   — issue scoped key
//   POST  /api/agent-identity/keys/:id/revoke        — revoke key
//   GET   /api/agent-identity/keys/by-agent/:agent_id — list keys for agent
//   POST  /api/agent-identity/oauth/grants           — initiate OAuth-for-agents grant
//   POST  /api/agent-identity/oauth/grants/:id/approve — approve a pending grant
//   GET   /api/agent-identity/trust-policy           — server-side trust/scope policy

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

const TRUST_ORDER = ['unverified', 'verified', 'trusted', 'partner'];
const ALLOWED_FRAMEWORKS = [
  'langchain', 'langgraph', 'crewai', 'autogen', 'openai-agents-sdk',
  'claude-agent-sdk', 'mastra', 'custom', 'unknown'
];
const ALLOWED_VERIFICATION = ['email', 'dns_txt', 'oidc', 'manual'];

// Server-side trust→scope policy. The minimum tier required to request each scope.
const SCOPE_MIN_TIER = {
  'tools:read':       'unverified',
  'mcp:list':         'unverified',
  'eval:run':         'unverified',
  'tools:invoke':     'verified',
  'executions:write': 'verified',
  'sql:exec':         'verified',
  'code:exec':        'trusted',
  'fs:rw':            'trusted',
  'fs:write':         'trusted',
  'crm:write':        'trusted',
  'payments:read':    'trusted',
  'payments:write':   'partner',
  'github:write':     'trusted',
  'browser:exec':     'verified',
  'doc:rw':           'verified',
  'gmail:rw':         'verified',
  'sast:exec':        'trusted',
  'secrets:read':     'partner',
  'refactor:exec':    'trusted'
};

function tierGte(actual, required) {
  return TRUST_ORDER.indexOf(actual) >= TRUST_ORDER.indexOf(required);
}

function generateAgentId() {
  return 'agt_' + crypto.randomBytes(8).toString('hex');
}

function generateApiKey() {
  const raw = 'sk_live_' + crypto.randomBytes(24).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 18) + '...' + raw.slice(-4);
  return { raw, hash, prefix };
}

// --- list / detail ---------------------------------------------------------
router.get('/agents', async (req, res) => {
  try {
    const { framework, trust_tier, status, q } = req.query;
    const params = [];
    const where = [];
    if (framework)  { params.push(framework);   where.push(`framework = $${params.length}`); }
    if (trust_tier) { params.push(trust_tier);  where.push(`trust_tier = $${params.length}`); }
    if (status)     { params.push(status);      where.push(`status = $${params.length}`); }
    if (q)          { params.push(`%${q}%`);    where.push(`(display_name ILIKE $${params.length} OR organization ILIKE $${params.length} OR agent_id ILIKE $${params.length})`); }
    const sql = `SELECT * FROM agents ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY last_seen_at DESC NULLS LAST, created_at DESC`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents/:agent_id', async (req, res) => {
  try {
    const a = await pool.query('SELECT * FROM agents WHERE agent_id = $1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const agent = a.rows[0];
    const keys = await pool.query(
      'SELECT id, key_prefix, scopes, rate_limit_rpm, rate_limit_tpm, expires_at, revoked, last_used_at, created_at FROM agent_api_keys WHERE agent_id = $1 ORDER BY created_at DESC',
      [agent.id]
    );
    const grants = await pool.query(
      'SELECT id, provider, granted_scopes, on_behalf_of, status, expires_at, created_at FROM agent_oauth_grants WHERE agent_id = $1 ORDER BY created_at DESC',
      [agent.id]
    );
    res.json({ ...agent, capabilities: tryParse(agent.capabilities, []), keys: keys.rows, oauth_grants: grants.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function tryParse(s, fb) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

// --- programmatic signup ---------------------------------------------------
router.post('/agents', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.display_name) return res.status(400).json({ error: 'display_name required', error_code: 'BAD_INPUT' });
    const framework = ALLOWED_FRAMEWORKS.includes(b.framework) ? b.framework : 'custom';
    if (b.framework && !ALLOWED_FRAMEWORKS.includes(b.framework)) {
      return res.status(400).json({
        error: `framework must be one of: ${ALLOWED_FRAMEWORKS.join(', ')}`,
        error_code: 'BAD_INPUT'
      });
    }
    const agent_id = generateAgentId();
    const r = await pool.query(
      `INSERT INTO agents (agent_id, display_name, organization, framework, framework_version,
         model_id, verified_principal, verification_method, capabilities, trust_tier, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [agent_id, b.display_name, b.organization || null, framework, b.framework_version || null,
       b.model_id || null, b.verified_principal || null,
       ALLOWED_VERIFICATION.includes(b.verification_method) ? b.verification_method : null,
       JSON.stringify(b.capabilities || []),
       'unverified', 'active']
    );
    res.status(201).json({
      ...r.rows[0],
      next_steps: [
        'POST /api/agent-identity/agents/' + agent_id + '/verify { proof: "..." }',
        'POST /api/agent-identity/keys { agent_id: "' + agent_id + '", scopes: ["tools:read"] }'
      ]
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- verification ----------------------------------------------------------
router.post('/agents/:agent_id/verify', async (req, res) => {
  try {
    const { method, proof } = req.body || {};
    if (!ALLOWED_VERIFICATION.includes(method)) {
      return res.status(400).json({ error: 'method must be one of: ' + ALLOWED_VERIFICATION.join(', '), error_code: 'BAD_INPUT' });
    }
    if (!proof) return res.status(400).json({ error: 'proof required', error_code: 'BAD_INPUT' });
    // Demo verification logic — in production this would validate DNS, OIDC, etc.
    let newTier = 'unverified';
    if (method === 'email')   newTier = 'verified';
    if (method === 'dns_txt') newTier = 'trusted';
    if (method === 'oidc')    newTier = 'trusted';
    if (method === 'manual')  newTier = 'partner';
    const r = await pool.query(
      `UPDATE agents SET verification_method=$1, trust_tier=$2 WHERE agent_id=$3 RETURNING *`,
      [method, newTier, req.params.agent_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'agent not found' });
    res.json({ agent: r.rows[0], verification_accepted: true, new_trust_tier: newTier });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- keys ------------------------------------------------------------------
router.post('/keys', async (req, res) => {
  try {
    const { agent_id, scopes, rate_limit_rpm, rate_limit_tpm, expires_in_days } = req.body || {};
    if (!agent_id || !Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({ error: 'agent_id and non-empty scopes required', error_code: 'BAD_INPUT' });
    }
    const a = await pool.query('SELECT * FROM agents WHERE agent_id = $1', [agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const agentTier = a.rows[0].trust_tier || 'unverified';
    const denied = scopes.filter(s => SCOPE_MIN_TIER[s] && !tierGte(agentTier, SCOPE_MIN_TIER[s]));
    if (denied.length) {
      return res.status(403).json({
        error: `agent tier '${agentTier}' insufficient for scopes: ${denied.join(', ')}`,
        error_code: 'INSUFFICIENT_TIER',
        required: denied.map(s => ({ scope: s, min_tier: SCOPE_MIN_TIER[s] }))
      });
    }
    const { raw, hash, prefix } = generateApiKey();
    const expires = expires_in_days
      ? new Date(Date.now() + Number(expires_in_days) * 86400000)
      : null;
    const r = await pool.query(
      `INSERT INTO agent_api_keys (agent_id, key_prefix, key_hash, scopes, rate_limit_rpm, rate_limit_tpm, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, key_prefix, scopes, rate_limit_rpm, rate_limit_tpm, expires_at, created_at`,
      [a.rows[0].id, prefix, hash, JSON.stringify(scopes), rate_limit_rpm || 60, rate_limit_tpm || 100000, expires]
    );
    res.status(201).json({
      ...r.rows[0],
      api_key: raw,
      warning: 'Save this api_key now — it cannot be retrieved later.'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/keys/:id/revoke', async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE agent_api_keys SET revoked = TRUE WHERE id = $1 RETURNING id, key_prefix, revoked',
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'key not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/keys/by-agent/:agent_id', async (req, res) => {
  try {
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const r = await pool.query(
      `SELECT id, key_prefix, scopes, rate_limit_rpm, rate_limit_tpm, expires_at, revoked, last_used_at, created_at
       FROM agent_api_keys WHERE agent_id = $1 ORDER BY created_at DESC`,
      [a.rows[0].id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- oauth-for-agents ------------------------------------------------------
router.post('/oauth/grants', async (req, res) => {
  try {
    const { agent_id, provider, scopes, on_behalf_of, ttl_days } = req.body || {};
    if (!agent_id || !provider || !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'agent_id, provider, scopes required', error_code: 'BAD_INPUT' });
    }
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const expires = ttl_days ? new Date(Date.now() + Number(ttl_days) * 86400000) : null;
    const r = await pool.query(
      `INSERT INTO agent_oauth_grants (agent_id, provider, granted_scopes, on_behalf_of, status, expires_at)
       VALUES ($1,$2,$3,$4,'pending',$5) RETURNING *`,
      [a.rows[0].id, provider, JSON.stringify(scopes), on_behalf_of || null, expires]
    );
    res.status(201).json({
      ...r.rows[0],
      approval_url: `/oauth/approve?grant=${r.rows[0].id}`,
      note: 'Direct end-user to approval_url to complete the OAuth-for-agents flow.'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/oauth/grants/:id/approve', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE agent_oauth_grants SET status='granted' WHERE id=$1 AND status='pending' RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'grant not found or not pending' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- public trust policy ---------------------------------------------------
router.get('/trust-policy', (_req, res) => {
  res.json({
    trust_tiers: TRUST_ORDER,
    verification_methods: ALLOWED_VERIFICATION,
    scope_min_tier: SCOPE_MIN_TIER,
    frameworks: ALLOWED_FRAMEWORKS,
    notes: [
      'Tiers are upgraded by submitting verification proof.',
      'dns_txt and oidc grant trusted tier; manual review grants partner.',
      'Scopes are gated by minimum tier server-side at key-issuance time.'
    ]
  });
});

module.exports = router;
