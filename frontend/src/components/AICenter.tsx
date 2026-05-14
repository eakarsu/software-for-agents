import { useState } from 'react';
import { Sparkles, Search, FileText, Bug, Code, Wand2, Heart, Layers, MessageSquareWarning, Terminal } from 'lucide-react';
import { api } from '../api';
import AIResponse from './AIResponse';

type TabId =
  | 'discover'
  | 'docs'
  | 'debug'
  | 'integration'
  | 'recommend'
  | 'health'
  | 'gap'
  | 'critique'
  | 'nl2tool';

export default function AICenter() {
  const [activeTab, setActiveTab] = useState<TabId>('discover');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Form states
  const [taskDescription, setTaskDescription] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [toolName, setToolName] = useState('');
  const [executionId, setExecutionId] = useState('');
  const [debugError, setDebugError] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [language, setLanguage] = useState('Python');
  // New feature states
  const [goal, setGoal] = useState('');
  const [integrationId, setIntegrationId] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [promptText, setPromptText] = useState('');
  const [targetUse, setTargetUse] = useState('customer support agent');
  const [nlInstruction, setNlInstruction] = useState('');

  // --- Sample prefill data (real agent-software services / tools / goals) ---
  const samples = {
    discover: [
      {
        label: 'Triage support tickets',
        task: 'Pull new tickets from Zendesk every 5 minutes, classify priority and topic with an LLM, post P0/P1 alerts to Slack #support, and assign tickets in HubSpot. OAuth for Zendesk + Slack, API key for HubSpot.'
      },
      {
        label: 'Weekly engineering digest',
        task: 'Summarize merged GitHub PRs and Linear issues from the last 7 days for the platform team, then post a markdown digest to Slack #eng-weekly every Friday at 9am PT. Use GitHub App + Slack bot OAuth.'
      },
      {
        label: 'Failed Stripe charge recovery',
        task: 'Detect failed Stripe charges, look up the customer in HubSpot, and send a Twilio SMS plus a templated email to retry payment, then log the recovery attempt to Notion.'
      }
    ],
    docs: [
      { label: 'Stripe create_charge', serviceId: '1', tool: 'create_charge' },
      { label: 'Slack post_message', serviceId: '2', tool: 'post_message' },
      { label: 'OpenAI embed_text', serviceId: '7', tool: 'embed_text' }
    ],
    debug: [
      {
        label: 'Stripe 402 card_declined',
        execId: '12',
        error: 'StripeCardError: Your card was declined. (decline_code=insufficient_funds, charge=ch_3PzABC) when calling create_charge with amount=4900 currency=usd customer=cus_QxR1.'
      },
      {
        label: 'Slack rate-limit 429',
        execId: '7',
        error: 'SlackApiError: ratelimited (HTTP 429, Retry-After: 30s) on chat.postMessage to channel C0123ALERTS via bot xoxb-… while posting alert batch of 42 messages.'
      },
      {
        label: 'GitHub auth 401',
        execId: '21',
        error: 'GitHub API 401 Bad credentials when calling POST /repos/acme/api/pulls (open_pull_request). Token gho_… has likely expired or lost repo scope after OAuth re-consent.'
      }
    ],
    integration: [
      { label: 'Stripe billing (Python)', service: 'Stripe', use: 'Charge a customer for a usage-based subscription using create_charge and reconcile invoices nightly', lang: 'Python' },
      { label: 'Slack notifier (TypeScript)', service: 'Slack', use: 'Post deploy and incident notifications to #ops via a bot token using chat.postMessage with retry on 429', lang: 'TypeScript' },
      { label: 'GitHub PR bot (Go)', service: 'GitHub', use: 'Open pull requests from an agent using a GitHub App installation token and label them auto-merge', lang: 'Go' }
    ],
    recommend: [
      { label: 'HN -> Slack digest', goal: 'Monitor Hacker News for posts mentioning our product, summarize the top 5 each morning with an LLM, and post a thread to Slack #growth.' },
      { label: 'Lead enrichment', goal: 'When a new HubSpot contact is created, enrich with web_search + LinkedIn scrape, score the lead, and write the score back to HubSpot via API key.' },
      { label: 'On-call incident triage', goal: 'When PagerDuty fires, fetch the related Datadog logs, summarize root cause hypotheses with OpenAI, and post in the Slack incident channel.' }
    ],
    health: [
      { label: 'Stripe (id 1)', integrationId: '1' },
      { label: 'Slack (id 2)', integrationId: '2' },
      { label: 'GitHub (id 3)', integrationId: '3' }
    ],
    gap: [
      { label: 'Invoice -> QuickBooks', desc: 'Ingest invoices from Gmail attachments, OCR them, post to QuickBooks via OAuth, alert duplicates in Slack, and archive originals to S3.' },
      { label: 'Customer 360 sync', desc: 'Sync customers between Stripe, HubSpot and Notion in near-real-time with reconciliation, conflict resolution, and an audit trail.' },
      { label: 'Voice agent loop', desc: 'Twilio voice -> speech-to-text -> agent reasoning -> tool calls (create_charge, post_message) -> text-to-speech back to caller within 800ms.' }
    ],
    critique: [
      {
        label: 'Support agent prompt',
        target: 'customer support agent',
        prompt: 'You are a support agent. Be helpful and friendly. Answer the user\'s question. If you do not know the answer, make something up that sounds correct.'
      },
      {
        label: 'Sales SDR prompt',
        target: 'outbound sales SDR',
        prompt: 'You are an SDR. Send a cold email to the prospect about our product. Use the tools post_message and create_charge if needed. Keep it short.'
      },
      {
        label: 'Tool-using coding agent',
        target: 'autonomous coding agent with shell + GitHub tools',
        prompt: 'You are a coding agent with shell access and a GitHub tool. Fix the bug. You may do anything. Always commit to main when done.'
      }
    ],
    nl2tool: [
      { label: 'Charge customer $49', instr: 'Charge customer cus_QxR1 $49.00 USD on their default card via Stripe create_charge with description "Pro plan May 2026".' },
      { label: 'Post to #alerts', instr: 'Post the message "Deploy of api@v1.42 succeeded in 3m12s" to Slack channel #alerts via post_message as the deploybot.' },
      { label: 'Embed FAQ doc', instr: 'Embed the text of the file faq.md using OpenAI embed_text with model text-embedding-3-large and store the vector in Pinecone index "support-faq".' }
    ]
  };

  // Tiny pill-button row used above each form
  const SamplePicker = ({
    items,
    onPick
  }: {
    items: { label: string }[];
    onPick: (idx: number) => void;
  }) => (
    <div className="flex flex-wrap gap-2 mb-2">
      <span className="text-xs text-gray-500 self-center mr-1">Try:</span>
      {items.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-violet-600 hover:border-violet-500 hover:text-white transition-colors"
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const runAI = async (fn: () => Promise<{ result: string }>) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await fn();
      setResult(data.result);
    } catch (err: any) {
      setResult(`Error: ${err?.message || 'Could not get AI response'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.ai.discoverServices(taskDescription);
      setResult(data.result);
    } catch (err) {
      setResult('Error: Could not get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.ai.generateDocs(Number(serviceId), toolName);
      setResult(data.result);
    } catch (err) {
      setResult('Error: Could not get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleDebug = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.ai.debugExecution(Number(executionId), debugError);
      setResult(data.result);
    } catch (err) {
      setResult('Error: Could not get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.ai.integrationGuide(serviceName, useCase, language);
      setResult(data.result);
    } catch (err) {
      setResult('Error: Could not get AI response');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'discover', label: 'Discover Services', icon: Search },
    { id: 'docs', label: 'Generate Docs', icon: FileText },
    { id: 'debug', label: 'Debug Execution', icon: Bug },
    { id: 'integration', label: 'Integration Guide', icon: Code },
    { id: 'recommend', label: 'Recommend Tools', icon: Wand2 },
    { id: 'health', label: 'Integration Health', icon: Heart },
    { id: 'gap', label: 'Capability Gap', icon: Layers },
    { id: 'critique', label: 'Prompt Critic', icon: MessageSquareWarning },
    { id: 'nl2tool', label: 'NL to Tool Call', icon: Terminal },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Center</h1>
            <p className="text-gray-400 text-sm">AI-powered tools for service discovery, documentation, and debugging</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); setResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-2xl">
        {activeTab === 'discover' && (
          <form onSubmit={handleDiscover} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Discover Services</h2>
              <p className="text-gray-400 text-sm mb-4">Describe your task and get recommendations for the best services and tools.</p>
            </div>
            <SamplePicker items={samples.discover} onPick={(i) => setTaskDescription(samples.discover[i].task)} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
              <textarea
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="e.g., I need to search the web for recent news, extract key information, translate it to French, and send a summary email to stakeholders"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Discover Services'}
            </button>
          </form>
        )}

        {activeTab === 'docs' && (
          <form onSubmit={handleGenerateDocs} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Generate Documentation</h2>
              <p className="text-gray-400 text-sm mb-4">Generate comprehensive API documentation for a service tool.</p>
            </div>
            <SamplePicker
              items={samples.docs}
              onPick={(i) => { setServiceId(samples.docs[i].serviceId); setToolName(samples.docs[i].tool); }}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Service ID</label>
              <input
                type="number"
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tool Name</label>
              <input
                type="text"
                value={toolName}
                onChange={e => setToolName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., web_search"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Documentation'}
            </button>
          </form>
        )}

        {activeTab === 'debug' && (
          <form onSubmit={handleDebug} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Debug Execution</h2>
              <p className="text-gray-400 text-sm mb-4">Analyze a failed execution and get root cause analysis and fixes.</p>
            </div>
            <SamplePicker
              items={samples.debug}
              onPick={(i) => { setExecutionId(samples.debug[i].execId); setDebugError(samples.debug[i].error); }}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Execution ID (optional)</label>
              <input
                type="number"
                value={executionId}
                onChange={e => setExecutionId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., 7"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Error Message</label>
              <textarea
                value={debugError}
                onChange={e => setDebugError(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="e.g., TimeoutError: Execution exceeded 30s limit when running numpy calculations"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Debug Execution'}
            </button>
          </form>
        )}

        {activeTab === 'integration' && (
          <form onSubmit={handleIntegrationGuide} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Integration Guide</h2>
              <p className="text-gray-400 text-sm mb-4">Get a complete integration guide with working code examples.</p>
            </div>
            <SamplePicker
              items={samples.integration}
              onPick={(i) => {
                setServiceName(samples.integration[i].service);
                setUseCase(samples.integration[i].use);
                setLanguage(samples.integration[i].lang);
              }}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Service Name</label>
              <input
                type="text"
                value={serviceName}
                onChange={e => setServiceName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., Memory Store"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Use Case</label>
              <input
                type="text"
                value={useCase}
                onChange={e => setUseCase(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., Store and retrieve conversation history for a chatbot"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Programming Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option>Python</option>
                <option>JavaScript</option>
                <option>TypeScript</option>
                <option>Go</option>
                <option>Ruby</option>
                <option>Java</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Integration Guide'}
            </button>
          </form>
        )}

        {activeTab === 'recommend' && (
          <form onSubmit={(e) => { e.preventDefault(); runAI(() => api.ai.recommendTools(goal)); }} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Recommend Tools for Goal</h2>
              <p className="text-gray-400 text-sm mb-4">Describe a goal — get AI-recommended tools to chain together.</p>
            </div>
            <SamplePicker items={samples.recommend} onPick={(i) => setGoal(samples.recommend[i].goal)} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Goal</label>
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="e.g., Monitor Hacker News, summarize top items, send a weekly digest to Slack."
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Thinking...' : 'Recommend Tools'}
            </button>
          </form>
        )}

        {activeTab === 'health' && (
          <form onSubmit={(e) => { e.preventDefault(); runAI(() => api.ai.integrationHealth(Number(integrationId))); }} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Integration Health Scorer</h2>
              <p className="text-gray-400 text-sm mb-4">Score reliability, freshness, performance and cost-efficiency of an integration.</p>
            </div>
            <SamplePicker
              items={samples.health}
              onPick={(i) => setIntegrationId(samples.health[i].integrationId)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Integration ID</label>
              <input
                type="number"
                value={integrationId}
                onChange={e => setIntegrationId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., 1"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Scoring...' : 'Score Integration Health'}
            </button>
          </form>
        )}

        {activeTab === 'gap' && (
          <form onSubmit={(e) => { e.preventDefault(); runAI(() => api.ai.capabilityGap(workflowDesc)); }} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Capability Gap Finder</h2>
              <p className="text-gray-400 text-sm mb-4">Describe a workflow — find what the registry is missing.</p>
            </div>
            <SamplePicker items={samples.gap} onPick={(i) => setWorkflowDesc(samples.gap[i].desc)} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Workflow Description</label>
              <textarea
                value={workflowDesc}
                onChange={e => setWorkflowDesc(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="e.g., Ingest invoices from email, OCR them, post to QuickBooks, alert on duplicates."
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Analyzing...' : 'Find Gaps'}
            </button>
          </form>
        )}

        {activeTab === 'critique' && (
          <form onSubmit={(e) => { e.preventDefault(); runAI(() => api.ai.critiquePrompt(promptText, targetUse)); }} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Agent Prompt Critic</h2>
              <p className="text-gray-400 text-sm mb-4">Get a rigorous critique and improved rewrite of an agent prompt.</p>
            </div>
            <SamplePicker
              items={samples.critique}
              onPick={(i) => { setTargetUse(samples.critique[i].target); setPromptText(samples.critique[i].prompt); }}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target Use</label>
              <input
                type="text"
                value={targetUse}
                onChange={e => setTargetUse(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="e.g., customer support agent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Text</label>
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Paste your system / agent prompt here..."
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Critiquing...' : 'Critique Prompt'}
            </button>
          </form>
        )}

        {activeTab === 'nl2tool' && (
          <form onSubmit={(e) => { e.preventDefault(); runAI(() => api.ai.nlToToolCall(nlInstruction)); }} className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">NL to Tool Call</h2>
              <p className="text-gray-400 text-sm mb-4">Convert a natural-language instruction into a concrete tool call (JSON).</p>
            </div>
            <SamplePicker items={samples.nl2tool} onPick={(i) => setNlInstruction(samples.nl2tool[i].instr)} />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Instruction</label>
              <textarea
                value={nlInstruction}
                onChange={e => setNlInstruction(e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="e.g., Search the web for 'GPT-5 release date' and store the top 3 results."
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Generating...' : 'Generate Tool Call'}
            </button>
          </form>
        )}

        <AIResponse result={result} loading={loading} />
      </div>
    </div>
  );
}
