import { useState } from 'react'

type Param = {
  name: string
  type: string
  required: boolean
  description: string
}

type Tool = {
  name: string
  description: string
  params: Param[]
  exampleRequest: unknown
  exampleResponse: unknown
}

type ServiceDoc = {
  id: string
  name: string
  icon: string
  version: string
  description: string
  tools: Tool[]
}

const serviceDocs: ServiceDoc[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    icon: '🔍',
    version: '2.1.0',
    description: 'The Web Search service provides real-time access to the web. It supports multiple search backends and content types. Rate limited to 1000 queries/day on free tier.',
    tools: [
      {
        name: 'search_web',
        description: 'Perform a web search and return ranked results with titles, snippets, and URLs.',
        params: [
          { name: 'query', type: 'string', required: true, description: 'The search query string' },
          { name: 'num_results', type: 'integer', required: false, description: 'Number of results to return (default: 5, max: 20)' },
          { name: 'date_range', type: 'string', required: false, description: 'Filter by date: "24h", "7d", "30d", or ISO range' },
          { name: 'site', type: 'string', required: false, description: 'Restrict search to a specific domain' },
        ],
        exampleRequest: { query: 'quantum computing breakthroughs 2026', num_results: 3 },
        exampleResponse: {
          status: 'success',
          results: [
            { title: 'IBM Quantum Eagle hits 1000-qubit milestone', url: 'https://ibm.com/quantum/eagle', snippet: 'IBM announced...', published: '2026-04-30' },
          ],
          search_time_ms: 287,
        },
      },
      {
        name: 'get_page',
        description: 'Fetch and extract the text content of a web page by URL.',
        params: [
          { name: 'url', type: 'string', required: true, description: 'The full URL of the page to fetch' },
          { name: 'extract_mode', type: 'string', required: false, description: '"text" (default), "markdown", or "html"' },
        ],
        exampleRequest: { url: 'https://example.com/article', extract_mode: 'markdown' },
        exampleResponse: { status: 'success', content: '# Article Title\n\nContent here...', word_count: 842, fetch_time_ms: 1240 },
      },
    ],
  },
  {
    id: 'memory-store',
    name: 'Memory Store',
    icon: '🧠',
    version: '3.0.1',
    description: 'Persistent semantic memory using vector embeddings. Memories are scoped per agent session and can persist across sessions with the `persist` flag.',
    tools: [
      {
        name: 'store_memory',
        description: 'Store a piece of information in the agent\'s memory with optional metadata.',
        params: [
          { name: 'content', type: 'string', required: true, description: 'The text content to store' },
          { name: 'tags', type: 'string[]', required: false, description: 'Optional tags for categorization' },
          { name: 'persist', type: 'boolean', required: false, description: 'If true, memory persists beyond this session (default: false)' },
        ],
        exampleRequest: { content: 'User prefers responses in bullet points', tags: ['preferences', 'format'], persist: true },
        exampleResponse: { status: 'success', memory_id: 'mem_1024', embedding_dims: 1536 },
      },
      {
        name: 'semantic_search',
        description: 'Search memories by semantic similarity to a query.',
        params: [
          { name: 'query', type: 'string', required: true, description: 'Query to search memories by' },
          { name: 'top_k', type: 'integer', required: false, description: 'Number of results (default: 5)' },
          { name: 'score_threshold', type: 'float', required: false, description: 'Minimum similarity score 0-1 (default: 0.7)' },
        ],
        exampleRequest: { query: 'user communication preferences', top_k: 3 },
        exampleResponse: {
          status: 'success',
          results: [{ id: 'mem_1024', content: 'User prefers responses in bullet points', score: 0.96, tags: ['preferences'] }],
        },
      },
    ],
  },
  {
    id: 'code-interpreter',
    name: 'Code Interpreter',
    icon: '💻',
    version: '2.3.1',
    description: 'Sandboxed code execution for Python, JavaScript, and Bash. Each execution runs in an isolated container. Supports file I/O within the sandbox.',
    tools: [
      {
        name: 'run_python',
        description: 'Execute Python code and return stdout, stderr, and execution time.',
        params: [
          { name: 'code', type: 'string', required: true, description: 'Python code to execute' },
          { name: 'timeout_s', type: 'integer', required: false, description: 'Max execution time in seconds (default: 30)' },
          { name: 'packages', type: 'string[]', required: false, description: 'Additional pip packages to install before execution' },
        ],
        exampleRequest: { code: 'import pandas as pd\ndf = pd.DataFrame({"x": [1,2,3]})\nprint(df.describe())' },
        exampleResponse: { status: 'success', stdout: '         x\ncount  3.0\nmean   2.0\nstd    1.0\nmin    1.0\n...', stderr: '', execution_time_ms: 183 },
      },
    ],
  },
]

export default function DocViewer() {
  const [selectedService, setSelectedService] = useState(serviceDocs[0])
  const [expandedTool, setExpandedTool] = useState<string | null>(selectedService.tools[0].name)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Service list sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Services</span>
          </div>
          {serviceDocs.map((svc) => (
            <button
              key={svc.id}
              onClick={() => { setSelectedService(svc); setExpandedTool(svc.tools[0]?.name || null); }}
              className={`w-full text-left px-4 py-3 flex items-center gap-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedService.id === svc.id ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : ''
              }`}
            >
              <span className="text-lg">{svc.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-800">{svc.name}</div>
                <div className="text-xs text-gray-400">v{svc.version}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Docs content */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{selectedService.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedService.name}</h2>
              <span className="text-xs text-gray-400">v{selectedService.version}</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{selectedService.description}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Tools ({selectedService.tools.length})</span>
          </div>
          {selectedService.tools.map((tool) => (
            <div key={tool.name} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <code className="bg-gray-100 text-indigo-600 px-2 py-0.5 rounded text-sm font-mono">{tool.name}</code>
                  <span className="text-sm text-gray-600">{tool.description}</span>
                </div>
                <span className="text-gray-400 text-lg">{expandedTool === tool.name ? '−' : '+'}</span>
              </button>

              {expandedTool === tool.name && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Parameters table */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Parameters</div>
                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-gray-500">Name</th>
                          <th className="text-left px-3 py-2 text-gray-500">Type</th>
                          <th className="text-center px-3 py-2 text-gray-500">Required</th>
                          <th className="text-left px-3 py-2 text-gray-500">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tool.params.map((p) => (
                          <tr key={p.name} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2 font-mono text-blue-600">{p.name}</td>
                            <td className="px-3 py-2 font-mono text-purple-600">{p.type}</td>
                            <td className="px-3 py-2 text-center">
                              {p.required
                                ? <span className="text-red-500 font-semibold">yes</span>
                                : <span className="text-gray-400">no</span>
                              }
                            </td>
                            <td className="px-3 py-2 text-gray-600">{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Example */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Example Request</div>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-auto">
                        {JSON.stringify(tool.exampleRequest, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Example Response</div>
                      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-auto">
                        {JSON.stringify(tool.exampleResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
