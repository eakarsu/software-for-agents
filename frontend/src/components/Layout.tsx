import { Bot, LogOut, Zap } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

type Tenant = { id: string; name: string; role: string };

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const tenants: Tenant[] = user.tenants || [];
  const tenantId = localStorage.getItem('tenantId') || '';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      <aside className="w-64 border-r border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center gap-3 border-b border-gray-800 pb-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600"><Zap size={18} /></span>
          <div><div className="font-semibold">AgentHub</div><div className="text-xs text-gray-400">Grounded operations</div></div>
        </div>
        {tenants.length > 0 && (
          <label className="mt-5 block text-xs text-gray-400">
            Tenant
            <select
              value={tenantId}
              onChange={(event) => { localStorage.setItem('tenantId', event.target.value); window.location.reload(); }}
              className="mt-2 w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-white"
            >
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.role}</option>)}
            </select>
          </label>
        )}
        <nav className="mt-5">
          <NavLink to="/workflow" className="flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm">
            <Bot size={16} /> Agent workflow
          </NavLink>
        </nav>
        <div className="mt-8 border-t border-gray-800 pt-4 text-sm">
          <div className="text-gray-200">{user.name || user.email}</div>
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-gray-400 hover:text-white"><LogOut size={15} /> Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1"><Outlet /></main>
    </div>
  );
}
