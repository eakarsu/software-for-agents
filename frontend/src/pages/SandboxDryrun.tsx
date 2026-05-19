import { useEffect, useState } from 'react';
import { Play, CheckCircle, XCircle, RefreshCcw, KeyRound, ShieldAlert } from 'lucide-react';
import { apiFetch, api } from '../api';

type Tool = { id: number; name: string; description: string; input_schema: string; example_input: string };
type Run = {
  id: number; tool_id: number; agent_id: number | null; idempotency_key: string | null;
  input_payload: string; output_payload: string | null; schema_valid: boolean;
  schema_errors: string | null; duration_ms: number; dry_run: boolean;
  status_code: number; error_code: string | null; created_at: string;
};

export default function SandboxDryrun() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [errorCodes, setErrorCodes] = useState<Record<string, any>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [filter, setFilter] = useState({ tool_id: '', error_code: '' });
  const [form, setForm] = useState({ tool_id: '', input: '{}', idempotency_key: '', dry_run: true });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [t, e, r] = await Promise.all([
      api.tools.list(),
      apiFetch('/sandbox-dryrun/error-codes'),
      runsQuery()
    ]);
    setTools(t);
    setErrorCodes(e);
    setRuns(r);
  }
  async function runsQuery() {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    return apiFetch(`/sandbox-dryrun/runs?${params}`);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { runsQuery().then(setRuns); }, [filter]);

  function selectTool(id: string) {
    const t = tools.find(t => String(t.id) === id);
    setForm({ ...form, tool_id: id, input: t?.example_input || '{}' });
  }

  async function invoke(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      let parsed: any = {};
      try { parsed = JSON.parse(form.input); } catch { return setResult({ error_code: 'BAD_INPUT', description: 'input is not valid JSON' }); }
      const r = await apiFetch('/sandbox-dryrun/invoke', {
        method: 'POST',
        body: JSON.stringify({
          tool_id: Number(form.tool_id),
          input: parsed,
          idempotency_key: form.idempotency_key || undefined,
          dry_run: form.dry_run
        })
      });
      setResult(r);
      setRuns(await runsQuery());
    } catch (e: any) {
      setResult({ error_code: 'ERROR', description: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function replay(id: number) {
    const r = await apiFetch(`/sandbox-dryrun/replay/${id}`, { method: 'POST' });
    setResult(r);
    setRuns(await runsQuery());
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Play className="w-6 h-6 text-violet-400" />Agent Sandbox · Dry-Run</h1>
        <p className="text-gray-400 text-sm mt-1">Typed inputs (zod-style), idempotency keys, structured error envelopes. Demonstrates agent-friendly API hygiene.</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <form onSubmit={invoke} className="col-span-12 lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Tool</label>
            <select required value={form.tool_id} onChange={e => selectTool(e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm">
              <option value="">Select a tool…</option>
              {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Input (JSON)</label>
            <textarea rows={6} value={form.input} onChange={e => setForm({ ...form, input: e.target.value })} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 flex items-center gap-1"><KeyRound className="w-3 h-3" />Idempotency-Key</label>
              <input value={form.idempotency_key} onChange={e => setForm({ ...form, idempotency_key: e.target.value })} placeholder="optional, agent-supplied" className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.dry_run} onChange={e => setForm({ ...form, dry_run: e.target.checked })} />Dry-run
              </label>
            </div>
          </div>
          <button disabled={busy} className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded flex items-center justify-center gap-1">
            {busy ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}Invoke
          </button>

          {result && (
            <div className={`rounded-lg p-3 border ${result.error_code && result.error_code !== 'IDEMPOTENT_CACHED' ? 'border-red-700 bg-red-900/20' : 'border-green-700 bg-green-900/10'}`}>
              <div className="flex items-center gap-2 text-sm">
                {result.error_code && result.error_code !== 'IDEMPOTENT_CACHED' ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                <span className="text-white font-mono">{result.error_code || 'ok'}</span>
                {result.retryable && <span className="text-xs text-yellow-300">retryable</span>}
                {result.cached && <span className="text-xs text-violet-300">cached</span>}
              </div>
              {result.description && <div className="text-xs text-gray-400 mt-1">{result.description}</div>}
              {result.schema_errors && (
                <ul className="mt-2 text-xs text-red-300 list-disc pl-4">
                  {result.schema_errors.map((e: any, i: number) => <li key={i}><span className="font-mono">{e.path}</span>: {e.message}</li>)}
                </ul>
              )}
              {result.output && (
                <pre className="text-xs text-gray-300 mt-2 bg-gray-950 p-2 rounded max-h-48 overflow-auto">{JSON.stringify(result.output, null, 2)}</pre>
              )}
            </div>
          )}
        </form>

        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="bg-gray-900 border border-violet-900/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4" />Structured error codes</h3>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(errorCodes).map(([code, meta]: any) => (
                <div key={code} className="bg-gray-800 rounded p-1.5">
                  <div className="text-white font-mono">{code} <span className="text-gray-500">{meta.http}</span> {meta.retryable && <span className="text-yellow-400">retryable</span>}</div>
                  <div className="text-gray-400 text-[10px]">{meta.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">Recent runs</h3>
              <select value={filter.tool_id} onChange={e => setFilter({ ...filter, tool_id: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs">
                <option value="">All tools</option>
                {tools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={filter.error_code} onChange={e => setFilter({ ...filter, error_code: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs">
                <option value="">All statuses</option>
                {Object.keys(errorCodes).map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="text-xs text-gray-400 ml-auto">{runs.length} runs</span>
            </div>
            <div className="overflow-y-auto max-h-[55vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-900 text-[10px] uppercase text-gray-400">
                  <tr className="text-left border-b border-gray-800">
                    <th className="py-1.5 pr-2">When</th><th className="py-1.5 pr-2">Tool</th>
                    <th className="py-1.5 pr-2">Idem-key</th><th className="py-1.5 pr-2">Status</th>
                    <th className="py-1.5 pr-2 text-right">ms</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => {
                    const t = tools.find(t => t.id === r.tool_id);
                    return (
                      <tr key={r.id} className="border-b border-gray-800/60">
                        <td className="py-1.5 pr-2 text-gray-400">{new Date(r.created_at).toLocaleTimeString()}</td>
                        <td className="py-1.5 pr-2 text-white">{t?.name || `#${r.tool_id}`}</td>
                        <td className="py-1.5 pr-2 text-violet-300 font-mono">{r.idempotency_key || '—'}</td>
                        <td className="py-1.5 pr-2">
                          {r.error_code ? <span className="text-red-400 font-mono">{r.error_code}</span> : <span className="text-green-400">ok</span>}
                          {!r.schema_valid && <span className="text-yellow-400 ml-1">schema</span>}
                        </td>
                        <td className="py-1.5 pr-2 text-right text-gray-300">{r.duration_ms}</td>
                        <td className="py-1.5 pr-1"><button onClick={() => replay(r.id)} className="text-violet-300 hover:text-violet-200 text-[10px] flex items-center gap-0.5"><RefreshCcw className="w-2.5 h-2.5" />replay</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
