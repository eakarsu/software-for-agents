function failure(status, code, message) { return Object.assign(new Error(message), { status, code }); }
function requestScope(req, res) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => { if (!res.writableEnded) abort(); };
  req.once('aborted', abort); res.once('close', close);
  if (req.aborted || res.destroyed) abort();
  return { signal: controller.signal, dispose() { req.off('aborted', abort); res.off('close', close); } };
}
async function providerAdvice(prompt, system, title, maxTokens, signal) {
  const base = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim(), model = String(process.env.OPENROUTER_MODEL || '').trim();
  if (base !== 'https://openrouter.ai/api/v1' || !apiKey || !model) throw failure(503, 'AI_NOT_CONFIGURED', 'Canonical OpenRouter configuration is required.');
  signal.throwIfAborted();
  try {
    const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': title }, body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }), signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]) });
    const payload = await response.json(); signal.throwIfAborted();
    const choice = payload?.choices?.[0], content = typeof choice?.message?.content === 'string' ? choice.message.content.trim() : '';
    if (!response.ok || payload?.error || typeof payload?.id !== 'string' || !payload.id.trim() || typeof payload?.model !== 'string' || !payload.model.trim() || !content || choice?.finish_reason !== 'stop' || choice.message.refusal) throw failure(502, 'AI_PROVIDER_INVALID', 'OpenRouter did not return a complete advisory report and receipt.');
    return { content, receipt: { id: payload.id, model: payload.model, usage: payload.usage || null, provider: 'openrouter' } };
  } catch (error) { if (signal.aborted) throw error; if (error.status) throw error; throw failure(502, 'AI_PROVIDER_FAILED', 'OpenRouter could not complete the advisory report.'); }
}
async function freshUser(connection, actorId) {
  const current = (await connection.query('SELECT id FROM users WHERE id=$1', [actorId])).rows[0];
  if (!current) throw failure(401, 'IDENTITY_INACTIVE', 'The authenticated account is no longer available.');
}
async function saveReceipt(pool, signal, actorId, insert) {
  signal.throwIfAborted(); const transaction = await pool.connect();
  try { await transaction.query('BEGIN'); signal.throwIfAborted(); await freshUser(transaction, actorId); const row = await insert(transaction); signal.throwIfAborted(); await freshUser(transaction, actorId); signal.throwIfAborted(); await transaction.query('COMMIT'); return row; }
  catch (error) { await transaction.query('ROLLBACK'); throw error; }
  finally { transaction.release(); }
}
module.exports = { failure, requestScope, providerAdvice, freshUser, saveReceipt };
