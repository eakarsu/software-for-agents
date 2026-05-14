const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

// TODO: configure credentials (OPENROUTER_API_KEY) in .env
// Feature: Agent Onboarding / Trial (cf) — auto-scaffolded from audit gap.
// Project: software-for-agents

router.use(verifyToken);

async function ensureTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      feature_slug TEXT NOT NULL,
      user_id INTEGER,
      input JSONB,
      output TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
  } catch (e) { /* swallow */ }
}

async function callAI(userPrompt, systemPrompt = '') {
  if (!process.env.OPENROUTER_API_KEY) return 'AI unavailable (no API key configured).';
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'Agent Onboarding / Trial'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt }
        ]
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || 'AI unavailable';
  } catch (e) {
    return `AI error: ${e.message}`;
  }
}

router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const body = req.body || {};
    const systemPrompt = `You are an expert assistant for the "Agent Onboarding / Trial" feature in the software-for-agents platform. Provide actionable, specific, structured output.`;
    const userPrompt = `Feature: Agent Onboarding / Trial
Kind: cf
Context:
${JSON.stringify(body, null, 2)}

Please produce:
1. Summary of what this feature should do given the input.
2. Specific recommendations or computed outputs (3-7 bullets).
3. Suggested next steps or data the operator should collect.
4. Risk / caveat callouts.`;
    const result = await callAI(userPrompt, systemPrompt);
    try {
      await pool.query(
        'INSERT INTO gap_features (feature_slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
        ['agent-onboarding', req.user?.id || null, body, result]
      );
    } catch (e) { /* persistence optional */ }
    res.json({ feature: 'Agent Onboarding / Trial', kind: 'cf', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    await ensureTable();
    const r = await pool.query(
      'SELECT id, input, output, created_at FROM gap_features WHERE feature_slug=$1 ORDER BY created_at DESC LIMIT 25',
      ['agent-onboarding']
    );
    res.json({ history: r.rows });
  } catch (err) {
    res.json({ history: [] });
  }
});

module.exports = router;
