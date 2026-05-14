import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import ServicesPage from './pages/ServicesPage';
import ToolsPage from './pages/ToolsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import ExecutionsPage from './pages/ExecutionsPage';
import DocumentationPage from './pages/DocumentationPage';
import MetricsPage from './pages/MetricsPage';
import UtilityPage from './pages/UtilityPage';
import SampleDataPage from './pages/SampleDataPage';
import Dashboard from './pages/Dashboard';
import AICenter from './components/AICenter';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="tools" element={<ToolsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="executions" element={<ExecutionsPage />} />
          <Route path="documentation" element={<DocumentationPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="utility" element={<UtilityPage />} />
          <Route path="sample-data" element={<SampleDataPage />} />
          <Route path="ai-center" element={<AICenter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
