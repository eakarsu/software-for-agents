import { useEffect, useState } from 'react';
import { Compass, FileJson, Tags, Code2, RefreshCcw, Copy } from 'lucide-react';
import { api } from '../api';

type Facet = { category?: string; auth_type?: string; status?: string; count: number };

export default function DiscoveryPage() {
  const [tab, setTab] = useState<'manifest' | 'facets' | 'tags' | 'snippets'>('manifest');
  const [manifest, setManifest] = useState<any>(null);
  const [facets, setFacets] = useState<any>(null);
  const [tags, setTags] = useState<any>(null);
  const [snippets, setSnippets] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setErr(null);
    try {
      const [m, f, t, s] = await Promise.all([
        api.discovery.manifest(),
        api.discovery.facets(),
        api.discovery.tags(),
        api.discovery.sdkSnippets()
      ]);
      setManifest(m); setFacets(f); setTags(t); setSnippets(s);
    } catch (e: any) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  const tabs: { key: typeof tab; label: string; icon: typeof Compass }[] = [
    { key: 'manifest', label: 'Manifest',     icon: FileJson },
    { key: 'facets',   label: 'Facets',       icon: Compass },
    { key: 'tags',     label: 'Tool tags',    icon: Tags },
    { key: 'snippets', label: 'SDK snippets', icon: Code2 }
  ];

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Discovery</h1>
            <p className="text-sm text-gray-400">Agent-first surface: manifest, facets, tags, SDK snippets.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {err && <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-200">{err}</div>}

      <div className="flex gap-2 mb-4 border-b border-gray-800">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 ${
              tab === key ? 'border-violet-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          ><Icon className="w-4 h-4" /> {label}</button>
        ))}
      </div>

      {busy && <div className="text-sm text-gray-400">Loading…</div>}

      {tab === 'manifest' && manifest && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold uppercase tracking-wider text-gray-400">Agent Manifest</div>
            <button
              onClick={() => copy(JSON.stringify(manifest, null, 2))}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
            ><Copy className="w-3 h-3" /> Copy JSON</button>
          </div>
          <pre className="text-xs text-gray-200 bg-gray-950 p-4 rounded overflow-auto max-h-[600px]">
{JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}

      {tab === 'facets' && facets?.services && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FacetCard title="By category" rows={facets.services.by_category} field="category" />
          <FacetCard title="By auth type" rows={facets.services.by_auth_type} field="auth_type" />
          <FacetCard title="By status" rows={facets.services.by_status} field="status" />
        </div>
      )}

      {tab === 'tags' && tags && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-sm text-gray-400 mb-3">Inferred from {tags.total_tools} tools by name prefix.</div>
          <div className="flex flex-wrap gap-2">
            {tags.tags.map((t: any) => (
              <span key={t.tag} className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full">
                <span className="font-mono text-violet-300">{t.tag}</span>
                <span className="text-gray-500 ml-2">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {tab === 'snippets' && snippets && (
        <div className="space-y-4">
          {snippets.languages.map((lang: string) => (
            <div key={lang} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold uppercase tracking-wider text-gray-400">{lang}</div>
                <button
                  onClick={() => copy(snippets.snippets[lang])}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded"
                ><Copy className="w-3 h-3" /> Copy</button>
              </div>
              <pre className="text-xs text-gray-200 bg-gray-950 p-3 rounded overflow-auto">
{snippets.snippets[lang]}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FacetCard({ title, rows, field }: { title: string; rows: Facet[]; field: keyof Facet }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</div>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-gray-500">No data.</div>}
        {rows.map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-200">{String(r[field] || '—')}</span>
              <span className="text-gray-500 font-mono">{r.count}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded">
              <div
                className="h-1.5 bg-violet-500 rounded"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
