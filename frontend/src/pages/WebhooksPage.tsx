import { useEffect, useState } from 'react';
import { Webhook, Plus, Trash2, Send, RefreshCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

type Sub = {
  id: number;
  name: string;
  url: string;
  event_types: string[];
  secret_preview: string | null;
  active: boolean;
  delivery_count: number;
  failure_count: number;
  last_delivery_at: string | null;
  last_status_code: number | null;
  created_at: string;
};

type Delivery = {
  id: number;
  subscription_id: number;
  event_type: string;
  status_code: number;
  duration_ms: number;
  delivered_at: string;
  response_preview: string;
};

export default function WebhooksPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[] });

  async function load() {
    setBusy(true); setErr(null);
    try {
      const [s, e] = await Promise.all([api.webhooks.list(), api.webhooks.eventTypes()]);
      setSubs(s);
      setEventTypes(e.event_types || []);
      if (s.length && selectedId == null) setSelectedId(s[0].id);
    } catch (e: any) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function loadDeliveries(id: number) {
    try {
      const r = await api.webhooks.deliveries(id, 50);
      setDeliveries(r.deliveries || []);
    } catch { setDeliveries([]); }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selectedId != null) loadDeliveries(selectedId); }, [selectedId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    setBusy(true); setErr(null);
    try {
      const created = await api.webhooks.create({
        name: form.name.trim(),
        url: form.url.trim(),
        secret: form.secret || undefined,
        event_types: form.events
      });
      setForm({ name: '', url: '', secret: '', events: [] });
      await load();
      setSelectedId(created.id);
    } catch (e: any) { setErr(e.message || String(e)); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this subscription?')) return;
    try {
      await api.webhooks.delete(id);
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (e: any) { setErr(e.message || String(e)); }
  }

  async function handleTest(id: number) {
    try {
      await api.webhooks.test(id, { event_type: 'execution.completed' });
      await loadDeliveries(id);
      await load();
    } catch (e: any) { setErr(e.message || String(e)); }
  }

  async function handleToggle(s: Sub) {
    try {
      await api.webhooks.update(s.id, { active: !s.active });
      await load();
    } catch (e: any) { setErr(e.message || String(e)); }
  }

  const selected = subs.find(s => s.id === selectedId) || null;

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Webhooks</h1>
            <p className="text-sm text-gray-400">Notify agents when registry events occur.</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {err && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-200">{err}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Create subscription</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Name (e.g. on-call alerts)"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <input
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://hooks.example.com/agent"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <input
                value={form.secret}
                onChange={e => setForm({ ...form, secret: e.target.value })}
                placeholder="HMAC secret (optional, only last 8 chars stored)"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <div>
                <div className="text-xs text-gray-400 mb-2">Event types ({form.events.length} selected)</div>
                <div className="flex flex-wrap gap-2">
                  {eventTypes.map(ev => {
                    const on = form.events.includes(ev);
                    return (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => setForm({
                          ...form,
                          events: on ? form.events.filter(x => x !== ev) : [...form.events, ev]
                        })}
                        className={`text-xs px-2 py-1 rounded-full border ${
                          on ? 'bg-violet-600 border-violet-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300'
                        }`}
                      >{ev}</button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 rounded-lg text-sm font-medium"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </form>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Subscriptions ({subs.length})</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {subs.length === 0 && (
                <div className="p-6 text-sm text-gray-500">No subscriptions yet. Create one above.</div>
              )}
              {subs.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-800/50 ${selectedId === s.id ? 'bg-gray-800/40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {s.active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-gray-500" />}
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.url}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {s.event_types.length} events · {s.delivery_count} deliveries
                        {s.last_status_code != null && ` · last ${s.last_status_code}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTest(s.id); }}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-violet-300"
                        title="Send test delivery"
                      ><Send className="w-4 h-4" /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(s); }}
                        className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                      >{s.active ? 'Disable' : 'Enable'}</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        className="p-2 bg-gray-800 hover:bg-red-900/40 rounded text-red-300"
                        title="Delete"
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Deliveries</h2>
            {selected && <div className="text-xs text-gray-500 mt-1">for {selected.name}</div>}
          </div>
          <div className="divide-y divide-gray-800 max-h-[600px] overflow-auto">
            {(!selected || deliveries.length === 0) && (
              <div className="p-4 text-sm text-gray-500">No deliveries to show.</div>
            )}
            {deliveries.map(d => (
              <div key={d.id} className="p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-gray-300">{d.event_type}</div>
                  <div className={`font-mono ${d.status_code < 400 ? 'text-green-400' : 'text-red-400'}`}>{d.status_code}</div>
                </div>
                <div className="text-gray-500 mt-0.5">
                  {new Date(d.delivered_at).toLocaleString()} · {d.duration_ms}ms
                </div>
                {d.response_preview && (
                  <div className="text-gray-400 mt-1 truncate">{d.response_preview}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
