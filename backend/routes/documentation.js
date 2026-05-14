const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT d.*, s.name as service_name FROM documentation d JOIN services s ON d.service_id = s.id ORDER BY d.service_id, d.section');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT d.*, s.name as service_name FROM documentation d JOIN services s ON d.service_id = s.id WHERE d.id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    await db.query('UPDATE documentation SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { service_id, section, title, content, code_examples } = req.body;
    const result = await db.query(
      'INSERT INTO documentation (service_id, section, title, content, code_examples, last_updated) VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *',
      [service_id, section, title, content, code_examples]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { service_id, section, title, content, code_examples } = req.body;
    const result = await db.query(
      'UPDATE documentation SET service_id=$1, section=$2, title=$3, content=$4, code_examples=$5, last_updated=NOW() WHERE id=$6 RETURNING *',
      [service_id, section, title, content, code_examples, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM documentation WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
