import { useEffect, useState } from 'react';
import { Server, Shield, Star, Download, Search, Box, ExternalLink } from 'lucide-react';
import { apiFetch } from '../api';

type McpServer = {
  id: number;
  slug: string;
  name: string;
  description: string;
  transport: string;
  mcp_version: string;
  tools_count: number;
  prompts_count: number;
  resources_count: number;
  publisher: string;
  publisher_verified: boolean;
  install_count: number;
  rating: number;
  pricing_model: string;
  category: string;
  tags: string[];
  source_url?: string;
  endpoint_url?: string;
};

type Stats = {
  protocolVersion: string;
  supportedTransports: string[];
  total_servers: number;
  total_installs: number;
  total_tools: number;
  avg_rating: number;
  verified_count: number;
  transports: { transport: string; count: number }[];
  top_servers: { slug: string; name: string; install_count: number; rating: number }[];
};

export default function McpRegistry() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<{ category: string; count: number; total_installs: number; avg_rating: number }[]>([]);
  const [filter, setFilter] = useState({ category: '', transport: '', pricing: '', q: '' });
  const [discover, setDiscover] = useState('');
  const [manifest, setManifest] = useState<any>(null);
  const [selected, setSelected] = useState<McpServer | null>(null);

  async function load() {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    const list = await apiFetch(`/mcp-registry/servers?${params}`);
    setServers(list);
    setStats(await apiFetch('/mcp-registry/stats'));
    setCategories(await apiFetch('/mcp-registry/categories'));
  }
  useEffect(() => { load(); }, [filter]);

  async function open(srv: McpServer) {
    setSelected(srv);
    const m = await apiFetch(`/mcp-registry/servers/${srv.slug}/manifest`);
    setManifest(m);
  }

  async function install(slug: string) {
    await apiFetch(`/mcp-registry/servers/${slug}/install`, { method: 'POST' });
    load();
  }

  async function runDiscover(e: React.FormEvent) {
    e.preventDefault();
    if (!discover.trim()) return;
    const r = await apiFetch('/mcp-registry/discover', { method: 'POST', body: JSON.stringify({ query: discover, limit: 6 }) });
    setServers(r.matches);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Server className="w-6 h-6 text-violet-400" />MCP Registry</h1>
          <p className="text-gray-400 text-sm mt-1">Model Context Protocol servers agents can discover, install, and call. Protocol version <span className="text-violet-300 font-mono">{stats?.protocolVersion}</span>.</p>
        </div>
        {stats && (
          <div className="grid grid-cols-4 gap-3 text-right">
            <Stat label="Servers" value={stats.total_servers} />
            <Stat label="Tools" value={stats.total_tools} />
            <Stat label="Installs" value={Number(stats.total_installs).toLocaleString()} />
            <Stat label="Verified" value={stats.verified_count} />
          </div>
        )}
      </div>

      <form onSubmit={runDiscover} className="mb-4 bg-gray-900 border border-violet-900/40 rounded-xl p-4 flex gap-3 items-center">
        <Search className="w-4 h-4 text-violet-400" />
        <input value={discover} onChange={e => setDiscover(e.target.value)} placeholder="Natural language: 'I need browser automation'..." className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <button className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded">Discover</button>
        <button type="button" onClick={() => { setDiscover(''); load(); }} className="text-gray-400 text-xs hover:text-white">Reset</button>
      </form>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
        </select>
        <select value={filter.transport} onChange={e => setFilter({ ...filter, transport: e.target.value })} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          <option value="">All transports</option>
          {stats?.supportedTransports.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filter.pricing} onChange={e => setFilter({ ...filter, pricing: e.target.value })} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white">
          <option value="">Any pricing</option>
          <option>free</option><option>byok</option><option>usage</option><option>subscription</option>
        </select>
        <input value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} placeholder="Search..." className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {servers.map(s => (
          <div key={s.id} onClick={() => open(s)} className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition hover:border-violet-700 ${selected?.slug === s.slug ? 'border-violet-600' : 'border-gray-800'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-700 to-indigo-700 rounded-lg flex items-center justify-center"><Box className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{s.name}</span>
                    {s.publisher_verified && <Shield className="w-3.5 h-3.5 text-green-400" />}
                  </div>
                  <div className="text-xs text-gray-500">{s.publisher} · <span className="text-violet-300">{s.transport}</span> · {s.pricing_model}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400 text-sm"><Star className="w-3.5 h-3.5" />{Number(s.rating).toFixed(1)}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1 justify-end"><Download className="w-3 h-3" />{Number(s.install_count).toLocaleString()}</div>
              </div>
            </div>
            <p className="text-sm text-gray-300 mt-3 line-clamp-2">{s.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1 flex-wrap">
                {(s.tags || []).slice(0, 3).map(t => <span key={t} className="text-[10px] uppercase bg-gray-800 text-gray-400 rounded px-1.5 py-0.5">{t}</span>)}
              </div>
              <div className="text-xs text-gray-500">{s.tools_count} tools</div>
            </div>
          </div>
        ))}
      </div>

      {selected && manifest && (
        <div className="mt-6 bg-gray-950 border border-violet-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">{selected.name} — MCP Manifest</h2>
            <div className="flex gap-2">
              <button onClick={() => install(selected.slug)} className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1"><Download className="w-3 h-3" />Install</button>
              {selected.source_url && <a href={selected.source_url} target="_blank" rel="noreferrer" className="text-violet-300 hover:text-violet-200 text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" />Source</a>}
              <button onClick={() => { setSelected(null); setManifest(null); }} className="text-gray-400 hover:text-white text-xs">Close</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <Field k="Protocol" v={manifest.protocolVersion} />
            <Field k="Transport" v={manifest.transport?.type} />
            <Field k="Pricing" v={manifest.pricing?.model} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 max-h-96 overflow-auto">
            <h3 className="text-sm font-semibold text-violet-300 mb-2">Tools ({(manifest.tools || []).length})</h3>
            <ul className="space-y-2">
              {(manifest.tools || []).map((t: any) => (
                <li key={t.name} className="text-xs">
                  <div className="text-white font-mono">{t.name} <span className="text-gray-500">{t.annotations?.readOnlyHint ? '· read-only' : ''}{t.annotations?.destructiveHint ? ' · destructive' : ''}</span></div>
                  <div className="text-gray-400 mt-0.5">{t.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"><div className="text-xs text-gray-400">{label}</div><div className="text-white font-bold text-sm">{value}</div></div>;
}
function Field({ k, v }: { k: string; v: any }) {
  return <div className="bg-gray-900 border border-gray-800 rounded-lg p-3"><div className="text-xs text-gray-400">{k}</div><div className="text-white text-sm font-mono">{String(v ?? '—')}</div></div>;
}
