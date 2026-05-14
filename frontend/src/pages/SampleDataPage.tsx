import { useState } from 'react';
import { Database, Server, Wrench, Link2, PlayCircle, BookOpen, BarChart2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../api';

type EntityKey = 'services' | 'tools' | 'integrations' | 'executions' | 'documentation' | 'usage_metrics';

interface EntityDef {
  key: EntityKey;
  label: string;
  icon: typeof Server;
  blurb: string;
}

const ENTITIES: EntityDef[] = [
  { key: 'services',      label: 'Services',      icon: Server,     blurb: 'Stripe, Slack, GitHub, Twilio, Notion, S3, OpenAI, HubSpot' },
  { key: 'tools',         label: 'Tools',         icon: Wrench,     blurb: 'create_charge, post_message, open_pull_request, send_sms, embed_text' },
  { key: 'integrations',  label: 'Integrations',  icon: Link2,      blurb: 'OAuth and API-key connections with usage counts' },
  { key: 'executions',    label: 'Executions',    icon: PlayCircle, blurb: 'Tool calls with inputs, outputs, latency, cost' },
  { key: 'documentation', label: 'Documentation', icon: BookOpen,   blurb: 'Getting-started, tutorials, guides, recipes' },
  { key: 'usage_metrics', label: 'Usage Metrics', icon: BarChart2,  blurb: '7 days of per-service call counts and latency' },
];

interface ResultState {
  status: 'success' | 'error';
  message: string;
  inserted?: number;
}

export default function SampleDataPage() {
  const [busy, setBusy]     = useState<EntityKey | null>(null);
  const [results, setResults] = useState<Record<EntityKey, ResultState | undefined>>({} as Record<EntityKey, ResultState | undefined>);
  const [counts, setCounts]   = useState<Record<EntityKey, number>>({
    services: 0, tools: 0, integrations: 0, executions: 0, documentation: 0, usage_metrics: 0,
  });
  const [toast, setToast]   = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const totalInserted = Object.values(counts).reduce((a, b) => a + b, 0);

  const showToast = (kind: 'success' | 'error', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  };

  const handleInsert = async (entity: EntityKey) => {
    setBusy(entity);
    try {
      const data = await api.admin.insertSampleData(entity);
      const inserted = Number(data.inserted ?? 0);
      setResults(r => ({ ...r, [entity]: { status: 'success', message: `Inserted ${inserted} rows`, inserted } }));
      setCounts(c => ({ ...c, [entity]: c[entity] + inserted }));
      showToast('success', `Inserted ${inserted} ${entity} rows`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setResults(r => ({ ...r, [entity]: { status: 'error', message: msg } }));
      showToast('error', `${entity}: ${msg}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-violet-400" />
            Sample Data
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Seed the database with realistic agent-software rows. Each button inserts 5-10 rows.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-right">
          <div className="text-xs text-gray-400">Total inserted this session</div>
          <div className="text-2xl font-bold text-violet-400">{totalInserted}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ENTITIES.map(({ key, label, icon: Icon, blurb }) => {
          const result = results[key];
          const isBusy = busy === key;
          return (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{label}</div>
                    <div className="text-xs text-gray-500">{blurb}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Inserted</div>
                  <div className="text-lg font-bold text-white">{counts[key]}</div>
                </div>
              </div>
              <button
                onClick={() => handleInsert(key)}
                disabled={isBusy}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Inserting...
                  </>
                ) : (
                  <>Insert sample {label.toLowerCase()}</>
                )}
              </button>
              {result && (
                <div
                  className={`mt-3 text-xs flex items-center gap-2 ${
                    result.status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{result.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.kind === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.kind === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6">
        Tip: insert <span className="text-gray-300">Services</span> first. Tools, integrations, documentation, and metrics
        reference existing services. Executions reference existing tools.
      </p>
    </div>
  );
}
