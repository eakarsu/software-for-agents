import { useState } from 'react'

type Integration = {
  id: string
  serviceName: string
  icon: string
  connectedDate: string
  apiCallsThisMonth: number
  lastUsed: string
  status: 'active' | 'paused'
}

const initialIntegrations: Integration[] = [
  { id: '1', serviceName: 'Web Search', icon: '🔍', connectedDate: '2026-02-14', apiCallsThisMonth: 2841, lastUsed: '2026-05-05 14:12', status: 'active' },
  { id: '2', serviceName: 'Memory Store', icon: '🧠', connectedDate: '2026-01-03', apiCallsThisMonth: 9302, lastUsed: '2026-05-05 14:18', status: 'active' },
  { id: '3', serviceName: 'Code Interpreter', icon: '💻', connectedDate: '2026-03-22', apiCallsThisMonth: 1247, lastUsed: '2026-05-04 22:41', status: 'active' },
  { id: '4', serviceName: 'Email Sender', icon: '📧', connectedDate: '2026-04-01', apiCallsThisMonth: 83, lastUsed: '2026-05-03 09:05', status: 'paused' },
  { id: '5', serviceName: 'Calendar Manager', icon: '📅', connectedDate: '2026-04-15', apiCallsThisMonth: 312, lastUsed: '2026-05-05 10:30', status: 'active' },
]

export default function MyIntegrations() {
  const [integrations, setIntegrations] = useState(initialIntegrations)

  const toggleStatus = (id: string) => {
    setIntegrations(integrations.map((i) =>
      i.id === id ? { ...i, status: i.status === 'active' ? 'paused' : 'active' } : i
    ))
  }

  const disconnect = (id: string) => {
    setIntegrations(integrations.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">My Integrations</h2>
          <p className="text-xs text-gray-500 mt-0.5">{integrations.filter(i => i.status === 'active').length} active, {integrations.filter(i => i.status === 'paused').length} paused</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          + Add Integration
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
              <th className="text-left px-5 py-3">Service</th>
              <th className="text-left px-5 py-3">Connected</th>
              <th className="text-right px-5 py-3">API Calls (Month)</th>
              <th className="text-left px-5 py-3">Last Used</th>
              <th className="text-center px-5 py-3">Status</th>
              <th className="text-center px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{integration.icon}</span>
                    <span className="font-medium text-gray-900">{integration.serviceName}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-500 text-xs">{integration.connectedDate}</td>
                <td className="px-5 py-4 text-right font-mono text-gray-700 font-medium">
                  {integration.apiCallsThisMonth.toLocaleString()}
                </td>
                <td className="px-5 py-4 text-xs text-gray-500">{integration.lastUsed}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    integration.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${integration.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    {integration.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors">
                      Configure
                    </button>
                    <button
                      onClick={() => toggleStatus(integration.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {integration.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => disconnect(integration.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Usage summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Total API Calls</div>
          <div className="text-2xl font-bold text-gray-900">
            {integrations.reduce((s, i) => s + i.apiCallsThisMonth, 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">This month</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Most Used</div>
          <div className="text-lg font-bold text-gray-900 mt-1">Memory Store</div>
          <div className="text-xs text-gray-400 mt-1">9,302 calls</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase mb-1">Connected Services</div>
          <div className="text-2xl font-bold text-gray-900">{integrations.length}</div>
          <div className="text-xs text-gray-400 mt-1">of 8 available</div>
        </div>
      </div>
    </div>
  )
}
