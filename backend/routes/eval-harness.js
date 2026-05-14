// Eval Harness + Tool-Call Replay Store.
//
// Provides:
//   * Replay store for production traces (LangGraph, CrewAI, AutoGen, ...)
//   * Eval results against real public benchmarks (BFCL v3, AgentBench,
//     SWE-bench-Verified, ToolBench, GAIA) with category-level breakdowns
//   * Regression detection across runs
//
// Endpoints:
//   GET   /api/eval-harness/leaderboard               — BFCL-style leaderboard across agents
//   GET   /api/eval-harness/leaderboard/:benchmark    — single benchmark leaderboard
//   GET   /api/eval-harness/agents/:agent_id/scores   — all eval scores for one agent
//   GET   /api/eval-harness/benchmarks                — supported benchmarks + descriptions
//   POST  /api/eval-harness/runs                      — submit an eval result
//   GET   /api/eval-harness/traces                    — recent replay traces
//   GET   /api/eval-harness/traces/:trace_id          — full trace
//   POST  /api/eval-harness/traces                    — submit a new trace
//   POST  /api/eval-harness/regression                — compute regression between two trace sets
//   GET   /api/eval-harness/stats                     — aggregate stats

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// Public, well-known agent benchmarks. Scores in seed.sql come from public papers
// (BFCL v3 leaderboard, SWE-bench-Verified, AgentBench, ToolBench, GAIA).
const BENCHMARKS = {
  BFCL_v3: {
    full_name: 'Berkeley Function Calling Leaderboard v3',
    url: 'https://gorilla.cs.berkeley.edu/leaderboard.html',
    max_score: 100,
    tasks_total: 1700,
    categories: ['simple', 'multiple', 'parallel', 'parallel_multiple', 'java', 'javascript', 'rest'],
    notes: 'Public function-calling benchmark; measures correctness across 7 sub-categories.'
  },
  'SWE-bench-Verified': {
    full_name: 'SWE-bench Verified',
    url: 'https://www.swebench.com',
    max_score: 100,
    tasks_total: 500,
    categories: ['django', 'sympy', 'matplotlib', 'sphinx'],
    notes: 'Real GitHub issues from popular Python repos; agent must produce a passing patch.'
  },
  AgentBench: {
    full_name: 'AgentBench',
    url: 'https://github.com/THUDM/AgentBench',
    max_score: 100,
    tasks_total: 250,
    categories: ['os', 'db', 'kg', 'web'],
    notes: 'Multi-environment agent benchmark from THUDM.'
  },
  ToolBench: {
    full_name: 'ToolBench',
    url: 'https://github.com/OpenBMB/ToolBench',
    max_score: 100,
    tasks_total: 1000,
    categories: ['single', 'multi', 'unseen'],
    notes: 'Tool-use benchmark with 16k RapidAPI tools.'
  },
  GAIA: {
    full_name: 'GAIA',
    url: 'https://huggingface.co/gaia-benchmark',
    max_score: 100,
    tasks_total: 165,
    categories: ['level1', 'level2', 'level3'],
    notes: 'General AI Assistants benchmark from Meta + HuggingFace.'
  }
};

router.get('/benchmarks', (_req, res) => res.json(BENCHMARKS));

// --- leaderboard -----------------------------------------------------------
router.get('/leaderboard', async (_req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.agent_id, a.display_name, a.organization, a.framework, a.model_id, a.trust_tier,
             e.benchmark, e.score, e.tasks_total, e.tasks_passed
      FROM eval_results e
      JOIN agents a ON a.id = e.agent_id
      ORDER BY e.benchmark, e.score DESC
    `);
    // Group by benchmark.
    const grouped = {};
    r.rows.forEach(row => {
      grouped[row.benchmark] = grouped[row.benchmark] || [];
      grouped[row.benchmark].push(row);
    });
    Object.keys(grouped).forEach(bk => {
      grouped[bk].forEach((row, i) => { row.rank = i + 1; });
    });
    res.json({ benchmarks: Object.keys(grouped), leaderboard: grouped });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leaderboard/:benchmark', async (req, res) => {
  try {
    const { benchmark } = req.params;
    if (!BENCHMARKS[benchmark]) {
      return res.status(404).json({ error: `Unknown benchmark. Known: ${Object.keys(BENCHMARKS).join(', ')}` });
    }
    const r = await pool.query(`
      SELECT a.agent_id, a.display_name, a.organization, a.framework, a.framework_version,
             a.model_id, a.trust_tier, e.score, e.tasks_total, e.tasks_passed,
             e.tasks_failed, e.category_scores, e.notes, e.run_at
      FROM eval_results e
      JOIN agents a ON a.id = e.agent_id
      WHERE e.benchmark = $1
      ORDER BY e.score DESC
    `, [benchmark]);
    const rows = r.rows.map((row, i) => ({
      rank: i + 1,
      ...row,
      category_scores: row.category_scores ? safeParse(row.category_scores) : null
    }));
    res.json({ benchmark, meta: BENCHMARKS[benchmark], leaderboard: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/agents/:agent_id/scores', async (req, res) => {
  try {
    const a = await pool.query('SELECT id, agent_id, display_name, framework, model_id FROM agents WHERE agent_id=$1', [req.params.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const scores = await pool.query(
      `SELECT benchmark, score, tasks_total, tasks_passed, tasks_failed, category_scores, notes, run_at
       FROM eval_results WHERE agent_id = $1 ORDER BY benchmark, run_at DESC`,
      [a.rows[0].id]
    );
    res.json({
      agent: a.rows[0],
      scores: scores.rows.map(s => ({
        ...s,
        category_scores: s.category_scores ? safeParse(s.category_scores) : null
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/runs', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.agent_id || !b.benchmark || b.score === undefined) {
      return res.status(400).json({ error: 'agent_id, benchmark, score required', error_code: 'BAD_INPUT' });
    }
    if (!BENCHMARKS[b.benchmark]) {
      return res.status(400).json({ error: `Unknown benchmark. Allowed: ${Object.keys(BENCHMARKS).join(', ')}`, error_code: 'BAD_INPUT' });
    }
    const a = await pool.query('SELECT id FROM agents WHERE agent_id=$1', [b.agent_id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'agent not found' });
    const r = await pool.query(
      `INSERT INTO eval_results (agent_id, benchmark, score, tasks_total, tasks_passed, tasks_failed, category_scores, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [a.rows[0].id, b.benchmark, b.score, b.tasks_total || null, b.tasks_passed || null,
       b.tasks_failed || null, b.category_scores ? JSON.stringify(b.category_scores) : null, b.notes || null]
    );
    // Also update the headline score on the agent record if score is higher than current.
    if (b.benchmark === 'BFCL_v3') {
      await pool.query(
        `UPDATE agents SET bfcl_score = GREATEST(COALESCE(bfcl_score, 0), $1::numeric) WHERE id = $2`,
        [b.score, a.rows[0].id]
      );
    } else if (b.benchmark === 'AgentBench') {
      await pool.query(
        `UPDATE agents SET agentbench_score = GREATEST(COALESCE(agentbench_score, 0), $1::numeric) WHERE id = $2`,
        [b.score, a.rows[0].id]
      );
    }
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- replay traces ---------------------------------------------------------
router.get('/traces', async (req, res) => {
  try {
    const { agent_id, framework, workflow, outcome, limit = 100 } = req.query;
    const params = [];
    const where = [];
    if (agent_id) {
      const a = await pool.query('SELECT id FROM agents WHERE agent_id=$1', [agent_id]);
      if (!a.rows[0]) return res.json([]);
      params.push(a.rows[0].id); where.push(`agent_id = $${params.length}`);
    }
    if (framework) { params.push(framework);            where.push(`framework = $${params.length}`); }
    if (workflow)  { params.push(`%${workflow}%`);      where.push(`workflow_name ILIKE $${params.length}`); }
    if (outcome)   { params.push(outcome);              where.push(`outcome_label = $${params.length}`); }
    params.push(Math.min(Number(limit) || 100, 500));
    const sql = `SELECT * FROM replay_traces ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${params.length}`;
    const r = await pool.query(sql, params);
    res.json(r.rows.map(row => ({ ...row, tool_calls: safeParse(row.tool_calls) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/traces/:trace_id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM replay_traces WHERE trace_id = $1', [req.params.trace_id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'trace not found' });
    res.json({ ...r.rows[0], tool_calls: safeParse(r.rows[0].tool_calls) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/traces', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.trace_id || !b.workflow_name) {
      return res.status(400).json({ error: 'trace_id and workflow_name required', error_code: 'BAD_INPUT' });
    }
    let agentDbId = null;
    if (b.agent_id) {
      const a = await pool.query('SELECT id FROM agents WHERE agent_id = $1', [b.agent_id]);
      agentDbId = a.rows[0]?.id;
    }
    const r = await pool.query(
      `INSERT INTO replay_traces (trace_id, agent_id, workflow_name, framework, step_count,
         tool_calls, total_latency_ms, total_tokens, success, outcome_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.trace_id, agentDbId, b.workflow_name, b.framework || null, b.step_count || 0,
       b.tool_calls ? JSON.stringify(b.tool_calls) : null,
       b.total_latency_ms || null, b.total_tokens || null,
       b.success !== false, b.outcome_label || (b.success === false ? 'failed' : 'success')]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (String(err.message).includes('duplicate key')) {
      return res.status(409).json({ error: 'trace_id already exists', error_code: 'DUPLICATE' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- regression: compare workflow before vs after --------------------------
router.post('/regression', async (req, res) => {
  try {
    const { workflow_name, baseline_before_iso, candidate_after_iso } = req.body || {};
    if (!workflow_name) return res.status(400).json({ error: 'workflow_name required', error_code: 'BAD_INPUT' });
    const baselineCutoff = baseline_before_iso || new Date(Date.now() - 7 * 86400000).toISOString();
    const candidateCutoff = candidate_after_iso || baselineCutoff;
    const base = await pool.query(
      `SELECT * FROM replay_traces WHERE workflow_name = $1 AND created_at < $2`,
      [workflow_name, baselineCutoff]
    );
    const cand = await pool.query(
      `SELECT * FROM replay_traces WHERE workflow_name = $1 AND created_at >= $2`,
      [workflow_name, candidateCutoff]
    );
    const summarize = rows => {
      const n = rows.length;
      const succ = rows.filter(r => r.success).length;
      const avgLat = n ? Math.round(rows.reduce((s, r) => s + (r.total_latency_ms || 0), 0) / n) : 0;
      const avgTok = n ? Math.round(rows.reduce((s, r) => s + (r.total_tokens || 0), 0) / n) : 0;
      return { count: n, success_rate: n ? +(succ * 100 / n).toFixed(1) : 0, avg_latency_ms: avgLat, avg_tokens: avgTok };
    };
    const b = summarize(base.rows);
    const c = summarize(cand.rows);
    res.json({
      workflow: workflow_name,
      baseline: b,
      candidate: c,
      regression: {
        success_rate_delta: +(c.success_rate - b.success_rate).toFixed(1),
        latency_delta_ms: c.avg_latency_ms - b.avg_latency_ms,
        token_delta: c.avg_tokens - b.avg_tokens,
        verdict: (c.success_rate < b.success_rate - 2 || c.avg_latency_ms > b.avg_latency_ms * 1.25)
          ? 'REGRESSION'
          : (c.success_rate > b.success_rate + 2 ? 'IMPROVEMENT' : 'NEUTRAL')
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (_req, res) => {
  try {
    const benches = await pool.query(
      `SELECT benchmark, COUNT(*)::int AS submissions,
              ROUND(AVG(score)::numeric, 1) AS avg_score,
              MAX(score) AS top_score
       FROM eval_results GROUP BY benchmark ORDER BY benchmark`
    );
    const traceCount = await pool.query('SELECT COUNT(*)::int AS n FROM replay_traces');
    const successRate = await pool.query(
      `SELECT ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 1) AS pct FROM replay_traces`
    );
    res.json({
      benchmarks: benches.rows,
      total_traces: traceCount.rows[0].n,
      trace_success_pct: successRate.rows[0].pct
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

module.exports = router;
