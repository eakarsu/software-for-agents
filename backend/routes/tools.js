const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT t.*, s.name as service_name FROM tools t JOIN services s ON t.service_id = s.id ORDER BY t.name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT t.*, s.name as service_name FROM tools t JOIN services s ON t.service_id = s.id WHERE t.id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { service_id, name, description, input_schema, output_schema, example_input, example_output } = req.body;
    const result = await db.query(
      'INSERT INTO tools (service_id, name, description, input_schema, output_schema, example_input, example_output) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [service_id, name, description, input_schema, output_schema, example_input, example_output]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { service_id, name, description, input_schema, output_schema, example_input, example_output } = req.body;
    const result = await db.query(
      'UPDATE tools SET service_id=$1, name=$2, description=$3, input_schema=$4, output_schema=$5, example_input=$6, example_output=$7 WHERE id=$8 RETURNING *',
      [service_id, name, description, input_schema, output_schema, example_input, example_output, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM tools WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
