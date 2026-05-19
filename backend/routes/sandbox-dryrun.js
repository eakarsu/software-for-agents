// Agent Sandbox / Dry-Run + Idempotency-Key + Structured Errors.
//
// Why this exists (Software-for-Agents brief):
//   Agents need typed schemas (zod/pydantic shape), idempotency keys to avoid
//   double-invoking side-effecting tools mid-retry, and structured errors so
//   the agent can react programmatically.
//
// Endpoints:
//   POST  /api/sandbox-dryrun/invoke           — run a tool in sandbox; validates
//                                                schema, caches by idempotency_key.
//   GET   /api/sandbox-dryrun/runs             — recent runs (filterable)
//   GET   /api/sandbox-dryrun/runs/:id         — single run
//   POST  /api/sandbox-dryrun/replay/:id       — re-run with same input
//   GET   /api/sandbox-dryrun/error-codes      — structured error code reference
//   GET   /api/sandbox-dryrun/idempotency/:key — look up cached result
//   POST  /api/sandbox-dryrun/validate         — schema-only check (no execution)
//
// Demonstrates: typed schemas, idempotency caching, structured error envelopes
// in the shape recommended for agent-friendly APIs.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

// --- structured error code reference (agents read this to handle failures) -
const ERROR_CODES = {
  BAD_INPUT:           { http: 400, retryable: false, description: 'Input failed schema validation.' },
  AUTH_REQUIRED:       { http: 401, retryable: false, description: 'Missing or invalid credentials.' },
  POLICY_DENIED:       { http: 403, retryable: false, description: 'Policy blocked the call (destructive / out-of-scope).' },
  NOT_FOUND:           { http: 404, retryable: false, description: 'Target resource does not exist.' },
  TIMEOUT:             { http: 408, retryable: true,  description: 'Execution exceeded time budget — safe to retry.' },
  IDEMPOTENT_CACHED:   { http: 200, retryable: false, description: 'Returned cached result for idempotency key.' },
  RATE_LIMIT:          { http: 429, retryable: true,  description: 'Per-agent rate limit hit. Honor Retry-After.' },
  UPSTREAM_FAILURE:    { http: 502, retryable: true,  description: 'Upstream service failed; safe to retry with backoff.' },
  TOOL_UNAVAILABLE:    { http: 503, retryable: true,  description: 'Tool temporarily disabled.' },
  INTERNAL:            { http: 500, retryable: true,  description: 'Unexpected server error.' }
};

router.get('/error-codes', (_req, res) => res.json(ERROR_CODES));

// --- input-schema validation (zod-ish, schema-driven) -----------------------
// Schemas stored as JSON in tools.input_schema. We support a minimal subset
// modeled after the agent-tool convention shown in seed.sql:
//   { "field": "string" | { "type": "string", "required": true, "default": ... } }
function normField(spec) {
  if (typeof spec === 'string') return { type: spec, required: true };
  if (spec && typeof spec === 'object') {
    return {
      type: spec.type || 'string',
      required: spec.required !== false,
      default: spec.default,
      enum: spec.enum,
      minimum: spec.minimum,
      maximum: spec.maximum
    };
  }
  return { type: 'any', required: false };
}

function validateAgainstSchema(input, schemaObj) {
  const errors = [];
  if (!schemaObj || typeof schemaObj !== 'object') return { valid: true, errors: [] };
  for (const [k, raw] of Object.entries(schemaObj)) {
    const spec = normField(raw);
    const v = input?.[k];
    if (v === undefined || v === null || v === '') {
      if (spec.required && spec.default === undefined) {
        errors.push({ path: k, message: `Required field '${k}' missing` });
      }
      continue;
    }
    if (spec.type === 'string' && typeof v !== 'string') errors.push({ path: k, message: `Expected string, got ${typeof v}` });
    if (spec.type === 'integer' && !Number.isInteger(v))  errors.push({ path: k, message: `Expected integer, got ${typeof v}` });
    if (spec.type === 'number'  && typeof v !== 'number') errors.push({ path: k, message: `Expected number, got ${typeof v}` });
    if (spec.type === 'boolean' && typeof v !== 'boolean')errors.push({ path: k, message: `Expected boolean, got ${typeof v}` });
    if (spec.type === 'array'   && !Array.isArray(v))     errors.push({ path: k, message: `Expected array, got ${typeof v}` });
    if (spec.enum && !spec.enum.includes(v))              errors.push({ path: k, message: `Value must be one of: ${spec.enum.join(',')}` });
    if (spec.minimum !== undefined && Number(v) < spec.minimum) errors.push({ path: k, message: `Value < minimum ${spec.minimum}` });
    if (spec.maximum !== undefined && Number(v) > spec.maximum) errors.push({ path: k, message: `Value > maximum ${spec.maximum}` });
  }
  return { valid: errors.length === 0, errors };
}

function structuredError(code, extra = {}) {
  const meta = ERROR_CODES[code] || ERROR_CODES.INTERNAL;
  return {
    error: code,
    error_code: code,
    retryable: meta.retryable,
    description: meta.description,
    ...extra
  };
}

// --- pure validate (no execution) ------------------------------------------
router.post('/validate', async (req, res) => {
  try {
    const { tool_id, input } = req.body || {};
    if (!tool_id || input === undefined) {
      return res.status(400).json(structuredError('BAD_INPUT', { detail: 'tool_id and input required' }));
    }
    const t = await pool.query('SELECT input_schema, name FROM tools WHERE id = $1', [tool_id]);
    if (!t.rows[0]) return res.status(404).json(structuredError('NOT_FOUND'));
    let schema = null;
    try { schema = JSON.parse(t.rows[0].input_schema || '{}'); } catch { schema = {}; }
    const v = validateAgainstSchema(input, schema);
    res.json({ tool: t.rows[0].name, valid: v.valid, errors: v.errors, schema });
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

// --- main invoke endpoint --------------------------------------------------
router.post('/invoke', async (req, res) => {
  try {
    const { tool_id, agent_id, input, idempotency_key, dry_run = true } = req.body || {};
    if (!tool_id || input === undefined) {
      return res.status(400).json(structuredError('BAD_INPUT', { detail: 'tool_id and input required' }));
    }
    // Idempotency cache check
    if (idempotency_key) {
      const cached = await pool.query(
        'SELECT * FROM sandbox_runs WHERE idempotency_key = $1',
        [idempotency_key]
      );
      if (cached.rows[0]) {
        return res.json({
          ...structuredError('IDEMPOTENT_CACHED'),
          run: cached.rows[0],
          input: tryParse(cached.rows[0].input_payload),
          output: tryParse(cached.rows[0].output_payload),
          cached: true
        });
      }
    }
    const t = await pool.query('SELECT * FROM tools WHERE id = $1', [tool_id]);
    if (!t.rows[0]) return res.status(404).json(structuredError('NOT_FOUND'));
    const tool = t.rows[0];

    let schema = {};
    try { schema = JSON.parse(tool.input_schema || '{}'); } catch { schema = {}; }
    const v = validateAgainstSchema(input, schema);

    let agentDbId = null;
    if (agent_id) {
      const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
      agentDbId = a.rows[0]?.id || null;
    }

    const t0 = Date.now();
    let outputPayload = null;
    let statusCode = 200;
    let errorCode = null;

    if (!v.valid) {
      statusCode = 400;
      errorCode = 'BAD_INPUT';
    } else {
      // Simulated execution: agents get deterministic, schema-shaped fake output.
      // (Real execution would dispatch via the integrations layer.)
      let exampleOut = {};
      try { exampleOut = JSON.parse(tool.example_output || '{}'); } catch {}
      outputPayload = {
        ...exampleOut,
        _dry_run: !!dry_run,
        _tool: tool.name,
        _ts: new Date().toISOString()
      };
      // Simulated policy: any tool whose name contains 'delete'/'drop' is sandbox-blocked.
      if (/\b(delete|drop|destroy|revoke)\b/i.test(tool.name + ' ' + JSON.stringify(input))) {
        statusCode = 403;
        errorCode = 'POLICY_DENIED';
        outputPayload = null;
      }
    }
    const duration_ms = Date.now() - t0 + Math.floor(Math.random() * 40); // add jitter

    const insert = await pool.query(
      `INSERT INTO sandbox_runs (agent_id, tool_id, idempotency_key, input_payload, output_payload,
         schema_valid, schema_errors, duration_ms, dry_run, status_code, error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [agentDbId, tool_id, idempotency_key || null, JSON.stringify(input),
       outputPayload ? JSON.stringify(outputPayload) : null,
       v.valid, v.errors.length ? JSON.stringify(v.errors) : null,
       duration_ms, !!dry_run, statusCode, errorCode]
    );
    const envelope = errorCode
      ? structuredError(errorCode, { schema_errors: v.errors })
      : { status: 'ok' };
    res.status(statusCode).json({
      ...envelope,
      run: insert.rows[0],
      output: outputPayload
    });
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

router.get('/runs', async (req, res) => {
  try {
    const { agent_id, tool_id, error_code, limit = 50 } = req.query;
    const params = [];
    const where = [];
    if (agent_id) {
      const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
      const dbId = a.rows[0]?.id;
      if (!dbId) return res.json([]);
      params.push(dbId);  where.push(`agent_id = $${params.length}`);
    }
    if (tool_id)    { params.push(tool_id);    where.push(`tool_id = $${params.length}`); }
    if (error_code) { params.push(error_code); where.push(`error_code = $${params.length}`); }
    params.push(Math.min(Number(limit) || 50, 500));
    const sql = `SELECT * FROM sandbox_runs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${params.length}`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map(row => ({ ...row, schema_errors: tryParse(row.schema_errors, null) })));
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

router.get('/runs/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sandbox_runs WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json(structuredError('NOT_FOUND'));
    res.json({
      ...r.rows[0],
      input_payload: tryParse(r.rows[0].input_payload),
      output_payload: tryParse(r.rows[0].output_payload),
      schema_errors: tryParse(r.rows[0].schema_errors, null)
    });
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

router.post('/replay/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sandbox_runs WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json(structuredError('NOT_FOUND'));
    const orig = r.rows[0];
    req.body = {
      tool_id: orig.tool_id,
      input: tryParse(orig.input_payload, {}),
      dry_run: orig.dry_run,
      idempotency_key: null
    };
    // re-issue through the same flow as /invoke (synthesize a fresh response)
    const tool = (await pool.query('SELECT * FROM tools WHERE id=$1', [orig.tool_id])).rows[0];
    if (!tool) return res.status(404).json(structuredError('NOT_FOUND'));
    let schema = {}; try { schema = JSON.parse(tool.input_schema || '{}'); } catch {}
    const v = validateAgainstSchema(req.body.input, schema);
    const ok = v.valid;
    const out = ok ? { ...tryParse(tool.example_output, {}), _replayed_from: orig.id } : null;
    const ins = await pool.query(
      `INSERT INTO sandbox_runs (agent_id, tool_id, input_payload, output_payload, schema_valid, schema_errors, duration_ms, dry_run, status_code, error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [orig.agent_id, orig.tool_id, JSON.stringify(req.body.input),
       out ? JSON.stringify(out) : null, ok, v.errors.length ? JSON.stringify(v.errors) : null,
       50 + Math.floor(Math.random() * 200), orig.dry_run, ok ? 200 : 400, ok ? null : 'BAD_INPUT']
    );
    res.json({ replay_of: orig.id, run: ins.rows[0], output: out });
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

router.get('/idempotency/:key', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM sandbox_runs WHERE idempotency_key = $1', [req.params.key]);
    if (!r.rows[0]) return res.status(404).json(structuredError('NOT_FOUND'));
    res.json({
      ...r.rows[0],
      input_payload: tryParse(r.rows[0].input_payload),
      output_payload: tryParse(r.rows[0].output_payload),
      schema_errors: tryParse(r.rows[0].schema_errors, null)
    });
  } catch (err) { res.status(500).json(structuredError('INTERNAL', { detail: err.message })); }
});

function tryParse(s, fb = null) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

module.exports = router;
