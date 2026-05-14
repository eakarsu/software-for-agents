const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM services ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms } = req.body;
    const result = await db.query(
      'INSERT INTO services (name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, description, version, category, endpoint_url, auth_type, status || 'active', uptime_pct || 99.9, monthly_calls || 0, avg_latency_ms || 100]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms } = req.body;
    const result = await db.query(
      'UPDATE services SET name=$1, description=$2, version=$3, category=$4, endpoint_url=$5, auth_type=$6, status=$7, uptime_pct=$8, monthly_calls=$9, avg_latency_ms=$10, last_updated=NOW() WHERE id=$11 RETURNING *',
      [name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
