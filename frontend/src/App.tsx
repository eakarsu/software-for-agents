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
// Audit-implementation 2026-05-14: deep agent-infrastructure features.
import McpRegistry from './pages/McpRegistry';
import AgentIdentity from './pages/AgentIdentity';
import SandboxDryrun from './pages/SandboxDryrun';
import EvalHarness from './pages/EvalHarness';
import QuotaMetering from './pages/QuotaMetering';
import PublishAsMcp from './pages/PublishAsMcp';
import CustomViewsPage from './pages/CustomViewsPage';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

// Apply pass 7 (2026-05-21)
import WebhooksPage from './pages/WebhooksPage';
import DiscoveryPage from './pages/DiscoveryPage';
import AgentCompatMatrix from './pages/AgentCompatMatrix';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pre-existing public (un-wrapped) routes — kept as-is for
            backwards-compat. Nav-visible duplicates inside Layout below. */}
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

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
          {/* Audit-implementation 2026-05-14 */}
          <Route path="mcp-registry" element={<McpRegistry />} />
          <Route path="agent-identity" element={<AgentIdentity />} />
          <Route path="sandbox-dryrun" element={<SandboxDryrun />} />
          <Route path="eval-harness" element={<EvalHarness />} />
          <Route path="quota-metering" element={<QuotaMetering />} />
          <Route path="publish-as-mcp" element={<PublishAsMcp />} />
          <Route path="custom-views" element={<CustomViewsPage />} />
          {/* Apply pass 7 (2026-05-21) */}
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path="agent-compat" element={<AgentCompatMatrix />} />
          <Route path="views/timeline" element={<TimelineView />} />
          <Route path="views/custom-viz" element={<CodexCustomVizFeature />} />
          <Route path="views/operations" element={<CodexOperationsFeature />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
