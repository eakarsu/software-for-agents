import AgentCapabilityChart from '../components/AgentCapabilityChart';
import ToolIntegrationHeatmap from '../components/ToolIntegrationHeatmap';
import IntegrationSpecPdf from '../components/IntegrationSpecPdf';
import CapabilityRulesEditor from '../components/CapabilityRulesEditor';
import { Layers } from 'lucide-react';

export default function CustomViewsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">SFA Views</h1>
          <p className="text-sm text-gray-400">
            Custom surfaces for the software-for-AI-agents registry — capability charting,
            runtime/tool compatibility, the integration spec, and editable capability rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentCapabilityChart />
        <ToolIntegrationHeatmap />
      </div>

      <IntegrationSpecPdf />

      <CapabilityRulesEditor />
    </div>
  );
}
