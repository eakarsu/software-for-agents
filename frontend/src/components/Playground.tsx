import { useState } from 'react'

type Param = { key: string; value: string }

const services = ['Web Search', 'Memory Store', 'Code Interpreter', 'Document Reader', 'Database Query', 'Email Sender', 'Calendar Manager', 'Task Executor']

const toolsByService: Record<string, string[]> = {
  'Web Search': ['search_web', 'get_page', 'news_search'],
  'Memory Store': ['store_memory', 'recall_memory', 'semantic_search'],
  'Code Interpreter': ['run_python', 'run_js', 'run_bash', 'install_package'],
  'Document Reader': ['parse_pdf', 'parse_docx', 'extract_tables'],
  'Database Query': ['sql_query', 'nosql_find', 'schema_inspect'],
  'Email Sender': ['send_email', 'send_bulk', 'create_template'],
  'Calendar Manager': ['get_events', 'create_event', 'find_slot'],
  'Task Executor': ['run_task', 'schedule_task', 'get_task_status'],
}

const mockResponses: Record<string, unknown> = {
  'search_web': {
    status: 'success',
    query: 'latest AI chip releases 2026',
    results: [
      { title: 'NVIDIA H300 Announced with 3x LLM Throughput', url: 'https://news.nvidia.com/h300', snippet: 'NVIDIA unveiled the H300 series targeting inference-heavy workloads...', published: '2026-04-28' },
      { title: 'Apple M5 Ultra breaks inference benchmarks', url: 'https://techcrunch.com/m5ultra', snippet: 'Apple silicon continues to push the boundary for on-device inference...', published: '2026-04-22' },
    ],
    search_time_ms: 342,
  },
  'recall_memory': {
    status: 'success',
    query: 'user preferences',
    results: [
      { id: 'mem_881', content: 'User prefers concise bullet-point summaries', score: 0.94, created_at: '2026-04-12' },
      { id: 'mem_742', content: 'User timezone: EST UTC-5', score: 0.91, created_at: '2026-03-18' },
    ],
  },
  'run_python': {
    status: 'success',
    stdout: '[1, 4, 9, 16, 25]\nSum: 55',
    stderr: '',
    execution_time_ms: 28,
  },
  'sql_query': {
    status: 'success',
    rows: [
      { id: 1, name: 'Alice', role: 'engineer', department: 'AI', salary: 142000 },
      { id: 2, name: 'Bob', role: 'researcher', department: 'AI', salary: 158000 },
    ],
    row_count: 2,
    execution_time_ms: 14,
  },
}

const defaultParams: Record<string, Param[]> = {
  'search_web': [{ key: 'query', value: 'latest AI chip releases 2026' }, { key: 'num_results', value: '5' }],
  'recall_memory': [{ key: 'query', value: 'user preferences' }, { key: 'top_k', value: '3' }],
  'run_python': [{ key: 'code', value: 'squares = [x**2 for x in range(1,6)]\nprint(squares)\nprint("Sum:", sum(squares))' }],
  'sql_query': [{ key: 'query', value: 'SELECT * FROM employees WHERE department = \'AI\'' }, { key: 'limit', value: '10' }],
}

export default function Playground() {
  const [selectedService, setSelectedService] = useState('Web Search')
  const [selectedTool, setSelectedTool] = useState('search_web')
  const [params, setParams] = useState<Param[]>(defaultParams['search_web'] || [{ key: '', value: '' }])
  const [response, setResponse] = useState<string | null>(JSON.stringify(mockResponses['search_web'], null, 2))
  const [executing, setExecuting] = useState(false)

  const handleServiceChange = (svc: string) => {
    setSelectedService(svc)
    const tools = toolsByService[svc]
    const tool = tools[0]
    setSelectedTool(tool)
    setParams(defaultParams[tool] || [{ key: '', value: '' }])
    setResponse(null)
  }

  const handleToolChange = (tool: string) => {
    setSelectedTool(tool)
    setParams(defaultParams[tool] || [{ key: '', value: '' }])
    setResponse(null)
  }

  const handleExecute = () => {
    setExecuting(true)
    setTimeout(() => {
      const mock = mockResponses[selectedTool] || { status: 'success', message: 'Tool executed successfully', tool: selectedTool, params: Object.fromEntries(params.map(p => [p.key, p.value])) }
      setResponse(JSON.stringify(mock, null, 2))
      setExecuting(false)
    }, 700)
  }

  const updateParam = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...params]
    updated[idx] = { ...updated[idx], [field]: val }
    setParams(updated)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Playground</h2>
        <p className="text-xs text-gray-500 mt-0.5">Test any connected service tool with live parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Config */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Service</label>
              <select
                value={selectedService}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {services.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">Tool</label>
              <select
                value={selectedTool}
                onChange={(e) => handleToolChange(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              >
                {(toolsByService[selectedService] || []).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Parameters</label>
                <button
                  onClick={() => setParams([...params, { key: '', value: '' }])}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {params.map((param, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      placeholder="key"
                      value={param.key}
                      onChange={(e) => updateParam(idx, 'key', e.target.value)}
                      className="w-1/3 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      placeholder="value"
                      value={param.value}
                      onChange={(e) => updateParam(idx, 'value', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => setParams(params.filter((_, i) => i !== idx))}
                      className="text-gray-400 hover:text-red-500 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleExecute}
              disabled={executing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
            >
              {executing ? 'Executing...' : '▶ Execute'}
            </button>
          </div>
        </div>

        {/* Right: Response */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Response</label>
            {response && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">200 OK</span>
            )}
          </div>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-auto min-h-64 max-h-96 whitespace-pre-wrap">
            {executing ? (
              <span className="text-gray-400 animate-pulse">Executing {selectedTool}...</span>
            ) : response ? (
              response
            ) : (
              <span className="text-gray-400">Response will appear here after execution</span>
            )}
          </pre>
        </div>
      </div>
    </div>
  )
}
