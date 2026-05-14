const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

const ALLOWED_TABLES = {
  services: ['id','name','description','version','category','endpoint_url','auth_type','status','uptime_pct','monthly_calls','avg_latency_ms','created_at','last_updated'],
  tools: ['id','service_id','name','description','call_count','success_rate','avg_latency_ms'],
  integrations: ['id','service_id','user_id','api_key_preview','connected_at','last_used','calls_this_month','calls_this_week','status','plan'],
  executions: ['id','tool_id','user_id','status','duration_ms','created_at','tokens_used','cost_usd'],
  documentation: ['id','service_id','section','title','last_updated','views'],
  usage_metrics: ['id','service_id','metric_date','total_calls','success_calls','failed_calls','avg_latency_ms','p99_latency_ms','unique_users'],
  audit_log: ['id','user_id','user_email','action','entity','entity_id','details','created_at']
};

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function writeAudit(req, action, entity, entity_id, details) {
  try {
    await db.query(
      'INSERT INTO audit_log (user_id, user_email, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user?.id || null, req.user?.email || null, action, entity || null, entity_id || null, details || null]
    );
  } catch (_) { /* swallow audit failures */ }
}

// ===== 1) CSV export =====
router.get('/export/:entity', auth, async (req, res) => {
  try {
    const entity = req.params.entity;
    const cols = ALLOWED_TABLES[entity];
    if (!cols) return res.status(400).json({ error: 'Unknown entity' });
    const result = await db.query(`SELECT ${cols.join(', ')} FROM ${entity} ORDER BY id`);
    const header = cols.join(',');
    const body = result.rows.map(r => cols.map(c => csvEscape(r[c])).join(',')).join('\n');
    const csv = header + '\n' + body + '\n';
    await writeAudit(req, 'export_csv', entity, null, `rows=${result.rows.length}`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 2) Search + filter =====
router.get('/search', auth, async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const entity = (req.query.entity || 'all').toString();
    const status = (req.query.status || '').toString();
    const category = (req.query.category || '').toString();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    if (!q && !status && !category) return res.json({ q, entity, results: [] });
    const like = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;
    const out = [];

    if (entity === 'all' || entity === 'services') {
      const params = [like];
      let where = `(name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)`;
      if (status) { params.push(status); where += ` AND status = $${params.length}`; }
      if (category) { params.push(category); where += ` AND category = $${params.length}`; }
      params.push(limit);
      const r = await db.query(`SELECT id, name, description, category, status FROM services WHERE ${where} ORDER BY monthly_calls DESC LIMIT $${params.length}`, params);
      r.rows.forEach(row => out.push({ entity: 'services', ...row }));
    }
    if (entity === 'all' || entity === 'tools') {
      const params = [like];
      let where = `(t.name ILIKE $1 OR t.description ILIKE $1)`;
      if (status) { params.push(status); where += ` AND s.status = $${params.length}`; }
      if (category) { params.push(category); where += ` AND s.category = $${params.length}`; }
      params.push(limit);
      const r = await db.query(`SELECT t.id, t.name, t.description, s.name AS service_name, s.category FROM tools t JOIN services s ON t.service_id = s.id WHERE ${where} ORDER BY t.call_count DESC LIMIT $${params.length}`, params);
      r.rows.forEach(row => out.push({ entity: 'tools', ...row }));
    }
    if (entity === 'all' || entity === 'integrations') {
      const params = [like];
      let where = `(s.name ILIKE $1 OR i.plan ILIKE $1)`;
      if (status) { params.push(status); where += ` AND i.status = $${params.length}`; }
      params.push(limit);
      const r = await db.query(`SELECT i.id, s.name AS service_name, i.status, i.plan, i.calls_this_month FROM integrations i JOIN services s ON i.service_id = s.id WHERE ${where} ORDER BY i.calls_this_month DESC LIMIT $${params.length}`, params);
      r.rows.forEach(row => out.push({ entity: 'integrations', ...row }));
    }
    if (entity === 'all' || entity === 'executions') {
      const params = [like];
      let where = `(t.name ILIKE $1 OR e.input_params ILIKE $1 OR e.output_preview ILIKE $1)`;
      if (status) { params.push(status); where += ` AND e.status = $${params.length}`; }
      params.push(limit);
      const r = await db.query(`SELECT e.id, t.name AS tool_name, e.status, e.duration_ms, e.created_at FROM executions e JOIN tools t ON e.tool_id = t.id WHERE ${where} ORDER BY e.created_at DESC LIMIT $${params.length}`, params);
      r.rows.forEach(row => out.push({ entity: 'executions', ...row }));
    }

    await writeAudit(req, 'search', entity, null, `q="${q}" status="${status}" category="${category}" hits=${out.length}`);
    res.json({ q, entity, status, category, count: out.length, results: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 3) Audit log =====
router.get('/audit', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const action = (req.query.action || '').toString();
    const entity = (req.query.entity || '').toString();
    const params = [];
    let where = '1=1';
    if (action) { params.push(action); where += ` AND action = $${params.length}`; }
    if (entity) { params.push(entity); where += ` AND entity = $${params.length}`; }
    params.push(limit);
    const result = await db.query(
      `SELECT * FROM audit_log WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audit', auth, async (req, res) => {
  try {
    const { action, entity, entity_id, details } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    const result = await db.query(
      'INSERT INTO audit_log (user_id, user_email, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, req.user.email || null, action, entity || null, entity_id || null, details || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
