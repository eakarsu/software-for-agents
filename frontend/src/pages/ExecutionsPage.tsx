import { useState, useEffect } from 'react';
import { Plus, Search, PlayCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../api';
import type { Execution, Tool } from '../types';

function ExecutionForm({ execution, tools, onSave, onCancel }: { execution?: Execution; tools: Tool[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    tool_id: execution?.tool_id || (tools[0]?.id || ''),
    input_params: execution?.input_params || '{}',
    output_preview: execution?.output_preview || '',
    status: execution?.status || 'success',
    duration_ms: execution?.duration_ms || 0,
    tokens_used: execution?.tokens_used || 0,
    cost_usd: execution?.cost_usd || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (execution) {
        await api.executions.update(execution.id, form);
      } else {
        await api.executions.create(form);
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">{execution ? 'Edit Execution' : 'New Execution'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Tool</label>
            <select value={form.tool_id} onChange={e => setForm({ ...form, tool_id: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {tools.map(t => <option key={t.id} value={t.id}>{t.name} ({t.service_name})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Input Params (JSON)</label>
            <textarea value={form.input_params} onChange={e => setForm({ ...form, input_params: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Output Preview</label>
            <textarea value={form.output_preview} onChange={e => setForm({ ...form, output_preview: e.target.value })} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['success','failed','timeout','cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Duration (ms)</label>
              <input type="number" value={form.duration_ms} onChange={e => setForm({ ...form, duration_ms: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
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

function ExecutionDetail({ execution, onEdit, onDelete, onClose }: { execution: Execution; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const statusColor = execution.status === 'success' ? 'text-green-400' : execution.status === 'failed' ? 'text-red-400' : 'text-yellow-400';
  return (
    <div className="bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">Execution #{execution.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Tool</p>
            <p className="text-violet-400 text-sm">{execution.tool_name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Status</p>
              <p className={`text-sm font-medium ${statusColor}`}>{execution.status}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Duration</p>
              <p className="text-white text-sm">{execution.duration_ms}ms</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Tokens</p>
              <p className="text-white text-sm">{execution.tokens_used}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Cost</p>
              <p className="text-white text-sm">${Number(execution.cost_usd).toFixed(4)}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Input Params</p>
            <pre className="text-xs text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap">{execution.input_params}</pre>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Output Preview</p>
            <p className="text-white text-xs">{execution.output_preview}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Time</p>
            <p className="text-white text-sm">{new Date(execution.created_at).toLocaleString()}</p>
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

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Execution | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Execution | undefined>(undefined);

  const load = async () => {
    const [execData, toolsData] = await Promise.all([api.executions.list(), api.tools.list()]);
    setExecutions(execData);
    setTools(toolsData);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this execution?')) return;
    await api.executions.delete(id);
    setSelected(null);
    load();
  };

  const filtered = executions.filter(e =>
    e.tool_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.status?.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Executions</h1>
            <p className="text-gray-400 text-sm mt-1">{executions.length} total executions</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Execution
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search executions..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-2">
          {filtered.map(e => (
            <div
              key={e.id}
              onClick={() => setSelected(e)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-700 ${selected?.id === e.id ? 'border-violet-600' : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">{e.tool_name}</span>
                      {statusIcon(e.status)}
                    </div>
                    <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-white">{e.duration_ms}ms</div>
                    <div className="text-xs text-gray-400">${Number(e.cost_usd).toFixed(4)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <ExecutionDetail
          execution={selected}
          onEdit={() => { setEditItem(selected); setShowForm(true); }}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && (
        <ExecutionForm
          execution={editItem}
          tools={tools}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
