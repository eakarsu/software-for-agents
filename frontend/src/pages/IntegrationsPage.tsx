import { useState, useEffect } from 'react';
import { Plus, Search, Link2, CheckCircle, PauseCircle } from 'lucide-react';
import { api } from '../api';
import type { Integration, Service } from '../types';

function IntegrationForm({ integration, services, onSave, onCancel }: { integration?: Integration; services: Service[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    service_id: integration?.service_id || (services[0]?.id || ''),
    api_key_preview: integration?.api_key_preview || '',
    status: integration?.status || 'active',
    plan: integration?.plan || 'free',
    calls_this_month: integration?.calls_this_month || 0,
    calls_this_week: integration?.calls_this_week || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (integration) {
        await api.integrations.update(integration.id, form);
      } else {
        await api.integrations.create(form);
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">{integration ? 'Edit Integration' : 'New Integration'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Service</label>
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">API Key Preview</label>
            <input value={form.api_key_preview} onChange={e => setForm({ ...form, api_key_preview: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="sk-****xxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['active','paused','expired','revoked'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Plan</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['free','basic','pro','enterprise'].map(p => <option key={p}>{p}</option>)}
              </select>
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

function IntegrationDetail({ integration, onEdit, onDelete, onClose }: { integration: Integration; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const isActive = integration.status === 'active';
  return (
    <div className="bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">{integration.service_name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Status</p>
              <p className={`text-sm font-medium ${isActive ? 'text-green-400' : 'text-yellow-400'}`}>{integration.status}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Plan</p>
              <p className="text-white text-sm">{integration.plan}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Calls/Month</p>
              <p className="text-white text-sm font-medium">{Number(integration.calls_this_month).toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Calls/Week</p>
              <p className="text-white text-sm font-medium">{Number(integration.calls_this_week).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">API Key</p>
            <p className="text-gray-300 text-sm font-mono">{integration.api_key_preview || '—'}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">Connected</p>
            <p className="text-white text-sm">{new Date(integration.connected_at).toLocaleDateString()}</p>
          </div>
          {integration.last_used && (
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Last Used</p>
              <p className="text-white text-sm">{new Date(integration.last_used).toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onEdit} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">Edit</button>
          <button onClick={onDelete} className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-400 text-sm font-medium py-2 rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Integration | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Integration | undefined>(undefined);

  const load = async () => {
    const [intData, svcData] = await Promise.all([api.integrations.list(), api.services.list()]);
    setIntegrations(intData);
    setServices(svcData);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this integration?')) return;
    await api.integrations.delete(id);
    setSelected(null);
    load();
  };

  const filtered = integrations.filter(i =>
    i.service_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.plan?.toLowerCase().includes(search.toLowerCase()) ||
    i.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Integrations</h1>
            <p className="text-gray-400 text-sm mt-1">{integrations.length} active integrations</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Integration
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search integrations..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-2">
          {filtered.map(i => (
            <div
              key={i.id}
              onClick={() => setSelected(i)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-700 ${selected?.id === i.id ? 'border-violet-600' : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                    {i.status === 'active' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <PauseCircle className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{i.service_name}</div>
                    <div className="text-xs text-gray-500">{i.plan} plan • {i.api_key_preview || 'no key'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{Number(i.calls_this_month).toLocaleString()}/mo</div>
                  <div className={`text-xs ${i.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>{i.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <IntegrationDetail
          integration={selected}
          onEdit={() => { setEditItem(selected); setShowForm(true); }}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && (
        <IntegrationForm
          integration={editItem}
          services={services}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
