type Service = {
  id: string
  name: string
  description: string
  capabilities: string[]
  version: string
  usageCount: number
  icon: string
  category: string
}

const services: Service[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Real-time web search and content retrieval via multiple search engines. Supports filtering by date, domain, and content type.',
    capabilities: ['search_web', 'get_page', 'news_search', 'image_search'],
    version: '2.1.0',
    usageCount: 48320,
    icon: '🔍',
    category: 'Data Retrieval',
  },
  {
    id: 'doc-reader',
    name: 'Document Reader',
    description: 'Parse and extract structured content from PDFs, Word docs, spreadsheets, and presentations.',
    capabilities: ['parse_pdf', 'parse_docx', 'extract_tables', 'ocr_image'],
    version: '1.8.2',
    usageCount: 31205,
    icon: '📄',
    category: 'Document Processing',
  },
  {
    id: 'memory-store',
    name: 'Memory Store',
    description: 'Persistent vector memory with semantic search. Store and retrieve context across sessions.',
    capabilities: ['store_memory', 'recall_memory', 'semantic_search', 'clear_session'],
    version: '3.0.1',
    usageCount: 92841,
    icon: '🧠',
    category: 'Memory',
  },
  {
    id: 'task-executor',
    name: 'Task Executor',
    description: 'Schedule, run, and monitor background tasks. Supports cron jobs and event-driven triggers.',
    capabilities: ['run_task', 'schedule_task', 'cancel_task', 'get_task_status'],
    version: '1.5.0',
    usageCount: 17482,
    icon: '⚡',
    category: 'Execution',
  },
  {
    id: 'code-interpreter',
    name: 'Code Interpreter',
    description: 'Execute Python, JavaScript, and Bash code in secure sandboxed environments with file I/O.',
    capabilities: ['run_python', 'run_js', 'run_bash', 'install_package', 'read_file'],
    version: '2.3.1',
    usageCount: 58190,
    icon: '💻',
    category: 'Execution',
  },
  {
    id: 'db-query',
    name: 'Database Query',
    description: 'Query SQL and NoSQL databases. Supports PostgreSQL, MySQL, MongoDB, and Redis.',
    capabilities: ['sql_query', 'nosql_find', 'bulk_insert', 'schema_inspect'],
    version: '1.2.4',
    usageCount: 23710,
    icon: '🗄️',
    category: 'Data Access',
  },
  {
    id: 'email-sender',
    name: 'Email Sender',
    description: 'Send transactional and bulk emails via SMTP or API. Supports templates and attachments.',
    capabilities: ['send_email', 'send_bulk', 'create_template', 'track_open'],
    version: '1.4.0',
    usageCount: 12930,
    icon: '📧',
    category: 'Communication',
  },
  {
    id: 'calendar-manager',
    name: 'Calendar Manager',
    description: 'Read and write calendar events. Find availability, schedule meetings, send invites.',
    capabilities: ['get_events', 'create_event', 'find_slot', 'send_invite', 'cancel_event'],
    version: '1.1.3',
    usageCount: 8754,
    icon: '📅',
    category: 'Scheduling',
  },
]

type Props = {
  searchQuery: string
}

export default function ServiceBrowser({ searchQuery }: Props) {
  const filtered = services.filter((s) =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.capabilities.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">
          {searchQuery ? `${filtered.length} results for "${searchQuery}"` : `${services.length} Available Services`}
        </h2>
        <div className="flex gap-2">
          {['All', 'Data Retrieval', 'Execution', 'Memory', 'Communication'].map((cat) => (
            <button key={cat} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((service) => (
          <div key={service.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="text-2xl">{service.icon}</div>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{service.category}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
            <p className="text-xs text-gray-500 mb-3 flex-1 leading-relaxed">{service.description}</p>

            <div className="flex flex-wrap gap-1 mb-4">
              {service.capabilities.slice(0, 3).map((cap) => (
                <span key={cap} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono">
                  {cap}
                </span>
              ))}
              {service.capabilities.length > 3 && (
                <span className="text-xs text-gray-400">+{service.capabilities.length - 3} more</span>
              )}
            </div>

            <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
              <span>v{service.version}</span>
              <span>{service.usageCount.toLocaleString()} uses</span>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
