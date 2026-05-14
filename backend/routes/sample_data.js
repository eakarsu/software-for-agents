const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Sample data inserter — domain-realistic agent-software seeds.
// All endpoints require JWT (mounted under /api/admin in server.js).

const VALID_ENTITIES = ['services', 'tools', 'integrations', 'executions', 'documentation', 'usage_metrics'];

// --- realistic data generators ------------------------------------------------

function servicesRows() {
  return [
    { name: 'Stripe Payments', description: 'Charge cards, manage subscriptions, and issue refunds via Stripe API', version: '2024-11-20', category: 'integration', endpoint_url: 'https://api.stripe.com/v1', auth_type: 'api_key', status: 'active', uptime_pct: 99.99, monthly_calls: 12500000, avg_latency_ms: 140 },
    { name: 'Slack Messaging', description: 'Post messages, react to events, and manage channels in Slack workspaces', version: '1.7.0', category: 'communication', endpoint_url: 'https://slack.com/api', auth_type: 'oauth2', status: 'active', uptime_pct: 99.95, monthly_calls: 6800000, avg_latency_ms: 110 },
    { name: 'GitHub Repos', description: 'Read repos, open PRs, manage issues, and trigger workflows on GitHub', version: '2024-09-01', category: 'integration', endpoint_url: 'https://api.github.com', auth_type: 'oauth2', status: 'active', uptime_pct: 99.97, monthly_calls: 9400000, avg_latency_ms: 165 },
    { name: 'Twilio SMS', description: 'Send SMS, MMS, and WhatsApp messages with delivery tracking', version: '2010-04-01', category: 'communication', endpoint_url: 'https://api.twilio.com/2010-04-01', auth_type: 'api_key', status: 'active', uptime_pct: 99.9, monthly_calls: 4200000, avg_latency_ms: 220 },
    { name: 'Notion Workspace', description: 'Read and update Notion pages, databases, and blocks', version: '2022-06-28', category: 'productivity', endpoint_url: 'https://api.notion.com/v1', auth_type: 'oauth2', status: 'active', uptime_pct: 99.8, monthly_calls: 1800000, avg_latency_ms: 310 },
    { name: 'AWS S3 Storage', description: 'Upload, download, and manage objects across S3 buckets', version: '2006-03-01', category: 'storage', endpoint_url: 'https://s3.amazonaws.com', auth_type: 'jwt', status: 'active', uptime_pct: 99.99, monthly_calls: 21000000, avg_latency_ms: 85 },
    { name: 'OpenAI Embeddings', description: 'Generate dense vector embeddings for semantic search and clustering', version: 'v1', category: 'compute', endpoint_url: 'https://api.openai.com/v1/embeddings', auth_type: 'api_key', status: 'active', uptime_pct: 99.92, monthly_calls: 18500000, avg_latency_ms: 240 },
    { name: 'HubSpot CRM', description: 'Read and write contacts, deals, and companies in HubSpot CRM', version: 'v3', category: 'integration', endpoint_url: 'https://api.hubapi.com', auth_type: 'oauth2', status: 'beta', uptime_pct: 99.4, monthly_calls: 720000, avg_latency_ms: 410 },
  ];
}

function toolsRows(serviceIds) {
  // Map by index — pick whichever services exist; default to first.
  const pick = (i) => serviceIds[i % serviceIds.length] || null;
  return [
    { service_id: pick(0), name: 'create_charge',    description: 'Create a Stripe charge in the smallest currency unit',
      input_schema: '{"amount":"integer","currency":"string","customer_id":"string"}', output_schema: '{"charge_id":"string","status":"string"}',
      example_input: '{"amount":2500,"currency":"usd","customer_id":"cus_abc"}', example_output: '{"charge_id":"ch_3OabcEFG","status":"succeeded"}',
      call_count: 540000, success_rate: 99.6, avg_latency_ms: 140 },
    { service_id: pick(1), name: 'post_message',     description: 'Post a message to a Slack channel as the bot user',
      input_schema: '{"channel":"string","text":"string","blocks":"array"}', output_schema: '{"ts":"string","ok":"boolean"}',
      example_input: '{"channel":"#general","text":"Build passed"}', example_output: '{"ts":"1715000000.000100","ok":true}',
      call_count: 1100000, success_rate: 99.8, avg_latency_ms: 110 },
    { service_id: pick(2), name: 'open_pull_request', description: 'Open a pull request between two branches on a GitHub repo',
      input_schema: '{"owner":"string","repo":"string","head":"string","base":"string","title":"string","body":"string"}', output_schema: '{"number":"integer","html_url":"string"}',
      example_input: '{"owner":"acme","repo":"web","head":"feat/login","base":"main","title":"Add login"}', example_output: '{"number":482,"html_url":"https://github.com/acme/web/pull/482"}',
      call_count: 95000, success_rate: 99.1, avg_latency_ms: 240 },
    { service_id: pick(3), name: 'send_sms',         description: 'Send an SMS message via Twilio with delivery callback',
      input_schema: '{"to":"string","from":"string","body":"string"}', output_schema: '{"sid":"string","status":"string"}',
      example_input: '{"to":"+15551234567","from":"+15557654321","body":"Your code is 4821"}', example_output: '{"sid":"SM1234abcd","status":"queued"}',
      call_count: 320000, success_rate: 99.4, avg_latency_ms: 220 },
    { service_id: pick(0), name: 'list_subscriptions', description: 'List a customer\'s active Stripe subscriptions',
      input_schema: '{"customer_id":"string","status":"string"}', output_schema: '{"data":"array","has_more":"boolean"}',
      example_input: '{"customer_id":"cus_abc","status":"active"}', example_output: '{"data":[{"id":"sub_1","status":"active"}],"has_more":false}',
      call_count: 210000, success_rate: 99.9, avg_latency_ms: 130 },
    { service_id: pick(2), name: 'list_issues',      description: 'List issues for a GitHub repository filtered by state and labels',
      input_schema: '{"owner":"string","repo":"string","state":"string","labels":"string"}', output_schema: '{"issues":"array"}',
      example_input: '{"owner":"acme","repo":"web","state":"open","labels":"bug"}', example_output: '{"issues":[{"number":12,"title":"Login fails on Safari"}]}',
      call_count: 180000, success_rate: 99.7, avg_latency_ms: 200 },
    { service_id: pick(4), name: 'query_database',   description: 'Query a Notion database with filters and sorts',
      input_schema: '{"database_id":"string","filter":"object","sorts":"array"}', output_schema: '{"results":"array","next_cursor":"string"}',
      example_input: '{"database_id":"a1b2c3","filter":{"property":"Status","status":{"equals":"Done"}}}', example_output: '{"results":[{"id":"page_1"}],"next_cursor":null}',
      call_count: 88000, success_rate: 99.3, avg_latency_ms: 380 },
    { service_id: pick(5), name: 'put_object',       description: 'Upload an object to an S3 bucket with optional metadata',
      input_schema: '{"bucket":"string","key":"string","body":"string","content_type":"string"}', output_schema: '{"etag":"string","version_id":"string"}',
      example_input: '{"bucket":"reports","key":"2025/q1.pdf","content_type":"application/pdf"}', example_output: '{"etag":"\\"abc123\\"","version_id":"v.42"}',
      call_count: 1450000, success_rate: 99.95, avg_latency_ms: 95 },
    { service_id: pick(6), name: 'embed_text',       description: 'Embed input text into a 1536-dim vector for retrieval',
      input_schema: '{"input":"string|array","model":"string"}', output_schema: '{"data":"array","usage":"object"}',
      example_input: '{"input":"agent orchestration patterns","model":"text-embedding-3-small"}', example_output: '{"data":[{"embedding":[0.012,-0.034]}],"usage":{"total_tokens":4}}',
      call_count: 2100000, success_rate: 99.8, avg_latency_ms: 240 },
  ];
}

function integrationsRows(serviceIds, userId) {
  const now = 'NOW()';
  return [
    { service_id: serviceIds[0], user_id: userId, api_key_preview: 'sk_live_****a91f', last_used_offset: '15 minutes', calls_this_month: 84200, calls_this_week: 18100, status: 'active',  plan: 'enterprise' },
    { service_id: serviceIds[1] || serviceIds[0], user_id: userId, api_key_preview: 'xoxb-****-c8d2', last_used_offset: '2 hours',    calls_this_month: 41200, calls_this_week: 9100,  status: 'active',  plan: 'pro' },
    { service_id: serviceIds[2] || serviceIds[0], user_id: userId, api_key_preview: 'ghp_****k7n3',   last_used_offset: '45 minutes', calls_this_month: 26800, calls_this_week: 5400,  status: 'active',  plan: 'pro' },
    { service_id: serviceIds[3] || serviceIds[0], user_id: userId, api_key_preview: 'AC****b9f1',     last_used_offset: '6 hours',    calls_this_month: 12400, calls_this_week: 2800,  status: 'active',  plan: 'basic' },
    { service_id: serviceIds[4] || serviceIds[0], user_id: userId, api_key_preview: 'secret_****2x8m',last_used_offset: '1 day',      calls_this_month: 8900,  calls_this_week: 1700,  status: 'active',  plan: 'pro' },
    { service_id: serviceIds[5] || serviceIds[0], user_id: userId, api_key_preview: 'AKIA****HQRP',   last_used_offset: '5 minutes',  calls_this_month: 320000,calls_this_week: 71000, status: 'active',  plan: 'enterprise' },
    { service_id: serviceIds[6] || serviceIds[0], user_id: userId, api_key_preview: 'sk-****ZxYw',    last_used_offset: '30 minutes', calls_this_month: 198000,calls_this_week: 42000, status: 'active',  plan: 'enterprise' },
    { service_id: serviceIds[7] || serviceIds[0], user_id: userId, api_key_preview: 'pat-****9q2r',   last_used_offset: '4 days',     calls_this_month: 1200,  calls_this_week: 0,     status: 'paused',  plan: 'basic' },
  ];
}

function executionsRows(toolIds, userId) {
  const samples = [
    { input: '{"amount":4999,"currency":"usd","customer_id":"cus_KQ"}',         output: '{"charge_id":"ch_3OabZ","status":"succeeded"}',         status: 'success', duration_ms: 142, tokens_used: 0,    cost_usd: 0.029 },
    { input: '{"channel":"#deploys","text":"Production rollout v2.4 complete"}', output: '{"ok":true,"ts":"1715000111.000200"}',                  status: 'success', duration_ms: 108, tokens_used: 0,    cost_usd: 0.0001 },
    { input: '{"owner":"acme","repo":"api","head":"feat/oauth","base":"main"}', output: '{"number":312,"html_url":"https://github.com/acme/api/pull/312"}', status: 'success', duration_ms: 245, tokens_used: 0,    cost_usd: 0 },
    { input: '{"to":"+15558675309","body":"Your verification code is 731208"}', output: '{"sid":"SM4abcd","status":"queued"}',                    status: 'success', duration_ms: 218, tokens_used: 0,    cost_usd: 0.0079 },
    { input: '{"customer_id":"cus_invalid","status":"active"}',                 output: '{"error":"No such customer"}',                          status: 'error',   duration_ms: 96,  tokens_used: 0,    cost_usd: 0 },
    { input: '{"bucket":"reports","key":"2025/05/q2.pdf","content_type":"application/pdf"}', output: '{"etag":"\\"7f9c\\"","version_id":"v.51"}',  status: 'success', duration_ms: 87,  tokens_used: 0,    cost_usd: 0.00002 },
    { input: '{"input":"summarize agent eval frameworks","model":"text-embedding-3-small"}', output: '{"data":[{"embedding":"[1536 floats]"}],"usage":{"total_tokens":6}}', status: 'success', duration_ms: 231, tokens_used: 6, cost_usd: 0.0000012 },
    { input: '{"database_id":"a1b2","filter":{"property":"Owner","people":{"contains":"u_42"}}}', output: '{"results":[{"id":"page_91"},{"id":"page_92"}]}', status: 'success', duration_ms: 360, tokens_used: 0, cost_usd: 0 },
  ];
  return samples.map((s, i) => ({
    tool_id: toolIds[i % toolIds.length],
    user_id: userId,
    input_params: s.input,
    output_preview: s.output,
    status: s.status,
    duration_ms: s.duration_ms,
    tokens_used: s.tokens_used,
    cost_usd: s.cost_usd,
  }));
}

function documentationRows(serviceIds) {
  const pick = (i) => serviceIds[i % serviceIds.length];
  return [
    { service_id: pick(0), section: 'getting_started', title: 'Authenticate with the Stripe API',
      content: 'Create a restricted API key in the Stripe dashboard. Pass it as a Bearer token on every request. Use a test-mode key during development.',
      code_examples: 'curl https://api.stripe.com/v1/charges -u sk_test_xxxx:', views: 18400 },
    { section: 'tutorials', service_id: pick(1), title: 'Post your first Slack message',
      content: 'Install the bot in your workspace, request the chat:write scope, then call chat.postMessage with a channel and text.',
      code_examples: 'await fetch("https://slack.com/api/chat.postMessage",{method:"POST",headers:{Authorization:"Bearer xoxb-..."},body:JSON.stringify({channel:"#general",text:"hi"})})', views: 9200 },
    { section: 'reference', service_id: pick(2), title: 'GitHub OAuth scopes for agents',
      content: 'Use the repo scope for private repos, workflow for Actions, read:org for org data. Prefer fine-grained PATs for narrowly scoped agents.',
      code_examples: '# scopes: repo, read:org, workflow', views: 5400 },
    { section: 'guides', service_id: pick(3), title: 'Avoiding SMS rate limits with Twilio',
      content: 'Use Messaging Services to pool numbers, throttle to 1 msg/sec/number, and back off on 429s with exponential delay.',
      code_examples: 'await client.messages.create({to,from,body})', views: 3100 },
    { section: 'recipes', service_id: pick(4), title: 'Sync a Notion database to your agent\'s memory',
      content: 'Page through the database with start_cursor, hash each block, and upsert to your vector store. Schedule with cron every 15 min.',
      code_examples: 'await notion.databases.query({database_id, start_cursor})', views: 2700 },
    { section: 'reference', service_id: pick(5), title: 'S3 bucket policies for agent uploads',
      content: 'Grant the agent IAM role s3:PutObject on a single prefix. Enable bucket versioning for safe rollbacks.',
      code_examples: '{"Effect":"Allow","Action":"s3:PutObject","Resource":"arn:aws:s3:::reports/agents/*"}', views: 6900 },
    { section: 'tutorials', service_id: pick(6), title: 'Build semantic search with embeddings',
      content: 'Embed your corpus once, store in pgvector, and on query embed and run cosine ANN. Re-rank top-50 with a cross-encoder.',
      code_examples: 'SELECT id FROM docs ORDER BY embedding <=> $1 LIMIT 10', views: 14800 },
  ];
}

function usageMetricsRows(serviceIds) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const sid = serviceIds[i % serviceIds.length];
    const total = 80000 + Math.floor(Math.random() * 40000);
    const failed = Math.floor(total * (0.005 + Math.random() * 0.01));
    out.push({
      service_id: sid,
      metric_date: dateStr,
      total_calls: total,
      success_calls: total - failed,
      failed_calls: failed,
      avg_latency_ms: 120 + Math.floor(Math.random() * 200),
      p99_latency_ms: 600 + Math.floor(Math.random() * 800),
      unique_users: 200 + Math.floor(Math.random() * 1500),
    });
  }
  return out;
}

// --- handler ------------------------------------------------------------------

router.post('/sample-data/:entity', auth, async (req, res) => {
  const entity = req.params.entity;
  if (!VALID_ENTITIES.includes(entity)) {
    return res.status(400).json({ error: `Unknown entity: ${entity}. Valid: ${VALID_ENTITIES.join(', ')}` });
  }
  try {
    let inserted = 0;

    if (entity === 'services') {
      const rows = servicesRows();
      for (const r of rows) {
        const result = await db.query(
          'INSERT INTO services (name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [r.name, r.description, r.version, r.category, r.endpoint_url, r.auth_type, r.status, r.uptime_pct, r.monthly_calls, r.avg_latency_ms]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    if (entity === 'tools') {
      const svc = await db.query('SELECT id FROM services ORDER BY id LIMIT 12');
      const serviceIds = svc.rows.map(r => r.id);
      if (serviceIds.length === 0) return res.status(409).json({ error: 'No services exist; insert services first' });
      const rows = toolsRows(serviceIds);
      for (const r of rows) {
        const result = await db.query(
          'INSERT INTO tools (service_id, name, description, input_schema, output_schema, example_input, example_output, call_count, success_rate, avg_latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [r.service_id, r.name, r.description, r.input_schema, r.output_schema, r.example_input, r.example_output, r.call_count, r.success_rate, r.avg_latency_ms]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    if (entity === 'integrations') {
      const svc = await db.query('SELECT id FROM services ORDER BY id LIMIT 12');
      const serviceIds = svc.rows.map(r => r.id);
      if (serviceIds.length === 0) return res.status(409).json({ error: 'No services exist; insert services first' });
      const userId = req.user?.id || null;
      const rows = integrationsRows(serviceIds, userId);
      for (const r of rows) {
        const result = await db.query(
          `INSERT INTO integrations (service_id, user_id, api_key_preview, connected_at, last_used, calls_this_month, calls_this_week, status, plan)
           VALUES ($1,$2,$3, NOW() - INTERVAL '30 days', NOW() - ($4)::interval, $5, $6, $7, $8) RETURNING id`,
          [r.service_id, r.user_id, r.api_key_preview, r.last_used_offset, r.calls_this_month, r.calls_this_week, r.status, r.plan]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    if (entity === 'executions') {
      const toolsRes = await db.query('SELECT id FROM tools ORDER BY id LIMIT 12');
      const toolIds = toolsRes.rows.map(r => r.id);
      if (toolIds.length === 0) return res.status(409).json({ error: 'No tools exist; insert tools first' });
      const userId = req.user?.id || null;
      const rows = executionsRows(toolIds, userId);
      for (const r of rows) {
        const result = await db.query(
          'INSERT INTO executions (tool_id, user_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
          [r.tool_id, r.user_id, r.input_params, r.output_preview, r.status, r.duration_ms, r.tokens_used, r.cost_usd]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    if (entity === 'documentation') {
      const svc = await db.query('SELECT id FROM services ORDER BY id LIMIT 12');
      const serviceIds = svc.rows.map(r => r.id);
      if (serviceIds.length === 0) return res.status(409).json({ error: 'No services exist; insert services first' });
      const rows = documentationRows(serviceIds);
      for (const r of rows) {
        const result = await db.query(
          'INSERT INTO documentation (service_id, section, title, content, code_examples, views) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
          [r.service_id, r.section, r.title, r.content, r.code_examples, r.views]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    if (entity === 'usage_metrics') {
      const svc = await db.query('SELECT id FROM services ORDER BY id LIMIT 12');
      const serviceIds = svc.rows.map(r => r.id);
      if (serviceIds.length === 0) return res.status(409).json({ error: 'No services exist; insert services first' });
      const rows = usageMetricsRows(serviceIds);
      for (const r of rows) {
        const result = await db.query(
          'INSERT INTO usage_metrics (service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
          [r.service_id, r.metric_date, r.total_calls, r.success_calls, r.failed_calls, r.avg_latency_ms, r.p99_latency_ms, r.unique_users]
        );
        if (result.rows[0]) inserted++;
      }
      return res.json({ inserted, entity });
    }

    return res.status(400).json({ error: 'Entity handler not implemented' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
