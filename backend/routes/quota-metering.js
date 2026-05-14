// Quota Tiers + Per-Agent Metering + Billing Events.
//
// The agent-first product needs:
//   * Server-defined plans (Free / Developer / Scale / Enterprise) with rate
//     limits and per-call/token pricing.
//   * Live counters per agent so /invoke can short-circuit when an agent is over.
//   * Billing events ledger (append-only) for invoicing/RAR.
//
// Endpoints:
//   GET   /api/quota-metering/tiers                  — all plans
//   GET   /api/quota-metering/usage/:agent_id        — current period usage + remaining
//   POST  /api/quota-metering/check                  — pre-call quota check (boolean + headers)
//   POST  /api/quota-metering/record                 — record a usage event (updates counters + billing)
//   GET   /api/quota-metering/billing                — recent billing events
//   GET   /api/quota-metering/billing/by-agent/:agent_id — events for one agent
//   GET   /api/quota-metering/invoice/:agent_id      — synthesize current-period invoice
//   POST  /api/quota-metering/subscribe              — change an agent's tier
//   GET   /api/quota-metering/dashboard              — system-wide metering dashboard

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

function currentPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

router.get('/tiers', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM quota_tiers ORDER BY sort_order, monthly_price_usd');
    res.json(r.rows.map(t => ({ ...t, features: safeParse(t.features, []) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function getAgentUsage(agentId) {
  const { start, end } = currentPeriod();
  let r = await pool.query(
    `SELECT * FROM quota_usage WHERE agent_id = $1 AND period_start = $2`,
    [agentId, start]
  );
  if (!r.rows[0]) {
    // Lazily create a current-period record on first read, defaulting to Free tier.
    const free = await pool.query("SELECT id FROM quota_tiers WHERE name = 'Free'");
    const tier_id = free.rows[0]?.id || null;
    r = await pool.query(
      `INSERT INTO quota_usage (agent_id, tier_id, period_start, period_end, calls_used, tokens_used, cost_accrued_usd, overage_calls, throttled_count)
       VALUES ($1,$2,$3,$4,0,0,0,0,0) RETURNING *`,
      [agentId, tier_id, start, end]
    );
  }
  return r.rows[0];
}

router.get('/usage/:agent_id', async (req, res) => {
  try {
    const a = await pool.query('SELECT id, agent_id, display_name FROM agents WHERE agent_id = $1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const u = await getAgentUsage(a.rows[0].id);
    const tier = u.tier_id ? (await pool.query('SELECT * FROM quota_tiers WHERE id = $1', [u.tier_id])).rows[0] : null;
    const remaining = tier ? Math.max(0, Number(tier.monthly_calls_included) - Number(u.calls_used)) : 0;
    const pct = tier ? Math.min(100, +(100 * Number(u.calls_used) / Number(tier.monthly_calls_included)).toFixed(2)) : 0;
    res.json({
      agent: a.rows[0],
      period: { start: u.period_start, end: u.period_end },
      tier: tier ? { ...tier, features: safeParse(tier.features, []) } : null,
      usage: {
        calls_used: Number(u.calls_used),
        tokens_used: Number(u.tokens_used),
        cost_accrued_usd: Number(u.cost_accrued_usd),
        overage_calls: Number(u.overage_calls),
        throttled_count: u.throttled_count
      },
      remaining_calls: remaining,
      usage_pct: pct
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/check', async (req, res) => {
  try {
    const { agent_id, units = 1 } = req.body || {};
    if (!agent_id) return res.status(400).json({ error: 'agent_id required', error_code: 'BAD_INPUT' });
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const u = await getAgentUsage(a.rows[0].id);
    const tier = u.tier_id ? (await pool.query('SELECT * FROM quota_tiers WHERE id = $1', [u.tier_id])).rows[0] : null;
    if (!tier) return res.json({ allowed: true, headers: { 'X-RateLimit-Limit': 'unknown' } });
    const included = Number(tier.monthly_calls_included);
    const used = Number(u.calls_used);
    const willBeOver = (used + Number(units)) > included;
    const overagePrice = Number(tier.overage_price_per_1k_usd);
    if (willBeOver && (overagePrice === null || overagePrice === undefined || Number.isNaN(overagePrice))) {
      return res.status(429).json({
        allowed: false,
        error_code: 'RATE_LIMIT',
        retryable: false,
        description: `Tier '${tier.name}' has no overage budget. Upgrade.`,
        headers: {
          'X-RateLimit-Limit': String(included),
          'X-RateLimit-Remaining': String(Math.max(0, included - used)),
          'X-RateLimit-Reset': u.period_end,
          'Retry-After': '0'
        }
      });
    }
    res.json({
      allowed: true,
      will_overage: willBeOver,
      overage_units: willBeOver ? (used + Number(units)) - included : 0,
      overage_cost_usd: willBeOver ? +((((used + Number(units)) - included) / 1000) * overagePrice).toFixed(4) : 0,
      headers: {
        'X-RateLimit-Limit': String(included),
        'X-RateLimit-Remaining': String(Math.max(0, included - used - Number(units))),
        'X-RateLimit-Reset': u.period_end
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/record', async (req, res) => {
  try {
    const { agent_id, event_type = 'tool_call', service_id, units = 1, unit_price_usd = 0, tokens_used = 0, metadata } = req.body || {};
    if (!agent_id) return res.status(400).json({ error: 'agent_id required', error_code: 'BAD_INPUT' });
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const amount = +(Number(units) * Number(unit_price_usd)).toFixed(6);
    const u = await getAgentUsage(a.rows[0].id);
    const tier = u.tier_id ? (await pool.query('SELECT * FROM quota_tiers WHERE id = $1', [u.tier_id])).rows[0] : null;
    const newCalls = Number(u.calls_used) + (event_type === 'tool_call' ? Number(units) : 0);
    const overage = tier ? Math.max(0, newCalls - Number(tier.monthly_calls_included)) : 0;
    const overagePrice = tier ? Number(tier.overage_price_per_1k_usd) : 0;
    const overageCost = (overage / 1000) * (overagePrice || 0);
    await pool.query(
      `UPDATE quota_usage SET calls_used = calls_used + $1,
                              tokens_used = tokens_used + $2,
                              cost_accrued_usd = cost_accrued_usd + $3 + $4,
                              overage_calls = $5,
                              updated_at = NOW()
       WHERE id = $6`,
      [event_type === 'tool_call' ? Number(units) : 0,
       Number(tokens_used) || 0,
       amount, overageCost, overage, u.id]
    );
    const ev = await pool.query(
      `INSERT INTO billing_events (agent_id, event_type, service_id, units, unit_price_usd, amount_usd, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [a.rows[0].id, event_type, service_id || null, units, unit_price_usd, amount,
       metadata ? JSON.stringify(metadata) : null]
    );
    res.status(201).json({ event: ev.rows[0], current_period_overage_units: overage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/billing', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const r = await pool.query(
      `SELECT be.*, a.agent_id, a.display_name FROM billing_events be
       LEFT JOIN agents a ON a.id = be.agent_id
       ORDER BY be.occurred_at DESC LIMIT $1`,
      [limit]
    );
    res.json(r.rows.map(row => ({ ...row, metadata: row.metadata ? safeParse(row.metadata, null) : null })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/billing/by-agent/:agent_id', async (req, res) => {
  try {
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const r = await pool.query(
      `SELECT * FROM billing_events WHERE agent_id = $1 ORDER BY occurred_at DESC LIMIT 200`,
      [a.rows[0].id]
    );
    res.json(r.rows.map(row => ({ ...row, metadata: row.metadata ? safeParse(row.metadata, null) : null })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/invoice/:agent_id', async (req, res) => {
  try {
    const a = await pool.query('SELECT id, agent_id, display_name, organization FROM agents WHERE agent_id = $1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const { start, end } = currentPeriod();
    const events = await pool.query(
      `SELECT * FROM billing_events WHERE agent_id = $1 AND occurred_at::date >= $2 AND occurred_at::date <= $3
       ORDER BY occurred_at`,
      [a.rows[0].id, start, end]
    );
    const lineItems = {};
    events.rows.forEach(e => {
      const key = `${e.event_type}:${e.service_id || 'platform'}`;
      lineItems[key] = lineItems[key] || { event_type: e.event_type, service_id: e.service_id, units: 0, amount_usd: 0 };
      lineItems[key].units += Number(e.units || 0);
      lineItems[key].amount_usd += Number(e.amount_usd || 0);
    });
    const total = Object.values(lineItems).reduce((s, x) => s + x.amount_usd, 0);
    res.json({
      agent: a.rows[0],
      period: { start, end },
      line_items: Object.values(lineItems).map(li => ({ ...li, amount_usd: +li.amount_usd.toFixed(4) })),
      total_usd: +total.toFixed(2),
      event_count: events.rows.length
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subscribe', async (req, res) => {
  try {
    const { agent_id, tier_name } = req.body || {};
    if (!agent_id || !tier_name) return res.status(400).json({ error: 'agent_id and tier_name required', error_code: 'BAD_INPUT' });
    const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const t = await pool.query('SELECT * FROM quota_tiers WHERE name = $1', [tier_name]);
    if (!t.rows[0]) return res.status(404).json({ error: 'tier not found' });
    const u = await getAgentUsage(a.rows[0].id);
    await pool.query('UPDATE quota_usage SET tier_id = $1 WHERE id = $2', [t.rows[0].id, u.id]);
    if (Number(t.rows[0].monthly_price_usd) > 0) {
      await pool.query(
        `INSERT INTO billing_events (agent_id, event_type, units, unit_price_usd, amount_usd, metadata, invoiced)
         VALUES ($1,'subscription',1,$2,$2,$3,TRUE)`,
        [a.rows[0].id, t.rows[0].monthly_price_usd, JSON.stringify({ tier: tier_name })]
      );
    }
    res.json({ agent_id, new_tier: t.rows[0].name, monthly_price_usd: t.rows[0].monthly_price_usd });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dashboard', async (_req, res) => {
  try {
    const byTier = await pool.query(`
      SELECT t.name AS tier_name, COUNT(qu.id)::int AS active_agents,
             SUM(qu.calls_used)::bigint AS calls_this_period,
             SUM(qu.cost_accrued_usd)::numeric AS revenue_accrued
      FROM quota_tiers t LEFT JOIN quota_usage qu ON qu.tier_id = t.id
      GROUP BY t.name, t.sort_order ORDER BY t.sort_order
    `);
    const topAgents = await pool.query(`
      SELECT a.agent_id, a.display_name, qu.calls_used, qu.tokens_used, qu.cost_accrued_usd
      FROM quota_usage qu JOIN agents a ON a.id = qu.agent_id
      ORDER BY qu.cost_accrued_usd DESC LIMIT 10
    `);
    const mrrRow = await pool.query(`SELECT COALESCE(SUM(amount_usd),0) AS mrr FROM billing_events WHERE event_type = 'subscription' AND occurred_at::date >= DATE_TRUNC('month', CURRENT_DATE)::date`);
    res.json({
      mrr_usd: Number(mrrRow.rows[0].mrr),
      by_tier: byTier.rows,
      top_agents: topAgents.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function safeParse(s, fb = null) { try { return s ? JSON.parse(s) : fb; } catch { return fb; } }

module.exports = router;
