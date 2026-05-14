import { useState, useEffect } from 'react';
import { Plus, Search, BarChart2 } from 'lucide-react';
import { api } from '../api';
import type { UsageMetric, Service } from '../types';

function MetricForm({ metric, services, onSave, onCancel }: { metric?: UsageMetric; services: Service[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    service_id: metric?.service_id || (services[0]?.id || ''),
    metric_date: metric?.metric_date ? metric.metric_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    total_calls: metric?.total_calls || 0,
    success_calls: metric?.success_calls || 0,
    failed_calls: metric?.failed_calls || 0,
    avg_latency_ms: metric?.avg_latency_ms || 0,
    p99_latency_ms: metric?.p99_latency_ms || 0,
    unique_users: metric?.unique_users || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (metric) {
        await api.metrics.update(metric.id, form);
      } else {
        await api.metrics.create(form);
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">{metric ? 'Edit Metric' : 'New Metric'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Service</label>
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Date</label>
            <input type="date" value={form.metric_date} onChange={e => setForm({ ...form, metric_date: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Total Calls</label>
              <input type="number" value={form.total_calls} onChange={e => setForm({ ...form, total_calls: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Success Calls</label>
              <input type="number" value={form.success_calls} onChange={e => setForm({ ...form, success_calls: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Failed Calls</label>
              <input type="number" value={form.failed_calls} onChange={e => setForm({ ...form, failed_calls: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Unique Users</label>
              <input type="number" value={form.unique_users} onChange={e => setForm({ ...form, unique_users: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Avg Latency (ms)</label>
              <input type="number" value={form.avg_latency_ms} onChange={e => setForm({ ...form, avg_latency_ms: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">P99 Latency (ms)</label>
              <input type="number" value={form.p99_latency_ms} onChange={e => setForm({ ...form, p99_latency_ms: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">Save</button>
            <button type="button" onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MetricDetail({ metric, onEdit, onDelete, onClose }: { metric: UsageMetric; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const successRate = metric.total_calls > 0 ? ((metric.success_calls / metric.total_calls) * 100).toFixed(1) : '0';
  return (
    <div className="bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">{metric.service_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Date</p>
            <p className="text-white text-sm">{new Date(metric.metric_date).toLocaleDateString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Total Calls</p>
              <p className="text-white text-sm font-medium">{metric.total_calls?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Success Rate</p>
              <p className="text-green-400 text-sm font-medium">{successRate}%</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Success</p>
              <p className="text-green-400 text-sm">{metric.success_calls?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Failed</p>
              <p className="text-red-400 text-sm">{metric.failed_calls?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Avg Latency</p>
              <p className="text-white text-sm">{metric.avg_latency_ms}ms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">P99 Latency</p>
              <p className="text-white text-sm">{metric.p99_latency_ms}ms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 col-span-2">
              <p className="text-gray-400 text-xs">Unique Users</p>
              <p className="text-white text-sm">{metric.unique_users?.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onEdit} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">Edit</button>
          <button onClick={onDelete} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-400 text-sm font-medium py-2 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<UsageMetric[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UsageMetric | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<UsageMetric | undefined>(undefined);

  const load = async () => {
    const [metricsData, svcData] = await Promise.all([api.metrics.list(), api.services.list()]);
    setMetrics(metricsData);
    setServices(svcData);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this metric?')) return;
    await api.metrics.delete(id);
    setSelected(null);
    load();
  };

  const filtered = metrics.filter(m =>
    m.service_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Usage Metrics</h1>
            <p className="text-gray-400 text-sm mt-1">{metrics.length} metric records</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Metric
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search metrics..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-2">
          {filtered.map(m => (
            <div
              key={m.id}
              onClick={() => setSelected(m)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-700 ${selected?.id === m.id ? 'border-violet-600' : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{m.service_name}</div>
                    <div className="text-xs text-gray-500">{new Date(m.metric_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-white">{m.total_calls?.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">total calls</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-400">{m.avg_latency_ms}ms</div>
                    <div className="text-xs text-gray-400">avg latency</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <MetricDetail
          metric={selected}
          onEdit={() => { setEditItem(selected); setShowForm(true); }}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && (
        <MetricForm
          metric={editItem}
          services={services}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
