import { useEffect, useState } from 'react';
import { Gauge, Coins, ArrowUpRight, Receipt } from 'lucide-react';
import { apiFetch } from '../api';

type Tier = {
  id: number; name: string; monthly_calls_included: number; overage_price_per_1k_usd: number | null;
  monthly_price_usd: number; rate_limit_rpm: number; rate_limit_tpm: number;
  max_parallel_executions: number; features: string[];
};
type Dashboard = {
  mrr_usd: number;
  by_tier: { tier_name: string; active_agents: number; calls_this_period: number; revenue_accrued: number }[];
  top_agents: { agent_id: string; display_name: string; calls_used: number; tokens_used: number; cost_accrued_usd: number }[];
};
type Usage = {
  agent: { agent_id: string; display_name: string };
  period: { start: string; end: string };
  tier: Tier | null;
  usage: { calls_used: number; tokens_used: number; cost_accrued_usd: number; overage_calls: number; throttled_count: number };
  remaining_calls: number;
  usage_pct: number;
};

export default function QuotaMetering() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [billing, setBilling] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoice, setInvoice] = useState<any>(null);

  async function load() {
    const [t, d, b] = await Promise.all([
      apiFetch('/quota-metering/tiers'),
      apiFetch('/quota-metering/dashboard'),
      apiFetch('/quota-metering/billing?limit=40')
    ]);
    setTiers(t);
    setDashboard(d);
    setBilling(b);
    if (d.top_agents?.[0]) {
      setSelectedAgent(d.top_agents[0].agent_id);
    }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!selectedAgent) return;
    apiFetch(`/quota-metering/usage/${selectedAgent}`).then(setUsage).catch(() => setUsage(null));
    apiFetch(`/quota-metering/invoice/${selectedAgent}`).then(setInvoice).catch(() => setInvoice(null));
  }, [selectedAgent]);

  async function subscribe(tierName: string) {
    if (!selectedAgent) return;
    await apiFetch('/quota-metering/subscribe', {
      method: 'POST',
      body: JSON.stringify({ agent_id: selectedAgent, tier_name: tierName })
    });
    load();
    apiFetch(`/quota-metering/usage/${selectedAgent}`).then(setUsage);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Gauge className="w-6 h-6 text-emerald-400" />Quota & Metering</h1>
          <p className="text-gray-400 text-sm mt-1">Per-agent quotas, rate-limit headers (X-RateLimit-Limit/Remaining/Reset), overage billing, append-only ledger.</p>
        </div>
        {dashboard && (
          <div className="bg-gray-900 border border-emerald-700/50 rounded-xl px-4 py-3">
            <div className="text-xs text-emerald-300">MRR (this period)</div>
            <div className="text-2xl font-bold text-white">${Number(dashboard.mrr_usd).toLocaleString()}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        {tiers.map(t => (
          <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-bold">{t.name}</span>
              <span className="text-emerald-400 text-sm">${Number(t.monthly_price_usd).toLocaleString()}<span className="text-gray-500 text-[10px]">/mo</span></span>
            </div>
            <div className="text-xs text-gray-400 mb-2">{Number(t.monthly_calls_included).toLocaleString()} calls / {t.rate_limit_rpm} rpm</div>
            <ul className="text-[10px] text-gray-400 space-y-0.5">
              {(t.features || []).map(f => <li key={f}>· {f}</li>)}
            </ul>
            {selectedAgent && (
              <button onClick={() => subscribe(t.name)} className="mt-3 w-full bg-gray-800 hover:bg-emerald-700 text-white text-xs py-1 rounded">Subscribe selected agent</button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Coins className="w-4 h-4 text-amber-400" />Per-tier breakdown</h3>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th>Tier</th><th className="text-right">Agents</th><th className="text-right">Calls</th><th className="text-right">$</th></tr></thead>
            <tbody>
              {dashboard?.by_tier.map(b => (
                <tr key={b.tier_name} className="border-b border-gray-800/60">
                  <td className="py-1 text-white">{b.tier_name}</td>
                  <td className="py-1 text-right">{b.active_agents}</td>
                  <td className="py-1 text-right text-gray-300">{Number(b.calls_this_period || 0).toLocaleString()}</td>
                  <td className="py-1 text-right text-emerald-400">${Number(b.revenue_accrued || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-violet-400" />Top spenders</h3>
          <ul className="space-y-1">
            {dashboard?.top_agents.map(a => (
              <li key={a.agent_id} onClick={() => setSelectedAgent(a.agent_id)} className={`text-xs p-2 rounded cursor-pointer ${selectedAgent === a.agent_id ? 'bg-violet-900/30 border border-violet-700' : 'bg-gray-800 hover:bg-gray-700'}`}>
                <div className="flex justify-between">
                  <span className="text-white truncate">{a.display_name}</span>
                  <span className="text-emerald-400">${Number(a.cost_accrued_usd).toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-gray-500">{Number(a.calls_used).toLocaleString()} calls</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-900 border border-violet-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-violet-400" />Current usage{usage && `: ${usage.agent.display_name}`}</h3>
          {usage ? (
            <>
              <div className="text-xs text-gray-400">{usage.period.start} → {usage.period.end} · tier <span className="text-violet-300">{usage.tier?.name || 'none'}</span></div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Calls</span><span>{Number(usage.usage.calls_used).toLocaleString()} / {Number(usage.tier?.monthly_calls_included || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded mt-1 overflow-hidden">
                  <div className={`h-2 ${usage.usage_pct >= 100 ? 'bg-red-500' : usage.usage_pct >= 85 ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usage.usage_pct, 100)}%` }} />
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{usage.usage_pct}% used</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800 rounded p-1.5"><div className="text-gray-400">Tokens</div><div className="text-white">{Number(usage.usage.tokens_used).toLocaleString()}</div></div>
                <div className="bg-gray-800 rounded p-1.5"><div className="text-gray-400">Cost $</div><div className="text-emerald-400">${Number(usage.usage.cost_accrued_usd).toFixed(2)}</div></div>
                <div className="bg-gray-800 rounded p-1.5"><div className="text-gray-400">Overage</div><div className="text-red-400">{usage.usage.overage_calls}</div></div>
                <div className="bg-gray-800 rounded p-1.5"><div className="text-gray-400">Throttled</div><div className="text-yellow-400">{usage.usage.throttled_count}</div></div>
              </div>
            </>
          ) : <div className="text-xs text-gray-500">Select a top spender to inspect.</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent billing events</h3>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-gray-400"><tr className="text-left border-b border-gray-800"><th>When</th><th>Agent</th><th>Type</th><th className="text-right">Units</th><th className="text-right">$</th></tr></thead>
              <tbody>
                {billing.map(b => (
                  <tr key={b.id} className="border-b border-gray-800/60">
                    <td className="py-1 text-gray-400">{new Date(b.occurred_at).toLocaleString()}</td>
                    <td className="py-1 text-white">{b.display_name || '—'}</td>
                    <td className="py-1 text-violet-300">{b.event_type}</td>
                    <td className="py-1 text-right text-gray-300">{Number(b.units).toLocaleString()}</td>
                    <td className="py-1 text-right text-emerald-400">${Number(b.amount_usd).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Current-period invoice</h3>
          {invoice ? (
            <>
              <div className="text-xs text-gray-400 mb-2">{invoice.agent.display_name} · {invoice.period.start} → {invoice.period.end}</div>
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-gray-400"><tr className="text-left border-b border-gray-800"><th>Event</th><th>Service</th><th className="text-right">Units</th><th className="text-right">$</th></tr></thead>
                <tbody>
                  {invoice.line_items.map((li: any, i: number) => (
                    <tr key={i} className="border-b border-gray-800/60">
                      <td className="py-1 text-white">{li.event_type}</td>
                      <td className="py-1 text-gray-400">{li.service_id || 'platform'}</td>
                      <td className="py-1 text-right">{Number(li.units).toLocaleString()}</td>
                      <td className="py-1 text-right text-emerald-400">${Number(li.amount_usd).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="py-2 text-right text-gray-400">Total</td><td className="py-2 text-right text-emerald-300 font-bold">${Number(invoice.total_usd).toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </>
          ) : <div className="text-xs text-gray-500">Select an agent above.</div>}
        </div>
      </div>
    </div>
  );
}
