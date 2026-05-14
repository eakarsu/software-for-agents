import { useEffect, useState } from 'react';
import { Trophy, Activity, GitBranch, RefreshCcw } from 'lucide-react';
import { apiFetch } from '../api';

type LbRow = {
  rank: number; agent_id: string; display_name: string; organization: string | null;
  framework: string; model_id: string | null; trust_tier: string;
  score: number; tasks_total: number; tasks_passed: number; tasks_failed: number;
  category_scores: Record<string, number> | null; notes: string | null; run_at: string;
};
type Trace = {
  id: number; trace_id: string; workflow_name: string; framework: string;
  step_count: number; total_latency_ms: number; total_tokens: number;
  success: boolean; outcome_label: string; tool_calls: any[]; created_at: string;
};

export default function EvalHarness() {
  const [benchmarks, setBenchmarks] = useState<Record<string, any>>({});
  const [benchmark, setBenchmark] = useState('BFCL_v3');
  const [board, setBoard] = useState<LbRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [filterTraces, setFilterTraces] = useState({ framework: '', outcome: '' });
  const [regression, setRegression] = useState<any>(null);
  const [regressionWorkflow, setRegressionWorkflow] = useState('support-triage-v3');

  async function load() {
    const [b, s] = await Promise.all([
      apiFetch('/eval-harness/benchmarks'),
      apiFetch('/eval-harness/stats')
    ]);
    setBenchmarks(b);
    setStats(s);
  }
  async function loadBoard() {
    const r = await apiFetch(`/eval-harness/leaderboard/${benchmark}`);
    setBoard(r.leaderboard);
  }
  async function loadTraces() {
    const params = new URLSearchParams();
    Object.entries(filterTraces).forEach(([k, v]) => { if (v) params.set(k, v); });
    setTraces(await apiFetch(`/eval-harness/traces?${params}`));
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { loadBoard(); }, [benchmark]);
  useEffect(() => { loadTraces(); }, [filterTraces]);

  async function runRegression() {
    const r = await apiFetch('/eval-harness/regression', {
      method: 'POST',
      body: JSON.stringify({ workflow_name: regressionWorkflow })
    });
    setRegression(r);
  }

  const meta = benchmarks[benchmark];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-amber-400" />Eval Harness</h1>
          <p className="text-gray-400 text-sm mt-1">Real benchmark scores (BFCL v3, SWE-bench-Verified, AgentBench, ToolBench, GAIA) + replay traces from production agent runs.</p>
        </div>
        {stats && (
          <div className="grid grid-cols-3 gap-3 text-right">
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"><div className="text-xs text-gray-400">Traces</div><div className="text-white font-bold">{stats.total_traces}</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"><div className="text-xs text-gray-400">Success %</div><div className="text-green-400 font-bold">{stats.trace_success_pct ?? '—'}</div></div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"><div className="text-xs text-gray-400">Benchmarks</div><div className="text-white font-bold">{stats.benchmarks?.length}</div></div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {Object.keys(benchmarks).map(b => (
          <button key={b} onClick={() => setBenchmark(b)} className={`text-xs px-3 py-1.5 rounded ${benchmark === b ? 'bg-amber-500 text-gray-950 font-bold' : 'bg-gray-800 text-gray-300 hover:text-white'}`}>{b}</button>
        ))}
        {meta && (
          <a href={meta.url} target="_blank" rel="noreferrer" className="text-xs text-amber-300 hover:text-amber-200 ml-2">{meta.full_name} ↗</a>
        )}
        {meta?.notes && <span className="text-xs text-gray-500 ml-2">{meta.notes}</span>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400" />{benchmark} leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-800">
                <th className="py-2 pr-3">#</th><th className="py-2 pr-3">Agent</th><th className="py-2 pr-3">Framework</th>
                <th className="py-2 pr-3">Model</th><th className="py-2 pr-3 text-right">Score</th>
                <th className="py-2 pr-3 text-right">Passed / Total</th>
                {meta?.categories && meta.categories.slice(0, 4).map((c: string) => <th key={c} className="py-2 pr-3 text-right">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {board.map(row => (
                <tr key={row.agent_id} className="border-b border-gray-800/60">
                  <td className="py-2 pr-3 text-amber-300 font-bold">#{row.rank}</td>
                  <td className="py-2 pr-3">
                    <div className="text-white">{row.display_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{row.organization}</div>
                  </td>
                  <td className="py-2 pr-3 text-gray-300">{row.framework}</td>
                  <td className="py-2 pr-3 text-gray-300 font-mono text-xs">{row.model_id}</td>
                  <td className="py-2 pr-3 text-right">
                    <span className={`font-bold ${row.score >= 90 ? 'text-green-400' : row.score >= 80 ? 'text-amber-300' : row.score >= 70 ? 'text-orange-400' : 'text-red-400'}`}>{Number(row.score).toFixed(1)}</span>
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-300 text-xs">{row.tasks_passed} / {row.tasks_total}</td>
                  {meta?.categories && meta.categories.slice(0, 4).map((c: string) => (
                    <td key={c} className="py-2 pr-3 text-right text-xs text-gray-300">{row.category_scores?.[c] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-violet-400" />Replay traces</h3>
            <select value={filterTraces.framework} onChange={e => setFilterTraces({ ...filterTraces, framework: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white">
              <option value="">Any framework</option>
              {['langgraph','crewai','autogen','openai-agents-sdk','claude-agent-sdk','mastra','langchain','custom'].map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={filterTraces.outcome} onChange={e => setFilterTraces({ ...filterTraces, outcome: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white">
              <option value="">Any outcome</option>
              {['success','partial','failed','hallucination'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="overflow-y-auto max-h-[55vh]">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400">
                <tr className="text-left border-b border-gray-800">
                  <th className="py-1 pr-2">Workflow</th><th className="py-1 pr-2">Framework</th>
                  <th className="py-1 pr-2 text-right">Steps</th><th className="py-1 pr-2 text-right">ms</th>
                  <th className="py-1 pr-2 text-right">Tokens</th><th className="py-1 pr-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {traces.map(t => (
                  <tr key={t.id} className="border-b border-gray-800/60">
                    <td className="py-1 pr-2 text-white">{t.workflow_name}</td>
                    <td className="py-1 pr-2 text-gray-300">{t.framework}</td>
                    <td className="py-1 pr-2 text-right">{t.step_count}</td>
                    <td className="py-1 pr-2 text-right">{t.total_latency_ms}</td>
                    <td className="py-1 pr-2 text-right">{t.total_tokens}</td>
                    <td className={`py-1 pr-2 ${t.outcome_label === 'success' ? 'text-green-400' : t.outcome_label === 'hallucination' ? 'text-red-500' : t.outcome_label === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>{t.outcome_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 border border-violet-900/40 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2 mb-2"><GitBranch className="w-4 h-4" />Regression check</h3>
          <div className="flex gap-2 items-end mb-3">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Workflow name</label>
              <input value={regressionWorkflow} onChange={e => setRegressionWorkflow(e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white" />
            </div>
            <button onClick={runRegression} className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 rounded">Compute</button>
          </div>
          {regression && (
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Verdict:</span>
                <span className={`font-bold ${regression.regression.verdict === 'REGRESSION' ? 'text-red-400' : regression.regression.verdict === 'IMPROVEMENT' ? 'text-green-400' : 'text-gray-300'}`}>{regression.regression.verdict}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <Pane title="Baseline" data={regression.baseline} />
                <Pane title="Candidate" data={regression.candidate} />
              </div>
              <ul className="text-gray-400 space-y-0.5">
                <li>Success Δ: <span className={regression.regression.success_rate_delta < 0 ? 'text-red-400' : 'text-green-400'}>{regression.regression.success_rate_delta}%</span></li>
                <li>Latency Δ: <span className={regression.regression.latency_delta_ms > 0 ? 'text-yellow-400' : 'text-green-400'}>{regression.regression.latency_delta_ms} ms</span></li>
                <li>Token Δ: {regression.regression.token_delta}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pane({ title, data }: { title: string; data: any }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-2">
      <div className="text-gray-400 text-[10px] uppercase mb-1">{title}</div>
      <div className="text-white text-xs">{data.count} runs · {data.success_rate}% ok</div>
      <div className="text-gray-500 text-[10px]">{data.avg_latency_ms} ms · {data.avg_tokens} tok</div>
    </div>
  );
}
