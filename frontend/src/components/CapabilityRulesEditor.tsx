import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { ShieldCheck, Trash2, Plus, Save, X } from 'lucide-react';

type Rule = {
  id: number;
  name: string;
  capability: string;
  match: string;
  action: string;
  severity: 'low' | 'medium' | 'high';
  created_at?: string;
  updated_at?: string;
};

const CAPS = ['read', 'write', 'invoke', 'tool', 'auth', 'admin'];
const SEVS = ['low', 'medium', 'high'];

const blank: Omit<Rule, 'id'> = {
  name: '', capability: 'invoke', match: '', action: '', severity: 'medium'
};

export default function CapabilityRulesEditor() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<Omit<Rule, 'id'>>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await apiFetch('/custom-views/capability-rules');
      setRules(r.rules || []);
    } catch (e: any) {
      setErr(String(e.message || e));
    }
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    setBusy(true); setErr('');
    try {
      if (editId == null) {
        await apiFetch('/custom-views/capability-rules', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch(`/custom-views/capability-rules/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      }
      setForm(blank); setEditId(null);
      await load();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true); setErr('');
    try {
      await apiFetch(`/custom-views/capability-rules/${id}`, { method: 'DELETE' });
      await load();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  function edit(r: Rule) {
    setEditId(r.id);
    setForm({ name: r.name, capability: r.capability, match: r.match, action: r.action, severity: r.severity });
  }

  function cancel() { setEditId(null); setForm(blank); }

  const sevColor = (s: string) =>
    s === 'high' ? 'bg-rose-900 text-rose-200' :
    s === 'medium' ? 'bg-amber-900 text-amber-200' :
    'bg-emerald-900 text-emerald-200';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-4 h-4 text-violet-400" />
        <h2 className="text-white font-semibold">Capability Rules Editor</h2>
        <span className="ml-auto text-xs text-gray-500">{rules.length} rules</span>
      </div>

      {err && <div className="mb-3 text-xs text-red-400">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
        <input
          className="md:col-span-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
          placeholder="rule name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
          value={form.capability}
          onChange={e => setForm({ ...form, capability: e.target.value })}
        >
          {CAPS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          className="md:col-span-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
          placeholder="match expression"
          value={form.match}
          onChange={e => setForm({ ...form, match: e.target.value })}
        />
        <select
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
          value={form.severity}
          onChange={e => setForm({ ...form, severity: e.target.value as Rule['severity'] })}
        >
          {SEVS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          className="md:col-span-5 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
          placeholder="action when match"
          value={form.action}
          onChange={e => setForm({ ...form, action: e.target.value })}
        />
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded"
          >
            {editId == null ? <Plus className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {editId == null ? 'Add' : 'Save'}
          </button>
          {editId != null && (
            <button
              onClick={cancel}
              className="inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-2 py-1.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Capability</th>
              <th className="py-2 pr-3 font-medium">Match</th>
              <th className="py-2 pr-3 font-medium">Action</th>
              <th className="py-2 pr-3 font-medium">Severity</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-gray-800/60 hover:bg-gray-800/40">
                <td className="py-2 pr-3 text-white">{r.name}</td>
                <td className="py-2 pr-3 text-gray-300">{r.capability}</td>
                <td className="py-2 pr-3 text-gray-400 font-mono">{r.match}</td>
                <td className="py-2 pr-3 text-gray-300">{r.action}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${sevColor(r.severity)}`}>
                    {r.severity}
                  </span>
                </td>
                <td className="py-2 pr-3 text-right">
                  <button
                    onClick={() => edit(r)}
                    className="text-violet-400 hover:text-violet-300 text-xs mr-3"
                  >Edit</button>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busy}
                    className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">No rules yet — add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
