import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen } from 'lucide-react';
import { api } from '../api';
import type { Documentation, Service } from '../types';

function DocForm({ doc, services, onSave, onCancel }: { doc?: Documentation; services: Service[]; onSave: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    service_id: doc?.service_id || (services[0]?.id || ''),
    section: doc?.section || 'overview',
    title: doc?.title || '',
    content: doc?.content || '',
    code_examples: doc?.code_examples || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (doc) {
        await api.documentation.update(doc.id, form);
      } else {
        await api.documentation.create(form);
      }
      onSave();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">{doc ? 'Edit Doc' : 'New Doc'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Service</label>
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: Number(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Section</label>
              <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {['overview','authentication','quickstart','tools','errors','changelog'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Content</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Code Examples</label>
            <textarea value={form.code_examples} onChange={e => setForm({ ...form, code_examples: e.target.value })} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
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

function DocDetail({ doc, onEdit, onDelete, onClose }: { doc: Documentation; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <div className="bg-gray-900 border-l border-gray-800 w-96 flex-shrink-0 overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white text-lg">{doc.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Service</p>
              <p className="text-violet-400 text-sm">{doc.service_name}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Section</p>
              <p className="text-white text-sm">{doc.section}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Views</p>
              <p className="text-white text-sm">{doc.views?.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs">Updated</p>
              <p className="text-white text-sm">{new Date(doc.last_updated).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-2">Content</p>
            <p className="text-gray-200 text-sm leading-relaxed">{doc.content}</p>
          </div>
          {doc.code_examples && (
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-2">Code Example</p>
              <pre className="text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">{doc.code_examples}</pre>
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

export default function DocumentationPage() {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Documentation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Documentation | undefined>(undefined);

  const load = async () => {
    const [docsData, svcData] = await Promise.all([api.documentation.list(), api.services.list()]);
    setDocs(docsData);
    setServices(svcData);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this doc?')) return;
    await api.documentation.delete(id);
    setSelected(null);
    load();
  };

  const filtered = docs.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.service_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.section?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Documentation</h1>
            <p className="text-gray-400 text-sm mt-1">{docs.length} doc entries</p>
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true); }} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Doc
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search docs..." className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div className="space-y-2">
          {filtered.map(d => (
            <div
              key={d.id}
              onClick={() => setSelected(d)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-700 ${selected?.id === d.id ? 'border-violet-600' : 'border-gray-800'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{d.title}</div>
                    <div className="text-xs text-gray-500">{d.service_name} • {d.section}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white">{d.views?.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">views</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && (
        <DocDetail
          doc={selected}
          onEdit={() => { setEditItem(selected); setShowForm(true); }}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
      {showForm && (
        <DocForm
          doc={editItem}
          services={services}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
