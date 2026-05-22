import { useState } from 'react';
import { apiFetch } from '../api';

export default function AgentCompatMatrix() {
  const [payload, setPayload] = useState(JSON.stringify({ clients: [
    { name: 'LangGraph Agent', protocol: 'mcp', auth: 'oauth', version: '1.2.0' },
    { name: 'Legacy Bot', protocol: 'rest', auth: 'api_key', version: '0.8.4' }
  ], required: { protocol: 'mcp', auth: 'oauth', min_version: '1.0.0' } }, null, 2));
  const [result, setResult] = useState<any>(null);
  const run = async () => setResult(await apiFetch('/agent-compat/score', { method: 'POST', body: JSON.stringify(JSON.parse(payload)) }));
  return (
    <div className="p-8 text-white space-y-5">
      <h1 className="text-2xl font-bold">Agent Compatibility Matrix</h1>
      <textarea className="w-full h-64 bg-gray-900 border border-gray-800 rounded-lg p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} />
      <button className="px-4 py-2 rounded-lg bg-violet-600" onClick={run}>Score Compatibility</button>
      {result && <section className="bg-gray-900 border border-gray-800 rounded-lg p-5"><h2>{result.compatibleCount} compatible</h2>{result.clients.map((client: any) => <p key={client.name} className="text-gray-300">{client.name}: {client.compatible ? 'ready' : client.action}</p>)}</section>}
    </div>
  );
}
