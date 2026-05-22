import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { BarChart3 } from 'lucide-react';

type Series = {
  service: string;
  total: number;
  capabilities: Record<string, number>;
};
type Resp = {
  generated_at: string;
  buckets: string[];
  max: number;
  series: Series[];
};

const COLORS: Record<string, string> = {
  read:   'bg-sky-500',
  write:  'bg-emerald-500',
  invoke: 'bg-violet-500',
  search: 'bg-amber-500',
  auth:   'bg-rose-500',
  admin:  'bg-fuchsia-500'
};

export default function AgentCapabilityChart() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiFetch('/custom-views/agent-capability-chart')
      .then(setData)
      .catch(e => setErr(String(e.message || e)));
  }, []);

  if (err) return <div className="text-red-400 text-sm">Error: {err}</div>;
  if (!data) return <div className="text-gray-500 text-sm">Loading capability chart…</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <h2 className="text-white font-semibold">Agent Capability Chart</h2>
        <span className="ml-auto text-xs text-gray-500">{data.series.length} services</span>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        {data.buckets.map(b => (
          <div key={b} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-3 h-3 rounded-sm ${COLORS[b] || 'bg-gray-500'}`} />
            {b}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {data.series.map(row => (
          <div key={row.service} className="flex items-center gap-3">
            <div className="w-40 text-xs text-gray-300 truncate" title={row.service}>{row.service}</div>
            <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden flex">
              {data.buckets.map(b => {
                const v = row.capabilities[b] || 0;
                const pct = data.max > 0 ? (v / data.max) * 100 : 0;
                return (
                  <div
                    key={b}
                    className={COLORS[b] || 'bg-gray-500'}
                    style={{ width: `${pct}%` }}
                    title={`${b}: ${v}`}
                  />
                );
              })}
            </div>
            <div className="w-10 text-right text-xs text-gray-400 tabular-nums">{row.total}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
