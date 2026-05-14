import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Zap, Server, Wrench, Link2, PlayCircle, BookOpen, BarChart2, Sparkles, LogOut, Settings2, Database, LayoutDashboard, Bot, Play, Trophy, Gauge, UploadCloud } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/services', icon: Server, label: 'Services' },
  { to: '/tools', icon: Wrench, label: 'Tools' },
  { to: '/integrations', icon: Link2, label: 'Integrations' },
  { to: '/executions', icon: PlayCircle, label: 'Executions' },
  { to: '/documentation', icon: BookOpen, label: 'Documentation' },
  { to: '/metrics', icon: BarChart2, label: 'Usage Metrics' },
  { to: '/utility', icon: Settings2, label: 'Utilities' },
  { to: '/sample-data', icon: Database, label: 'Sample Data' },
];

// Audit-implementation 2026-05-14: deep agent-infrastructure features.
const agentInfraNav = [
  { to: '/mcp-registry',    icon: Server,      label: 'MCP Registry' },
  { to: '/agent-identity',  icon: Bot,         label: 'Agent Identity' },
  { to: '/sandbox-dryrun',  icon: Play,        label: 'Sandbox · Dry-Run' },
  { to: '/eval-harness',    icon: Trophy,      label: 'Eval Harness' },
  { to: '/quota-metering',  icon: Gauge,       label: 'Quota & Metering' },
  { to: '/publish-as-mcp',  icon: UploadCloud, label: 'Publish as MCP' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-950">
      <aside className="w-64 bg-gray-900 flex flex-col border-r border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white">AgentHub</div>
              <div className="text-xs text-gray-400">Services Registry</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-800">
            <NavLink
              to="/ai-center"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                    : 'text-violet-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Sparkles className="w-4 h-4" />
              AI Center
            </NavLink>
          </div>
          <div className="pt-4 mt-4 border-t border-gray-800">
            <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-gray-500">Agent Infra</div>
            {agentInfraNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-violet-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name?.[0] || 'A'}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{user.name || 'Admin'}</div>
              <div className="text-xs text-gray-400">{user.role || 'admin'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-950">
        <Outlet />
      </main>
    </div>
  );
}
