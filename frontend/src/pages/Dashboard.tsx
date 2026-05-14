import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Server, Wrench, Link2, PlayCircle, BookOpen,
  Sparkles, Database, Activity, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { api } from '../api';

interface Kpis {
  services_registered: number;
  tools_available: number;
  integrations_active: number;
  executions_today: number;
  doc_snippets: number;
}

interface AuditRow {
  id: number;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

interface ExecStatusRow { status: string; n: number; }
interface TopServiceRow { service_name: string; calls: number; }

interface Stats {
  kpis: Kpis;
  recent_activity: AuditRow[];
  executions_by_status: ExecStatusRow[];
  top_services: TopServiceRow[];
  generated_at: string;
}

const KPI_DEFS: { key: keyof Kpis; label: string; icon: typeof Server; color: string }[] = [
  { key: 'services_registered', label: 'Services registered', icon: Server,     color: 'text-violet-400' },
  { key: 'tools_available',     label: 'Tools available',     icon: Wrench,     color: 'text-indigo-400' },
  { key: 'integrations_active', label: 'Integrations active', icon: Link2,      color: 'text-green-400'  },
  { key: 'executions_today',    label: 'Executions today',    icon: PlayCircle, color: 'text-amber-400'  },
  { key: 'doc_snippets',        label: 'Doc snippets',        icon: BookOpen,   color: 'text-sky-400'    },
];

const QUICK_ACTIONS = [
  { to: '/ai-center',    label: 'AI Center',    blurb: 'Discover, debug, recommend tools',  icon: Sparkles, accent: 'from-violet-600 to-indigo-600' },
  { to: '/services',     label: 'Services',     blurb: 'Browse the registry',                icon: Server,   accent: 'from-gray-700 to-gray-800' },
  { to: '/tools',        label: 'Tools',        blurb: 'Catalog of callable tools',          icon: Wrench,   accent: 'from-gray-700 to-gray-800' },
  { to: '/sample-data',  label: 'Sample Data',  blurb: 'Seed realistic agent rows',          icon: Database, accent: 'from-gray-700 to-gray-800' },
];

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60)    return `${Math.floor(diff)}s ago`;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.dashboard.stats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalExecs = stats?.executions_by_status.reduce((a, r) => a + r.n, 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-violet-400" />
            Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            AgentHub at a glance &mdash; registry health, today's activity, and quick actions.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-violet-500 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-950 border border-red-800 text-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Couldn&rsquo;t load dashboard</div>
            <div className="text-sm text-red-400 mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {KPI_DEFS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">
              {loading ? <span className="text-gray-600">&mdash;</span> : (stats?.kpis[key] ?? 0)}
            </div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(({ to, label, blurb, icon: Icon, accent }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`text-left bg-gradient-to-br ${accent} border border-gray-800 hover:border-violet-500 rounded-xl p-4 transition-colors`}
            >
              <Icon className="w-5 h-5 text-white mb-3" />
              <div className="font-semibold text-white">{label}</div>
              <div className="text-xs text-gray-200 mt-1 opacity-80">{blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Recent activity
            </h2>
            <span className="text-xs text-gray-500">audit_log &middot; latest 10</span>
          </div>
          {loading && !stats ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : stats && stats.recent_activity.length === 0 ? (
            <div className="text-sm text-gray-500">
              No audit events yet. Try the <button className="text-violet-400 hover:underline" onClick={() => navigate('/utility')}>Utilities</button> page or seed{' '}
              <button className="text-violet-400 hover:underline" onClick={() => navigate('/sample-data')}>sample data</button>.
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {stats?.recent_activity.map(r => (
                <li key={r.id} className="py-2.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-white">
                      <span className="font-medium">{r.action}</span>
                      {r.entity && (
                        <span className="text-gray-500"> &middot; {r.entity}{r.entity_id ? `#${r.entity_id}` : ''}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {r.user_email || 'system'}{r.details ? ` &middot; ${r.details}` : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">{formatTime(r.created_at)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side panel: exec status + top services */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">Today&rsquo;s executions</h2>
            {loading && !stats ? (
              <div className="text-sm text-gray-500">&mdash;</div>
            ) : (
              <>
                <div className="text-3xl font-bold text-white mb-3">{totalExecs}</div>
                <div className="space-y-1.5">
                  {stats?.executions_by_status.length === 0 && (
                    <div className="text-xs text-gray-500">No executions in the last 24h.</div>
                  )}
                  {stats?.executions_by_status.map(s => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span className={`capitalize ${s.status === 'success' ? 'text-green-400' : s.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                        {s.status}
                      </span>
                      <span className="text-gray-300 font-medium">{s.n}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">Top services (7d)</h2>
            {loading && !stats ? (
              <div className="text-sm text-gray-500">&mdash;</div>
            ) : stats && stats.top_services.length === 0 ? (
              <div className="text-xs text-gray-500">No execution data yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {stats?.top_services.map(t => (
                  <li key={t.service_name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate">{t.service_name}</span>
                    <span className="text-violet-400 font-medium">{t.calls}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className="text-xs text-gray-600 mt-6">
          Generated {new Date(stats.generated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
}
