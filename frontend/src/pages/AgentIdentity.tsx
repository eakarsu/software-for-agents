import { useEffect, useState } from 'react';
import { KeyRound, Shield, BadgeCheck, AlertCircle, Bot } from 'lucide-react';
import { apiFetch } from '../api';

type Agent = {
  id: number;
  agent_id: string;
  display_name: string;
  organization: string | null;
  framework: string;
  framework_version: string | null;
  model_id: string | null;
  verified_principal: string | null;
  verification_method: string | null;
  trust_tier: string;
  status: string;
  bfcl_score: number | null;
  agentbench_score: number | null;
  last_seen_at: string | null;
};

type Policy = {
  trust_tiers: string[];
  verification_methods: string[];
  scope_min_tier: Record<string, string>;
  frameworks: string[];
};

const TIER_COLOR: Record<string, string> = {
  unverified: 'text-gray-400 bg-gray-800',
  verified: 'text-blue-300 bg-blue-900/40',
  trusted: 'text-violet-300 bg-violet-900/40',
  partner: 'text-amber-300 bg-amber-900/40'
};

export default function AgentIdentity() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [filter, setFilter] = useState({ framework: '', trust_tier: '', q: '' });
  const [selected, setSelected] = useState<Agent | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [newKeyResult, setNewKeyResult] = useState<any>(null);
  const [scopeDraft, setScopeDraft] = useState<string[]>(['tools:read']);
  const [error, setError] = useState('');
  const [signupForm, setSignupForm] = useState({ display_name: '', organization: '', framework: 'langgraph', model_id: '' });

  async function load() {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    setAgents(await apiFetch(`/agent-identity/agents?${params}`));
    setPolicy(await apiFetch('/agent-identity/trust-policy'));
  }
  useEffect(() => { load(); }, [filter]);

  async function openAgent(a: Agent) {
    setSelected(a);
    setNewKeyResult(null);
    setError('');
    setDetail(await apiFetch(`/agent-identity/agents/${a.agent_id}`));
  }

  async function issueKey() {
    if (!selected) return;
    setError('');
    try {
      const r = await apiFetch('/agent-identity/keys', {
        method: 'POST',
        body: JSON.stringify({ agent_id: selected.agent_id, scopes: scopeDraft, rate_limit_rpm: 120, rate_limit_tpm: 200000, expires_in_days: 90 })
      });
      setNewKeyResult(r);
      openAgent(selected);
    } catch (e: any) { setError(e.message); }
  }

  async function revokeKey(id: number) {
    if (!confirm('Revoke this key?')) return;
    await apiFetch(`/agent-identity/keys/${id}/revoke`, { method: 'POST' });
    openAgent(selected!);
  }

  async function verify(method: string) {
    if (!selected) return;
    await apiFetch(`/agent-identity/agents/${selected.agent_id}/verify`, { method: 'POST', body: JSON.stringify({ method, proof: 'demo-proof-token' }) });
    openAgent(selected);
    load();
  }

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const r = await apiFetch('/agent-identity/agents', { method: 'POST', body: JSON.stringify(signupForm) });
      setSignupForm({ display_name: '', organization: '', framework: 'langgraph', model_id: '' });
      load();
      openAgent(r);
    } catch (e: any) { setError(e.message); }
  }

  const allScopes = policy ? Object.keys(policy.scope_min_tier) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-6 h-6 text-violet-400" />Agent Identity</h1>
        <p className="text-gray-400 text-sm mt-1">AGENTPASS-style programmatic identity. Verify principal, mint scoped API keys, manage OAuth-for-agents grants.</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7 space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <select value={filter.framework} onChange={e => setFilter({ ...filter, framework: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm">
                <option value="">All frameworks</option>
                {policy?.frameworks.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={filter.trust_tier} onChange={e => setFilter({ ...filter, trust_tier: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm">
                <option value="">Any tier</option>
                {policy?.trust_tiers.map(t => <option key={t}>{t}</option>)}
              </select>
              <input value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} placeholder="Search..." className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm flex-1" />
              <span className="text-xs text-gray-400">{agents.length} agents</span>
            </div>
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-800">
                    <th className="py-2 pr-3">Agent</th><th className="py-2 pr-3">Framework</th><th className="py-2 pr-3">Model</th>
                    <th className="py-2 pr-3">Tier</th><th className="py-2 pr-3 text-right">BFCL</th><th className="py-2 pr-3">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} onClick={() => openAgent(a)} className={`border-b border-gray-800/60 cursor-pointer hover:bg-gray-800/30 ${selected?.id === a.id ? 'bg-violet-900/20' : ''}`}>
                      <td className="py-2 pr-3">
                        <div className="text-white">{a.display_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{a.agent_id}</div>
                      </td>
                      <td className="py-2 pr-3 text-gray-300">{a.framework}<span className="text-xs text-gray-500"> {a.framework_version}</span></td>
                      <td className="py-2 pr-3 text-gray-300 font-mono text-xs">{a.model_id || '—'}</td>
                      <td className="py-2 pr-3"><span className={`text-xs px-2 py-0.5 rounded ${TIER_COLOR[a.trust_tier] || ''}`}>{a.trust_tier}</span></td>
                      <td className="py-2 pr-3 text-right text-amber-300">{a.bfcl_score ? Number(a.bfcl_score).toFixed(1) : '—'}</td>
                      <td className="py-2 pr-3 text-xs text-gray-400">{a.last_seen_at ? new Date(a.last_seen_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={signup} className="bg-gray-900 border border-violet-900/40 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-violet-300 mb-2">Programmatic agent signup</h3>
            <div className="grid grid-cols-2 gap-2">
              <input required value={signupForm.display_name} onChange={e => setSignupForm({ ...signupForm, display_name: e.target.value })} placeholder="Display name" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm" />
              <input value={signupForm.organization} onChange={e => setSignupForm({ ...signupForm, organization: e.target.value })} placeholder="Organization" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm" />
              <select value={signupForm.framework} onChange={e => setSignupForm({ ...signupForm, framework: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm">{policy?.frameworks.map(f => <option key={f}>{f}</option>)}</select>
              <input value={signupForm.model_id} onChange={e => setSignupForm({ ...signupForm, model_id: e.target.value })} placeholder="model_id (e.g. anthropic/claude-opus-4-7)" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
            <button className="mt-3 bg-violet-600 hover:bg-violet-700 text-white text-sm px-3 py-1.5 rounded">Create agent</button>
          </form>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-3">
          {selected && detail ? (
            <>
              <div className="bg-gray-900 border border-violet-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold">{detail.display_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{detail.agent_id}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${TIER_COLOR[detail.trust_tier] || ''}`}>{detail.trust_tier}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className="bg-gray-800 rounded p-2"><div className="text-gray-400">Principal</div><div className="text-white truncate">{detail.verified_principal || '—'}</div></div>
                  <div className="bg-gray-800 rounded p-2"><div className="text-gray-400">Method</div><div className="text-white">{detail.verification_method || 'none'}</div></div>
                  <div className="bg-gray-800 rounded p-2"><div className="text-gray-400">BFCL v3</div><div className="text-amber-300">{detail.bfcl_score ? Number(detail.bfcl_score).toFixed(1) : '—'}</div></div>
                </div>
                <div className="flex gap-2 mt-3">
                  {policy?.verification_methods.map(m => (
                    <button key={m} onClick={() => verify(m)} className="bg-gray-800 hover:bg-gray-700 text-violet-300 text-xs px-2 py-1 rounded flex items-center gap-1"><BadgeCheck className="w-3 h-3" />Verify via {m}</button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2"><KeyRound className="w-4 h-4 text-violet-400" />API Keys ({detail.keys?.length || 0})</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(detail.keys || []).map((k: any) => (
                    <div key={k.id} className="text-xs bg-gray-800 rounded p-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-white">{k.key_prefix}</div>
                        <div className="text-gray-500">{(typeof k.scopes === 'string' ? JSON.parse(k.scopes) : k.scopes).join(', ')}</div>
                      </div>
                      <div className="text-right">
                        <div className={k.revoked ? 'text-red-400' : 'text-green-400'}>{k.revoked ? 'revoked' : 'active'}</div>
                        {!k.revoked && <button onClick={() => revokeKey(k.id)} className="text-red-400 text-[10px] hover:text-red-300">revoke</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 border-t border-gray-800 pt-3">
                  <div className="text-xs text-gray-400 mb-1">Request scopes:</div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {allScopes.map(s => {
                      const on = scopeDraft.includes(s);
                      return (
                        <button key={s} onClick={() => setScopeDraft(on ? scopeDraft.filter(x => x !== s) : [...scopeDraft, s])} className={`text-[10px] px-1.5 py-0.5 rounded ${on ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400'}`}>{s}<span className="text-gray-500 ml-1">[{policy?.scope_min_tier[s]}]</span></button>
                      );
                    })}
                  </div>
                  <button onClick={issueKey} className="mt-2 bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1 rounded">Issue scoped key</button>
                  {error && <div className="mt-2 text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</div>}
                  {newKeyResult?.api_key && (
                    <div className="mt-2 bg-yellow-900/30 border border-yellow-700/40 rounded p-2 text-xs text-yellow-300">
                      Save now: <span className="font-mono break-all">{newKeyResult.api_key}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-violet-400" />OAuth Grants ({detail.oauth_grants?.length || 0})</h3>
                <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                  {(detail.oauth_grants || []).map((g: any) => (
                    <div key={g.id} className="bg-gray-800 rounded p-2 flex justify-between">
                      <div><span className="text-violet-300 font-mono">{g.provider}</span> · <span className="text-gray-400">{(typeof g.granted_scopes === 'string' ? JSON.parse(g.granted_scopes) : g.granted_scopes).join(', ')}</span></div>
                      <span className={g.status === 'granted' ? 'text-green-400' : g.status === 'revoked' ? 'text-red-400' : 'text-yellow-400'}>{g.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-gray-500 text-sm">Select an agent to inspect identity, keys, and OAuth grants.</div>
          )}
        </div>
      </div>
    </div>
  );
}
