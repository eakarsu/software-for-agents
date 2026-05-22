// Apply pass 7 — Webhook subscriptions for agents.
//
//   GET    /api/webhooks                  — list current user's subscriptions
//   GET    /api/webhooks/:id              — fetch one
//   POST   /api/webhooks                  — create (name, url, event_types[], secret)
//   PUT    /api/webhooks/:id              — update (active flag, event_types, url, name)
//   DELETE /api/webhooks/:id              — remove
//   POST   /api/webhooks/:id/test         — simulate a delivery (logs to webhook_deliveries)
//   GET    /api/webhooks/:id/deliveries   — recent delivery history (limit=50)
//   GET    /api/webhooks/event-types      — enumerate supported event types
//
// Schema: webhook_subscriptions + webhook_deliveries (see backend/db/schema.sql,
// Apply pass 7 block). All endpoints JWT-protected. CREATE TABLE IF NOT EXISTS
// kept in schema.sql so re-runs are idempotent. Failures fall back to JSON 5xx
// in the existing project style.

const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

const SUPPORTED_EVENTS = [
  'execution.completed',
  'execution.failed',
  'integration.connected',
  'integration.revoked',
  'quota.exceeded',
  'quota.warning',
  'service.registered',
  'service.deprecated',
  'tool.added',
  'agent.created',
  'mcp.published'
];

function normEventTypes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(e => SUPPORTED_EVENTS.includes(e));
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j.filter(e => SUPPORTED_EVENTS.includes(e));
    } catch { /* fall through */ }
    return raw.split(',').map(s => s.trim()).filter(e => SUPPORTED_EVENTS.includes(e));
  }
  return [];
}

function rowOut(r) {
  if (!r) return r;
  let evs = [];
  try { evs = r.event_types ? JSON.parse(r.event_types) : []; } catch { evs = []; }
  return { ...r, event_types: evs };
}

router.get('/event-types', auth, (_req, res) => {
  res.json({ count: SUPPORTED_EVENTS.length, event_types: SUPPORTED_EVENTS });
});

router.get('/', auth, async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM webhook_subscriptions WHERE user_id = $1 OR $1 IS NULL ORDER BY id DESC',
      [req.user?.id || null]
    );
    res.json(r.rows.map(rowOut));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM webhook_subscriptions WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rowOut(r.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, url, event_types, secret, active } = req.body || {};
    if (!name || !url) return res.status(400).json({ error: 'name and url required' });
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'url must be http(s)' });
    const evs = normEventTypes(event_types);
    const secretPreview = secret ? `…${String(secret).slice(-8)}` : null;
    const r = await db.query(
      `INSERT INTO webhook_subscriptions
         (user_id, name, url, event_types, secret_preview, active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user?.id || null, name, url, JSON.stringify(evs), secretPreview, active !== false]
    );
    res.status(201).json(rowOut(r.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const cur = await db.query('SELECT * FROM webhook_subscriptions WHERE id = $1', [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: 'Not found' });
    const existing = cur.rows[0];
    const name = req.body?.name ?? existing.name;
    const url = req.body?.url ?? existing.url;
    if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'url must be http(s)' });
    const event_types = req.body?.event_types !== undefined
      ? JSON.stringify(normEventTypes(req.body.event_types))
      : existing.event_types;
    const active = req.body?.active !== undefined ? !!req.body.active : existing.active;
    const r = await db.query(
      `UPDATE webhook_subscriptions
         SET name = $1, url = $2, event_types = $3, active = $4
       WHERE id = $5 RETURNING *`,
      [name, url, event_types, active, req.params.id]
    );
    res.json(rowOut(r.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const r = await db.query('DELETE FROM webhook_subscriptions WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: r.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulated delivery — logs a row in webhook_deliveries and bumps counters.
// No outbound HTTP is performed (avoids unbounded egress); status_code 202
// indicates the system queued/recorded the delivery.
router.post('/:id/test', auth, async (req, res) => {
  try {
    const cur = await db.query('SELECT * FROM webhook_subscriptions WHERE id = $1', [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: 'Not found' });
    const sub = cur.rows[0];
    const event_type = (req.body && req.body.event_type) || 'execution.completed';
    const payload = JSON.stringify({
      test: true,
      event_type,
      sample: req.body?.sample || { id: 1, status: 'success' },
      ts: new Date().toISOString()
    });
    const duration_ms = 25 + Math.floor(Math.random() * 75);
    const status_code = 202;
    const ins = await db.query(
      `INSERT INTO webhook_deliveries
         (subscription_id, event_type, payload, status_code, response_preview, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [sub.id, event_type, payload, status_code, 'Accepted (simulated)', duration_ms]
    );
    await db.query(
      `UPDATE webhook_subscriptions
         SET delivery_count = delivery_count + 1,
             last_delivery_at = NOW(),
             last_status_code = $1
       WHERE id = $2`,
      [status_code, sub.id]
    );
    res.status(202).json({ delivery: ins.rows[0], simulated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/deliveries', auth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const r = await db.query(
      'SELECT * FROM webhook_deliveries WHERE subscription_id = $1 ORDER BY delivered_at DESC LIMIT $2',
      [req.params.id, limit]
    );
    res.json({ count: r.rows.length, deliveries: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
