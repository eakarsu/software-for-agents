import { useEffect, useState } from 'react';
import { UploadCloud, ListChecks, FileCode2, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { apiFetch, api } from '../api';

type Service = { id: number; name: string; description: string; category: string };
type Published = { id: number; slug: string; name: string; tools_count: number; pricing_model: string; category: string; manifest_url: string; tags: string[] };

const SAMPLE_SPEC = `{
  "openapi": "3.0.3",
  "info": { "title": "Acme Tasks API", "version": "1.0.0", "description": "Task tracker." },
  "servers": [{ "url": "https://api.acme.example/v1" }],
  "components": {
    "securitySchemes": { "ApiKey": { "type": "apiKey", "in": "header", "name": "Authorization" } }
  },
  "paths": {
    "/tasks": {
      "get": { "operationId": "listTasks", "summary": "List tasks", "parameters": [{ "name": "limit", "in": "query", "schema": { "type": "integer" } }], "responses": { "200": { "description": "ok", "content": { "application/json": { "example": { "tasks": [] } } } } } },
      "post": { "operationId": "createTask", "summary": "Create a task", "parameters": [{ "name": "Idempotency-Key", "in": "header", "schema": { "type": "string" } }], "requestBody": { "content": { "application/json": { "schema": { "type": "object", "properties": { "title": { "type": "string" } } }, "example": { "title": "Ship MCP" } } } }, "responses": { "201": { "description": "created" } } }
    },
    "/tasks/{id}": {
      "delete": { "operationId": "deleteTask", "summary": "Delete a task", "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }], "responses": { "204": { "description": "ok" } } }
    }
  }
}`;

export default function PublishAsMcp() {
  const [tab, setTab] = useState<'from-service' | 'from-openapi' | 'templates'>('from-service');
  const [services, setServices] = useState<Service[]>([]);
  const [published, setPublished] = useState<Published[]>([]);
  const [templates, setTemplates] = useState<any>(null);

  const [svcForm, setSvcForm] = useState({ service_id: '', slug: '', pricing_model: 'usage' });
  const [oaForm, setOaForm] = useState({ slug: 'acme-tasks-mcp', publisher: 'acme.example', pricing_model: 'byok', spec: SAMPLE_SPEC });

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function load() {
    const [s, p, t] = await Promise.all([
      api.services.list(),
      apiFetch('/publish-as-mcp/published'),
      apiFetch('/publish-as-mcp/templates')
    ]);
    setServices(s);
    setPublished(p);
    setTemplates(t);
  }
  useEffect(() => { load(); }, []);

  async function publishFromService(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    try {
      const r = await apiFetch('/publish-as-mcp/from-service', {
        method: 'POST',
        body: JSON.stringify({ service_id: Number(svcForm.service_id), slug: svcForm.slug, pricing_model: svcForm.pricing_model })
      });
      setResult(r);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function publishFromOpenapi(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setResult(null);
    try {
      const parsed = JSON.parse(oaForm.spec);
      const r = await apiFetch('/publish-as-mcp/from-openapi', {
        method: 'POST',
        body: JSON.stringify({ spec: parsed, slug: oaForm.slug, publisher: oaForm.publisher, pricing_model: oaForm.pricing_model })
      });
      setResult(r);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function lintOnly() {
    setError(''); setResult(null);
    try {
      const parsed = JSON.parse(oaForm.spec);
      const r = await apiFetch('/publish-as-mcp/lint', { method: 'POST', body: JSON.stringify({ spec: parsed }) });
      setResult({ lintOnly: true, lint: r });
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><UploadCloud className="w-6 h-6 text-violet-400" />Publish as MCP</h1>
        <p className="text-gray-400 text-sm mt-1">One-click wrap any service or OpenAPI 3.x spec into an MCP server agents can discover. Includes agent-friendliness linter.</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['from-service','from-openapi','templates'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={`text-xs px-3 py-1.5 rounded ${tab === k ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-300 hover:text-white'}`}>{k.replace('-', ' ')}</button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-7">
          {tab === 'from-service' && (
            <form onSubmit={publishFromService} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileCode2 className="w-4 h-4 text-violet-400" />Publish an existing service</h3>
              <div>
                <label className="text-xs text-gray-400">Service</label>
                <select required value={svcForm.service_id} onChange={e => setSvcForm({ ...svcForm, service_id: e.target.value })} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm">
                  <option value="">Select…</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Slug</label>
                  <input required value={svcForm.slug} onChange={e => setSvcForm({ ...svcForm, slug: e.target.value })} placeholder="my-service-mcp" className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Pricing model</label>
                  <select value={svcForm.pricing_model} onChange={e => setSvcForm({ ...svcForm, pricing_model: e.target.value })} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm">
                    <option>free</option><option>byok</option><option>usage</option><option>subscription</option>
                  </select>
                </div>
              </div>
              <button className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-3 py-1.5 rounded">Publish to registry</button>
            </form>
          )}

          {tab === 'from-openapi' && (
            <form onSubmit={publishFromOpenapi} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FileCode2 className="w-4 h-4 text-violet-400" />Wrap an OpenAPI 3.x spec</h3>
              <div className="grid grid-cols-3 gap-2">
                <input required value={oaForm.slug} onChange={e => setOaForm({ ...oaForm, slug: e.target.value })} placeholder="slug" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm font-mono" />
                <input required value={oaForm.publisher} onChange={e => setOaForm({ ...oaForm, publisher: e.target.value })} placeholder="publisher" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm" />
                <select value={oaForm.pricing_model} onChange={e => setOaForm({ ...oaForm, pricing_model: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm">
                  <option>free</option><option>byok</option><option>usage</option><option>subscription</option>
                </select>
              </div>
              <textarea rows={12} value={oaForm.spec} onChange={e => setOaForm({ ...oaForm, spec: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1.5 text-green-300 text-xs font-mono" />
              <div className="flex gap-2">
                <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-3 py-1.5 rounded">Lint + Publish</button>
                <button type="button" onClick={lintOnly} className="bg-gray-800 hover:bg-gray-700 text-violet-300 text-sm px-3 py-1.5 rounded">Lint only</button>
              </div>
            </form>
          )}

          {tab === 'templates' && templates && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><ListChecks className="w-4 h-4 text-violet-400" />Agent-friendly API templates</h3>
              <Template title="Auth scheme" body={templates.auth_scheme} />
              <Template title="Error envelope" body={templates.error_envelope} />
              <Template title="Idempotency header" body={templates.idempotency_header} />
              <Template title="Pagination" body={templates.pagination} />
              <Template title="Rate-limit headers" body={templates.rate_limit_headers} />
            </div>
          )}

          {error && <div className="mt-3 bg-red-900/30 border border-red-700/40 text-red-300 p-3 rounded text-xs flex items-start gap-2"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" />{error}</div>}

          {result && (
            <div className="mt-3 bg-gray-900 border border-violet-700 rounded-xl p-4">
              {result.lint && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-violet-300 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Lint score</h3>
                    <span className={`text-2xl font-bold ${result.lint.score >= 90 ? 'text-green-400' : result.lint.score >= 75 ? 'text-amber-300' : 'text-red-400'}`}>{result.lint.score}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{result.lint.op_count} operations analyzed</div>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {result.lint.findings.map((f: any, i: number) => (
                      <li key={i} className={`text-xs ${f.severity === 'error' ? 'text-red-400' : f.severity === 'warn' ? 'text-yellow-400' : 'text-gray-400'}`}>
                        <span className="font-mono">{f.code}</span> {f.path && <span className="text-gray-500">{f.method?.toUpperCase()} {f.path}</span>} — {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.published && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="text-sm text-white">Published <span className="font-mono text-violet-300">{result.published.slug}</span></div>
                  <div className="text-xs text-gray-400">{result.published.tools_count} tools · transport {result.published.transport} · pricing {result.published.pricing_model}</div>
                </div>
              )}
              {result.manifest && (
                <details className="mt-2 text-xs">
                  <summary className="text-violet-300 cursor-pointer">Generated MCP manifest</summary>
                  <pre className="mt-2 bg-gray-950 p-2 rounded max-h-72 overflow-auto text-green-300">{JSON.stringify(result.manifest, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-violet-400" />Published via this pipeline</h3>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {published.map(p => (
                <div key={p.id} className="bg-gray-800 rounded p-2 text-xs">
                  <div className="text-white font-medium">{p.name}</div>
                  <div className="text-gray-500 font-mono">{p.slug}</div>
                  <div className="text-gray-400">{p.tools_count} tools · {p.pricing_model}</div>
                </div>
              ))}
              {published.length === 0 && <div className="text-xs text-gray-500">Nothing published yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Template({ title, body }: { title: string; body: any }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded p-2">
      <div className="text-violet-300 font-semibold mb-1">{title}</div>
      <pre className="text-green-300 text-[10px] overflow-x-auto">{JSON.stringify(body, null, 2)}</pre>
    </div>
  );
}
