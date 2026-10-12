const express = require('express');
const auth = require('../middleware/auth');
const { failure, requestScope, providerAdvice, freshUser, saveReceipt } = require('../lib/runtime-advisory');

function createRuntimeAiRouter(pool) {
  const router = express.Router();
  router.get('/agent-readiness', auth, async (req, res) => {
    try { await freshUser(pool, req.user.id); const rows = (await pool.query(`SELECT id,prompt,response,model,created_at FROM runtime_ai_results WHERE user_id=$1 AND feature='agent-readiness' ORDER BY created_at DESC,id DESC LIMIT 50`, [req.user.id])).rows;
      res.json({ reports: rows.map(row => ({ id: String(row.id), prompt: row.prompt.prompt, content: row.response.content, model: row.model, createdAt: row.created_at })) });
    } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Saved readiness reports could not be loaded.', error_code: error.code || 'AI_HISTORY_FAILED' }); }
  });
  router.post('/agent-readiness', auth, async (req, res) => {
    const scope = requestScope(req, res);
    try {
      const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
      if (!prompt || prompt.length > 4000) throw failure(400, 'INVALID_PROMPT', 'Prompt must contain 1–4000 characters.');
      await freshUser(pool, req.user.id); scope.signal.throwIfAborted();
      const evidence = await providerAdvice(prompt, 'You are an agent platform reliability reviewer. Respond concisely with a finding and next action. Use only the supplied brief, flag missing evidence and never authorize an operational action.', 'Software for Agents Runtime', 220, scope.signal);
      const saved = await saveReceipt(pool, scope.signal, req.user.id, async transaction => (await transaction.query(`INSERT INTO runtime_ai_results(user_id,feature,prompt,response,provider_id,model) VALUES($1,'agent-readiness',$2::jsonb,$3::jsonb,$4,$5) RETURNING id,created_at`, [req.user.id, JSON.stringify({ prompt }), JSON.stringify({ content: evidence.content, providerReceipt: evidence.receipt }), evidence.receipt.id, evidence.receipt.model])).rows[0]);
      scope.signal.throwIfAborted(); res.json({ id: String(saved.id), recordId: saved.id, content: evidence.content, model: evidence.receipt.model, providerReceipt: evidence.receipt, createdAt: saved.created_at });
    } catch (error) { if (scope.signal.aborted || res.destroyed) return; res.status(error.status || 502).json({ error: error.status ? error.message : 'AI readiness check could not complete.', error_code: error.code || 'AI_RUNTIME_FAILED' }); }
    finally { scope.dispose(); }
  });
  return router;
}
module.exports = { createRuntimeAiRouter };
