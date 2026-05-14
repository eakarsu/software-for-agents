import { useState, useEffect } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import { api } from '../api';
import type { Tool, Service } from '../types';

function ToolForm({ tool, services, onSave, onCancel }: { tool?: Tool; services: Service[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    service_id: tool?.service_id || (services[0]?.id || ''),
    name: tool?.name || '',
    description: tool?.description || '',
    input_schema: tool?.input_schema || '{}',
    output_schema: tool?.output_schema || '{}',
    example_input: tool?.example_input || '{}',
    example_output: tool?.example_output || '{}',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (tool) {
        await api.tools.update(tool.id, form);
      } else {
        await api.tools.create(form);
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">{tool ? 'Edit Tool' : 'New Tool'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Service</label>
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Tool Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" required />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Input Schema (JSON)</label>
            <textarea value={form.input_schema} onChange={e => setForm({ ...form, input_schema: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Example Input (JSON)</label>
            <textarea value={form.example_input} onChange={e => setForm({ ...form, example_input: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
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

function ToolDetail({ tool, onEdit, onDelete, onClose }: { tool: Tool; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <div className="bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">{tool.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Service</p>
            <p className="text-violet-400 text-sm">{tool.service_name}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Description</p>
            <p className="text-white text-sm">{tool.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Calls</p>
              <p className="text-white text-sm font-medium">{Number(tool.call_count).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Success</p>
              <p className="text-green-400 text-sm font-medium">{Number(tool.success_rate).toFixed(1)}%</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Latency</p>
              <p className="text-white text-sm font-medium">{tool.avg_latency_ms}ms</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Input Schema</p>
            <pre className="text-xs text-green-300 font-mono overflow-x-auto">{tool.input_schema}</pre>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Example Input</p>
            <pre className="text-xs text-blue-300 font-mono overflow-x-auto">{tool.example_input}</pre>
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

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Tool | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Tool | undefined>(undefined);

  const load = async () => {
    const [toolsData, servicesData] = await Promise.all([api.tools.list(), api.services.list()]);
    setTools(toolsData);
    setServices(servicesData);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tool?')) return;
    await api.tools.delete(id);
    setSelected(null);
    load();
  };

  const filtered = tools.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.service_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Tools</h1>
            <p className="text-gray-400 text-sm mt-1">{tools.length} tools available</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Tool
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-2">
          {filtered.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-700 ${selected?.id === t.id ? 'border-violet-600' : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.service_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Success</div>
                    <div className="text-sm text-green-400">{Number(t.success_rate).toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Calls</div>
                    <div className="text-sm text-white">{Number(t.call_count).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <ToolDetail
          tool={selected}
          onEdit={() => { setEditItem(selected); setShowForm(true); }}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && (
        <ToolForm
          tool={editItem}
          services={services}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
