import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';

type Connector = {
  id: string; name: string; status: string; last_synced_at?: string;
  freshness_age_seconds?: number; action_configured: boolean;
};
type Job = { id: string; status: string; action: string; attemptCount: number; errorCode?: string };
type Run = {
  id: string; status: string; answer?: { answer: string; confidence: number };
  citations: { documentId: string; quote: string; sourceUrl?: string }[];
  jobs: Job[]; latency_ms?: number; cost_usd?: string; error_code?: string;
};

export default function AgentWorkflowPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [question, setQuestion] = useState('');
  const [allowAction, setAllowAction] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tenantName, setTenantName] = useState('');

  const load = async () => {
    if (!localStorage.getItem('tenantId')) return;
    try { setConnectors(await api.workflow.connectors()); } catch (raw) { setError((raw as Error).message); }
  };
  useEffect(() => { void load(); }, []);

  const createTenant = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const tenant = await api.workflow.createTenant(tenantName);
      user.tenants = [...(user.tenants || []), tenant];
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenantId', tenant.id);
      window.location.reload();
    } catch (raw) { setError((raw as Error).message); } finally { setBusy(false); }
  };

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setRun(null);
    try {
      setRun(await api.workflow.ask({ question, allowAction }, crypto.randomUUID()));
    } catch (raw) { setError((raw as Error).message); } finally { setBusy(false); }
  };

  const decide = async (job: Job, decision: 'approve' | 'reject') => {
    setBusy(true); setError('');
    try {
      await api.workflow.decideJob(job.id, decision, `${decision}d from the operations console`);
      if (run) setRun(await api.workflow.getRun(run.id));
    } catch (raw) { setError((raw as Error).message); } finally { setBusy(false); }
  };

  if (!localStorage.getItem('tenantId')) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h1 className="text-xl font-semibold">Tenant setup required</h1>
          {user.role === 'admin' ? (
            <form onSubmit={createTenant} className="mt-4 flex gap-2">
              <input required value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="Tenant name" className="flex-1 rounded bg-gray-800 p-2" />
              <button disabled={busy} className="rounded bg-violet-600 px-4">Create</button>
            </form>
          ) : <p className="mt-3 text-gray-400">Ask a platform administrator to add your account to a tenant.</p>}
          {error && <p className="mt-3 text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header><h1 className="text-2xl font-semibold">Grounded agent workflow</h1><p className="mt-1 text-sm text-gray-400">Answers cite fresh, role-visible connector documents. Actions wait for a different human approver.</p></header>
        {error && <div className="rounded border border-red-800 bg-red-950/40 p-3 text-red-300">{error}</div>}
        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center justify-between"><h2 className="font-medium">Connector freshness</h2><button onClick={load} className="text-sm text-violet-300">Refresh</button></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {connectors.map((connector) => (
              <div key={connector.id} className="rounded border border-gray-800 bg-gray-950 p-3 text-sm">
                <div className="font-medium">{connector.name}</div>
                <div className="mt-1 text-gray-400">{connector.last_synced_at ? `Synced ${new Date(connector.last_synced_at).toLocaleString()}` : 'Never synced'} · {connector.status}</div>
                <div className="text-gray-500">Action delivery: {connector.action_configured ? 'configured' : 'not configured'}</div>
              </div>
            ))}
            {!connectors.length && <p className="text-sm text-gray-500">No connector has been provisioned and synced.</p>}
          </div>
        </section>
        <form onSubmit={ask} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <label className="text-sm font-medium">Question</label>
          <textarea required minLength={3} maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-2 h-28 w-full rounded border border-gray-700 bg-gray-950 p-3" placeholder="Ask about indexed operational knowledge" />
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={allowAction} onChange={(e) => setAllowAction(e.target.checked)} /> Allow a typed create-case proposal</label>
          <button disabled={busy} className="mt-4 rounded bg-violet-600 px-4 py-2 disabled:opacity-50">{busy ? 'Running…' : 'Run grounded answer'}</button>
        </form>
        {run && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="flex justify-between"><h2 className="font-medium">Run {run.status}</h2><span className="text-xs text-gray-400">{run.latency_ms || 0} ms · ${Number(run.cost_usd || 0).toFixed(6)}</span></div>
            <p className="mt-4 whitespace-pre-wrap text-gray-100">{run.answer?.answer}</p>
            <h3 className="mt-5 text-sm font-medium">Verified citations</h3>
            <ul className="mt-2 space-y-2 text-sm text-gray-300">{run.citations.map((citation, index) => <li key={`${citation.documentId}-${index}`} className="rounded bg-gray-950 p-3">“{citation.quote}” {citation.sourceUrl && <a className="ml-2 text-violet-300" href={citation.sourceUrl} target="_blank" rel="noreferrer">source</a>}</li>)}</ul>
            {run.jobs.map((job) => (
              <div key={job.id} className="mt-4 rounded border border-amber-800 bg-amber-950/30 p-3 text-sm">
                Action {job.action}: <strong>{job.status}</strong>
                {job.status === 'pending_approval' && (
                  <span className="ml-3"><button disabled={busy} onClick={() => decide(job, 'approve')} className="text-green-300">Approve</button><button disabled={busy} onClick={() => decide(job, 'reject')} className="ml-3 text-red-300">Reject</button></span>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
