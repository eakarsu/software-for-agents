const express = require('express');
const auth = require('../middleware/auth');

function createRuntimeAiRouter(pool) {
  const router = express.Router();
  router.post('/agent-readiness', auth, async (req, res) => {
    try {
      const base = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
      if (base !== 'https://openrouter.ai/api/v1') return res.status(503).json({ error: 'OpenRouter base URL is not canonical', error_code: 'AI_NOT_CONFIGURED' });
      if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) return res.status(503).json({ error: 'OpenRouter credentials are missing', error_code: 'AI_NOT_CONFIGURED' });
      const prompt = String(req.body?.prompt || 'Assess whether this agent service is ready for a controlled production workflow.');
      const provider = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'content-type': 'application/json', 'x-title': 'Software for Agents Runtime' },
        body: JSON.stringify({ model: process.env.OPENROUTER_MODEL, max_tokens: 220, messages: [
          { role: 'system', content: 'You are an agent platform reliability reviewer. Respond concisely with a finding and next action.' },
          { role: 'user', content: prompt }
        ] })
      });
      const data = await provider.json();
      if (!provider.ok || data.error) return res.status(502).json({ error: data.error?.message || `Provider status ${provider.status}`, error_code: 'AI_PROVIDER_FAILED' });
      const content = data.choices?.[0]?.message?.content;
      if (!data.id || !content) return res.status(502).json({ error: 'Provider response lacked content or receipt', error_code: 'AI_PROVIDER_INVALID' });
      const providerReceipt = { id: data.id, model: data.model || process.env.OPENROUTER_MODEL, usage: data.usage || null };
      const saved = await pool.query(
        `INSERT INTO runtime_ai_results (user_id, feature, prompt, response, provider_id, model)
         VALUES ($1, 'agent-readiness', $2::jsonb, $3::jsonb, $4, $5) RETURNING id`,
        [req.user.id, JSON.stringify({ prompt }), JSON.stringify({ content, providerReceipt }), data.id, providerReceipt.model]
      );
      return res.json({ content, providerReceipt, recordId: saved.rows[0].id });
    } catch (error) {
      return res.status(500).json({ error: 'AI readiness check failed', error_code: 'AI_RUNTIME_FAILED', detail: error.message });
    }
  });
  return router;
}

module.exports = { createRuntimeAiRouter };
