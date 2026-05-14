import { useState } from 'react';

// Feature: MCP Server Hosting
// Auto-scaffolded from audit gap (project: software-for-agents).

export default function GapMcpHosting() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult('');
    try {
      const token = localStorage.getItem('token') || '';
      const resp = await fetch('/api/gap-nonai-mcp-hosting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: input }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Request failed');
      setResult(data.result || JSON.stringify(data, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">MCP Server Hosting</h1>
        <p className="text-sm text-slate-500 mb-6">Audit feature (gap-nonai) for software-for-agents.</p>
        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Describe the input / context for this feature..."
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg"
          >
            {loading ? 'Running...' : 'Run MCP Server Hosting'}
          </button>
        </form>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Result</h2>
            <pre className="whitespace-pre-wrap text-sm text-slate-800">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
