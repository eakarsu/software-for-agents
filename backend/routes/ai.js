const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

async function callAI(userPrompt, systemPrompt = '') {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      const err = new Error('AI service unavailable: OPENROUTER_API_KEY not configured');
      err.statusCode = 503;
      throw err;
    }
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'AgentHub'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt }
        ]
      })
    });
    if (!r.ok) {
      const err = new Error(`AI upstream returned ${r.status}`);
      err.statusCode = 503;
      throw err;
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('AI service unavailable: empty response');
      err.statusCode = 503;
      throw err;
    }
    return content;
  } catch (e) {
    if (e.statusCode) throw e;
    const err = new Error(`AI service unavailable: ${e.message}`);
    err.statusCode = 503;
    throw err;
  }
}

function aiHandler(res, e) {
  const code = e.statusCode || 500;
  res.status(code).json({ error: e.message });
}

router.post('/discover-services', auth, async (req, res) => {
  try {
    const { task_description } = req.body;
    const servicesResult = await db.query('SELECT name, description, category, status FROM services WHERE status != $1 ORDER BY monthly_calls DESC LIMIT 20', ['deprecated']);
    const services = servicesResult.rows;
    const prompt = `Task: ${task_description}\n\nAvailable services:\n${services.map(s => `- ${s.name} (${s.category}): ${s.description}`).join('\n')}\n\nRecommend the best services and tools for this task. Explain why each is relevant, how to combine them, and provide a step-by-step workflow.`;
    const result = await callAI(prompt, 'You are an AI agent orchestration expert. Help users discover and combine services to accomplish their tasks effectively.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-docs', auth, async (req, res) => {
  try {
    const { service_id, tool_name } = req.body;
    const serviceResult = await db.query('SELECT * FROM services WHERE id = $1', [service_id]);
    const service = serviceResult.rows[0];
    const toolResult = await db.query('SELECT * FROM tools WHERE service_id = $1 AND name = $2', [service_id, tool_name]);
    const tool = toolResult.rows[0];
    const prompt = `Generate comprehensive documentation for:\nService: ${service?.name || 'Unknown'}\nTool: ${tool_name}\nDescription: ${tool?.description || 'N/A'}\nInput Schema: ${tool?.input_schema || 'N/A'}\nOutput Schema: ${tool?.output_schema || 'N/A'}\nExample Input: ${tool?.example_input || 'N/A'}\n\nProvide: overview, authentication, parameters table, response format, code examples in Python and JavaScript, error codes, and best practices.`;
    const result = await callAI(prompt, 'You are a technical writer specializing in API documentation. Write clear, comprehensive, developer-friendly documentation.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debug-execution', auth, async (req, res) => {
  try {
    const { execution_id, error } = req.body;
    let executionData = {};
    if (execution_id) {
      const execResult = await db.query('SELECT e.*, t.name as tool_name, t.input_schema FROM executions e JOIN tools t ON e.tool_id = t.id WHERE e.id = $1', [execution_id]);
      executionData = execResult.rows[0] || {};
    }
    const prompt = `Debug this execution failure:\nTool: ${executionData.tool_name || 'Unknown'}\nInput: ${executionData.input_params || 'N/A'}\nError: ${error || executionData.output_preview || 'Unknown error'}\nStatus: ${executionData.status || 'failed'}\nDuration: ${executionData.duration_ms || 0}ms\n\nProvide: root cause analysis, likely fix, corrected input example, and prevention strategies.`;
    const result = await callAI(prompt, 'You are a debugging expert for AI agent tool executions. Analyze failures and provide actionable fixes.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/integration-guide', auth, async (req, res) => {
  try {
    const { service_name, use_case, language } = req.body;
    const serviceResult = await db.query('SELECT * FROM services WHERE name ILIKE $1', [`%${service_name}%`]);
    const service = serviceResult.rows[0];
    const prompt = `Generate an integration guide for:\nService: ${service_name}\nAuth Type: ${service?.auth_type || 'api_key'}\nEndpoint: ${service?.endpoint_url || 'https://api.example.com'}\nUse Case: ${use_case}\nLanguage: ${language}\n\nProvide: setup steps, authentication code, complete working example for the use case, error handling, and tips for the use case.`;
    const result = await callAI(prompt, 'You are an integration engineer. Generate complete, working code examples with proper error handling and best practices.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== New AI features (apply3) =====

// 1) Tool recommendation for a goal
router.post('/recommend-tools', auth, async (req, res) => {
  try {
    const { goal, max_results } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal is required' });
    const limit = Math.min(Number(max_results) || 30, 60);
    const toolsResult = await db.query(
      `SELECT t.id, t.name, t.description, t.success_rate, t.avg_latency_ms, s.name AS service_name, s.category, s.status
         FROM tools t JOIN services s ON t.service_id = s.id
        WHERE s.status != 'deprecated'
        ORDER BY t.call_count DESC
        LIMIT $1`,
      [limit]
    );
    const tools = toolsResult.rows;
    const prompt = `Goal: ${goal}\n\nAvailable tools:\n${tools.map(t => `- [${t.id}] ${t.service_name}::${t.name} (${t.category}) — ${t.description || ''} (success ${t.success_rate}%, ${t.avg_latency_ms}ms)`).join('\n')}\n\nRecommend the top 3-5 tools for this goal. For each: explain why, the order to call them, sample input fields, and what risks to watch.`;
    const result = await callAI(prompt, 'You are an AI agent tool selection expert. Recommend the most relevant tools and explain how to chain them.');
    res.json({ result, candidates: tools.length });
  } catch (e) { aiHandler(res, e); }
});

// 2) Integration health scorer
router.post('/integration-health', auth, async (req, res) => {
  try {
    const { integration_id } = req.body;
    if (!integration_id) return res.status(400).json({ error: 'integration_id is required' });
    const ir = await db.query(
      `SELECT i.*, s.name AS service_name, s.uptime_pct, s.status AS service_status, s.avg_latency_ms AS service_latency
         FROM integrations i JOIN services s ON i.service_id = s.id WHERE i.id = $1`,
      [integration_id]
    );
    const integration = ir.rows[0];
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    const er = await db.query(
      `SELECT status, COUNT(*)::int AS c, COALESCE(AVG(duration_ms),0)::int AS avg_ms
         FROM executions e JOIN tools t ON e.tool_id = t.id
        WHERE t.service_id = $1 AND e.created_at > NOW() - INTERVAL '30 days'
        GROUP BY status`,
      [integration.service_id]
    );
    const stats = er.rows;
    const prompt = `Integration health for "${integration.service_name}":\nStatus: ${integration.status}, plan: ${integration.plan}\nLast used: ${integration.last_used}\nCalls (week/month): ${integration.calls_this_week}/${integration.calls_this_month}\nService uptime: ${integration.uptime_pct}% (status ${integration.service_status})\nService latency: ${integration.service_latency}ms\nRecent execution stats (30d): ${JSON.stringify(stats)}\n\nProduce: an overall health score 0-100, sub-scores (reliability, freshness, performance, cost-efficiency), top 3 risks, and concrete fixes.`;
    const result = await callAI(prompt, 'You are an SRE for AI integrations. Quantify health and recommend remediations.');
    res.json({ result, integration_id, service: integration.service_name });
  } catch (e) { aiHandler(res, e); }
});

// 3) Capability gap finder
router.post('/capability-gap', auth, async (req, res) => {
  try {
    const { workflow_description } = req.body;
    if (!workflow_description) return res.status(400).json({ error: 'workflow_description is required' });
    const sr = await db.query(`SELECT name, category, description FROM services WHERE status != 'deprecated' ORDER BY category`);
    const tr = await db.query(`SELECT name, description FROM tools ORDER BY call_count DESC LIMIT 80`);
    const prompt = `Desired workflow: ${workflow_description}\n\nCurrent services in the registry:\n${sr.rows.map(s => `- ${s.name} (${s.category}): ${s.description || ''}`).join('\n')}\n\nMost-used tools:\n${tr.rows.map(t => `- ${t.name}: ${t.description || ''}`).join('\n')}\n\nIdentify capability gaps: which steps of the workflow have no good service/tool? List each gap as: step, missing capability, suggested new tool/service spec, suggested category.`;
    const result = await callAI(prompt, 'You are a product strategist for an AI agent platform. Find missing capabilities and propose concrete additions.');
    res.json({ result, services_considered: sr.rows.length });
  } catch (e) { aiHandler(res, e); }
});

// 4) Agent prompt critic
router.post('/critique-prompt', auth, async (req, res) => {
  try {
    const { prompt_text, target_use } = req.body;
    if (!prompt_text) return res.status(400).json({ error: 'prompt_text is required' });
    const prompt = `Critique the following agent prompt for use case "${target_use || 'general AI agent'}":\n\n---\n${prompt_text}\n---\n\nReturn: clarity score 0-10, role specificity 0-10, tool-use guidance 0-10, safety 0-10. Then list specific issues, then a rewritten improved version of the prompt.`;
    const result = await callAI(prompt, 'You are a senior prompt engineer. Provide rigorous, actionable critique.');
    res.json({ result });
  } catch (e) { aiHandler(res, e); }
});

// 5) NL -> tool-call generator
router.post('/nl-to-toolcall', auth, async (req, res) => {
  try {
    const { instruction } = req.body;
    if (!instruction) return res.status(400).json({ error: 'instruction is required' });
    const tr = await db.query(
      `SELECT t.name, t.description, t.input_schema, t.example_input, s.name AS service_name
         FROM tools t JOIN services s ON t.service_id = s.id
        WHERE s.status != 'deprecated'
        ORDER BY t.call_count DESC LIMIT 40`
    );
    const prompt = `Convert this natural-language instruction into a concrete tool call (JSON).\n\nInstruction: ${instruction}\n\nAvailable tools:\n${tr.rows.map(t => `- ${t.service_name}::${t.name} — ${t.description || ''}\n    schema: ${t.input_schema || '{}'}\n    example: ${t.example_input || '{}'}`).join('\n')}\n\nReturn ONLY a JSON object: {"tool": "service::name", "arguments": {...}, "rationale": "..."}. If no tool matches, return {"tool": null, "rationale": "..."}.`;
    const result = await callAI(prompt, 'You are a tool-call planner. Output strict JSON.');
    res.json({ result });
  } catch (e) { aiHandler(res, e); }
});

module.exports = router;
