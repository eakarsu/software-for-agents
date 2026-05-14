const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT e.*, t.name as tool_name FROM executions e JOIN tools t ON e.tool_id = t.id ORDER BY e.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT e.*, t.name as tool_name FROM executions e JOIN tools t ON e.tool_id = t.id WHERE e.id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { tool_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd } = req.body;
    const result = await db.query(
      'INSERT INTO executions (tool_id, user_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [tool_id, req.user.id, input_params, output_preview, status || 'success', duration_ms || 0, tokens_used || 0, cost_usd || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { tool_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd } = req.body;
    const result = await db.query(
      'UPDATE executions SET tool_id=$1, input_params=$2, output_preview=$3, status=$4, duration_ms=$5, tokens_used=$6, cost_usd=$7 WHERE id=$8 RETURNING *',
      [tool_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM executions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
