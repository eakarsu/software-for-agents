import AdvisoryWorkspace from '../components/runtime-ai/AdvisoryWorkspace';

export default function AIStudio() {
  return <AdvisoryWorkspace
    title="Agent platform readiness"
    description="Assess a deidentified platform brief. This advisory does not use connector documents or authorize actions; the separate Agent workflow retains its grounded evidence and approval controls."
    endpoint="/api/runtime-ai/agent-readiness"
    field="prompt"
    fieldLabel="Deidentified platform brief"
    maxLength={4000}
    minLength={1}
    examples={[{"label": "Fill all \u00b7 Operating review", "value": "Example review scope: evaluate an agent platform before a controlled rollout. Actual service metrics, evaluation results, connector readiness and incident evidence have not been supplied. Identify missing evidence, reliability checks and accountable human review steps without claiming the platform is production ready."}, {"label": "Fill all \u00b7 Risk review", "value": "Example review scope: assess prompt-injection handling, tenant isolation, provider reliability and action approval controls. Source evidence has not been supplied. State uncertainty, request concrete test receipts and recommend conservative validation before any operational change."}, {"label": "Fill all \u00b7 Action plan", "value": "Example review scope: prepare an agent platform readiness checklist covering data access, source freshness, model budgets, observability and separate human approvals. No saved source IDs or evaluated results are provided. Propose verifiable next steps and leave readiness decisions to the responsible team."}]}
    tokenStorage="token"
  />;
}
