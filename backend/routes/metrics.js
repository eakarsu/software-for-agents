const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT m.*, s.name as service_name FROM usage_metrics m JOIN services s ON m.service_id = s.id ORDER BY m.metric_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT m.*, s.name as service_name FROM usage_metrics m JOIN services s ON m.service_id = s.id WHERE m.id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users } = req.body;
    const result = await db.query(
      'INSERT INTO usage_metrics (service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [service_id, metric_date, total_calls || 0, success_calls || 0, failed_calls || 0, avg_latency_ms, p99_latency_ms, unique_users || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users } = req.body;
    const result = await db.query(
      'UPDATE usage_metrics SET service_id=$1, metric_date=$2, total_calls=$3, success_calls=$4, failed_calls=$5, avg_latency_ms=$6, p99_latency_ms=$7, unique_users=$8 WHERE id=$9 RETURNING *',
      [service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM usage_metrics WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
