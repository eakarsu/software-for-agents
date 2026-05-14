const BASE = '/api';

function headers() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: headers() });
  if (!res.ok) {
    let msg = `API error: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch (_) {}
    if (res.status === 503) throw new Error(`Service unavailable: ${msg}`);
    throw new Error(msg);
  }
  return res.json();
}

export async function apiDownload(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Download error: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  services: {
    list: () => apiFetch('/services'),
    get: (id: number) => apiFetch(`/services/${id}`),
    create: (data: object) => apiFetch('/services', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/services/${id}`, { method: 'DELETE' })
  },
  tools: {
    list: () => apiFetch('/tools'),
    get: (id: number) => apiFetch(`/tools/${id}`),
    create: (data: object) => apiFetch('/tools', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/tools/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/tools/${id}`, { method: 'DELETE' })
  },
  integrations: {
    list: () => apiFetch('/integrations'),
    get: (id: number) => apiFetch(`/integrations/${id}`),
    create: (data: object) => apiFetch('/integrations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/integrations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/integrations/${id}`, { method: 'DELETE' })
  },
  executions: {
    list: () => apiFetch('/executions'),
    get: (id: number) => apiFetch(`/executions/${id}`),
    create: (data: object) => apiFetch('/executions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/executions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/executions/${id}`, { method: 'DELETE' })
  },
  documentation: {
    list: () => apiFetch('/documentation'),
    get: (id: number) => apiFetch(`/documentation/${id}`),
    create: (data: object) => apiFetch('/documentation', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/documentation/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/documentation/${id}`, { method: 'DELETE' })
  },
  metrics: {
    list: () => apiFetch('/metrics'),
    get: (id: number) => apiFetch(`/metrics/${id}`),
    create: (data: object) => apiFetch('/metrics', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: object) => apiFetch(`/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch(`/metrics/${id}`, { method: 'DELETE' })
  },
  ai: {
    discoverServices: (task_description: string) =>
      apiFetch('/ai/discover-services', { method: 'POST', body: JSON.stringify({ task_description }) }),
    generateDocs: (service_id: number, tool_name: string) =>
      apiFetch('/ai/generate-docs', { method: 'POST', body: JSON.stringify({ service_id, tool_name }) }),
    debugExecution: (execution_id: number, error: string) =>
      apiFetch('/ai/debug-execution', { method: 'POST', body: JSON.stringify({ execution_id, error }) }),
    integrationGuide: (service_name: string, use_case: string, language: string) =>
      apiFetch('/ai/integration-guide', { method: 'POST', body: JSON.stringify({ service_name, use_case, language }) }),
    recommendTools: (goal: string, max_results?: number) =>
      apiFetch('/ai/recommend-tools', { method: 'POST', body: JSON.stringify({ goal, max_results }) }),
    integrationHealth: (integration_id: number) =>
      apiFetch('/ai/integration-health', { method: 'POST', body: JSON.stringify({ integration_id }) }),
    capabilityGap: (workflow_description: string) =>
      apiFetch('/ai/capability-gap', { method: 'POST', body: JSON.stringify({ workflow_description }) }),
    critiquePrompt: (prompt_text: string, target_use: string) =>
      apiFetch('/ai/critique-prompt', { method: 'POST', body: JSON.stringify({ prompt_text, target_use }) }),
    nlToToolCall: (instruction: string) =>
      apiFetch('/ai/nl-to-toolcall', { method: 'POST', body: JSON.stringify({ instruction }) })
  },
  utility: {
    exportCsv: (entity: string) => apiDownload(`/utility/export/${entity}`, `${entity}.csv`),
    search: (params: { q?: string; entity?: string; status?: string; category?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
      return apiFetch(`/utility/search?${qs.toString()}`);
    },
    auditList: (params?: { action?: string; entity?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
      return apiFetch(`/utility/audit?${qs.toString()}`);
    },
    auditCreate: (data: { action: string; entity?: string; entity_id?: number; details?: string }) =>
      apiFetch('/utility/audit', { method: 'POST', body: JSON.stringify(data) })
  },
  admin: {
    insertSampleData: (entity: string) =>
      apiFetch(`/admin/sample-data/${entity}`, { method: 'POST' })
  },
  dashboard: {
    stats: () => apiFetch('/dashboard/stats')
  }
};
