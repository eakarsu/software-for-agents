import { useState, useEffect } from 'react';
import { Download, Search, ScrollText } from 'lucide-react';
import { api } from '../api';

type TabId = 'export' | 'search' | 'audit';

interface AuditEntry {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

interface SearchHit {
  entity: string;
  id: number;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
  service_name?: string;
  tool_name?: string;
  plan?: string;
  duration_ms?: number;
  created_at?: string;
  calls_this_month?: number;
}

const EXPORT_ENTITIES = [
  'services', 'tools', 'integrations', 'executions', 'documentation', 'usage_metrics', 'audit_log',
];

export default function UtilityPage() {
  const [tab, setTab] = useState<TabId>('export');

  // Export
  const [exportEntity, setExportEntity] = useState('services');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Search
  const [q, setQ] = useState('');
  const [searchEntity, setSearchEntity] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Audit
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditAction, setAuditAction] = useState('');
  const [auditEntity, setAuditEntity] = useState('');
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await api.utility.exportCsv(exportEntity);
      await api.utility.auditCreate({ action: 'export_csv_ui', entity: exportEntity, details: 'frontend trigger' });
    } catch (e: any) {
      setExportError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const data = await api.utility.search({
        q,
        entity: searchEntity,
        status: statusFilter,
        category: categoryFilter,
      });
      setHits(data.results || []);
    } catch (err: any) {
      setSearchError(err?.message || 'Search failed');
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const loadAudit = async () => {
    setAuditError(null);
    try {
      const data = await api.utility.auditList({ action: auditAction, entity: auditEntity, limit: 200 });
      setAudit(data);
    } catch (err: any) {
      setAuditError(err?.message || 'Failed to load audit log');
    }
  };

  useEffect(() => {
    if (tab === 'audit') loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'export', label: 'CSV Export', icon: Download },
    { id: 'search', label: 'Search & Filter', icon: Search },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Utilities</h1>
        <p className="text-gray-400 text-sm">CSV export, cross-entity search, and audit log.</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'export' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Export to CSV</h2>
          <p className="text-gray-400 text-sm mb-4">Download a snapshot of any entity as a CSV file.</p>
          <div className="flex items-center gap-3">
            <select
              value={exportEntity}
              onChange={e => setExportEntity(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {EXPORT_ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
            </select>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Download CSV'}
            </button>
          </div>
          {exportError && <p className="text-red-400 text-sm mt-3">{exportError}</p>}
        </div>
      )}

      {tab === 'search' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Search and Filter</h2>
          <p className="text-gray-400 text-sm mb-4">Search across services, tools, integrations and executions.</p>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search query..."
              className="md:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={searchEntity}
              onChange={e => setSearchEntity(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All entities</option>
              <option value="services">Services</option>
              <option value="tools">Tools</option>
              <option value="integrations">Integrations</option>
              <option value="executions">Executions</option>
            </select>
            <input
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              placeholder="Status filter..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              placeholder="Category filter..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="md:col-span-5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
          {searchError && <p className="text-red-400 text-sm mb-3">{searchError}</p>}
          <div className="space-y-2">
            {hits.length === 0 && !searching && (
              <p className="text-gray-500 text-sm">No results yet — try a query.</p>
            )}
            {hits.map((h, i) => (
              <div key={`${h.entity}-${h.id}-${i}`} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-violet-400 mr-2">{h.entity}</span>
                    <span className="text-white font-medium text-sm">{h.name || h.tool_name || h.service_name || `#${h.id}`}</span>
                  </div>
                  <span className="text-xs text-gray-500">id {h.id}</span>
                </div>
                {h.description && <p className="text-gray-400 text-xs mt-1">{h.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  {h.category && <span>cat: {h.category}</span>}
                  {h.status && <span>status: {h.status}</span>}
                  {h.plan && <span>plan: {h.plan}</span>}
                  {h.service_name && h.entity !== 'services' && <span>service: {h.service_name}</span>}
                  {typeof h.duration_ms === 'number' && <span>{h.duration_ms}ms</span>}
                  {h.created_at && <span>{new Date(h.created_at).toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Audit Log</h2>
              <p className="text-gray-400 text-sm">Recent privileged actions (exports, searches, custom events).</p>
            </div>
            <button
              onClick={loadAudit}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              value={auditAction}
              onChange={e => setAuditAction(e.target.value)}
              placeholder="Filter by action (e.g. export_csv)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              value={auditEntity}
              onChange={e => setAuditEntity(e.target.value)}
              placeholder="Filter by entity (e.g. services)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={loadAudit}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filters
            </button>
          </div>
          {auditError && <p className="text-red-400 text-sm mb-3">{auditError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2 pr-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id} className="border-b border-gray-800/50">
                    <td className="py-2 pr-3 text-gray-400">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-white">{a.user_email || '-'}</td>
                    <td className="py-2 pr-3 text-violet-300">{a.action}</td>
                    <td className="py-2 pr-3 text-gray-300">{a.entity || '-'}{a.entity_id ? ` #${a.entity_id}` : ''}</td>
                    <td className="py-2 pr-3 text-gray-400">{a.details || ''}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={5} className="py-3 text-gray-500 text-center">No audit entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
