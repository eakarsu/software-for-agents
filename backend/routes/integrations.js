const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT i.*, s.name as service_name FROM integrations i JOIN services s ON i.service_id = s.id ORDER BY i.connected_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT i.*, s.name as service_name FROM integrations i JOIN services s ON i.service_id = s.id WHERE i.id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { service_id, api_key_preview, status, plan, calls_this_month, calls_this_week } = req.body;
    const result = await db.query(
      'INSERT INTO integrations (service_id, user_id, api_key_preview, status, plan, calls_this_month, calls_this_week) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [service_id, req.user.id, api_key_preview, status || 'active', plan || 'free', calls_this_month || 0, calls_this_week || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { service_id, api_key_preview, status, plan, calls_this_month, calls_this_week } = req.body;
    const result = await db.query(
      'UPDATE integrations SET service_id=$1, api_key_preview=$2, status=$3, plan=$4, calls_this_month=$5, calls_this_week=$6 WHERE id=$7 RETURNING *',
      [service_id, api_key_preview, status, plan, calls_this_month, calls_this_week, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM integrations WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
