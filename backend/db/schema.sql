CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20),
  category VARCHAR(100),
  endpoint_url VARCHAR(500),
  auth_type VARCHAR(30),
  status VARCHAR(30) DEFAULT 'active',
  uptime_pct DECIMAL DEFAULT 99.9,
  monthly_calls BIGINT DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  input_schema TEXT,
  output_schema TEXT,
  example_input TEXT,
  example_output TEXT,
  call_count BIGINT DEFAULT 0,
  success_rate DECIMAL DEFAULT 99.0,
  avg_latency_ms INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  api_key_preview VARCHAR(20),
  connected_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  calls_this_month INTEGER DEFAULT 0,
  calls_this_week INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'active',
  plan VARCHAR(30) DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS executions (
  id SERIAL PRIMARY KEY,
  tool_id INT REFERENCES tools(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  input_params TEXT,
  output_preview TEXT,
  status VARCHAR(20) DEFAULT 'success',
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS documentation (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  section VARCHAR(100),
  title VARCHAR(255),
  content TEXT,
  code_examples TEXT,
  last_updated DATE DEFAULT NOW(),
  views INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_metrics (
  id SERIAL PRIMARY KEY,
  service_id INT REFERENCES services(id) ON DELETE CASCADE,
  metric_date DATE,
  total_calls INTEGER DEFAULT 0,
  success_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  unique_users INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80),
  entity_id INT,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================================================
-- Audit-implementation feature tables (2026-05-14)
-- Agent-first infrastructure: MCP servers, agent identity, replay, quotas, etc.
-- ============================================================================

-- Agent identity: AGENTPASS-style programmatic agents (vs. human users).
-- Each agent has a public agent_id ("agt_..."), an organization, framework,
-- and a verified principal (the human/org that vouches for it).
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(40) UNIQUE NOT NULL,         -- agt_xxxxx public identifier
  display_name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  framework VARCHAR(80),                        -- langchain, langgraph, openai-agents, claude-agent-sdk, etc.
  framework_version VARCHAR(40),
  model_id VARCHAR(100),                        -- anthropic/claude-opus-4-7, openai/gpt-4o, ...
  verified_principal VARCHAR(255),              -- email or org domain that owns the agent
  verification_method VARCHAR(40),              -- email, dns_txt, oidc, manual
  capabilities TEXT,                            -- JSON array string of declared capabilities
  bfcl_score DECIMAL,                           -- Berkeley Function Calling Leaderboard score (0-100)
  agentbench_score DECIMAL,                     -- AgentBench score (0-100)
  trust_tier VARCHAR(20) DEFAULT 'unverified',  -- unverified, verified, trusted, partner
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_framework ON agents(framework);

-- API keys / scoped tokens issued to agents (OAuth-for-agents).
-- Stores hashed key, scopes (JSON), and per-key rate limits.
CREATE TABLE IF NOT EXISTS agent_api_keys (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
  key_prefix VARCHAR(20) NOT NULL,              -- displayable prefix (e.g. "sk_live_abc...")
  key_hash TEXT NOT NULL,                       -- sha256 of full key
  scopes TEXT NOT NULL,                         -- JSON array: ["tools:read","executions:write",...]
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_tpm INTEGER DEFAULT 100000,        -- tokens-per-minute budget
  expires_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- MCP server registry: services that expose tools via Anthropic's MCP protocol.
-- Tracks transport (stdio/http/sse), manifest URL, and a one-click "publish-as-MCP" lineage.
CREATE TABLE IF NOT EXISTS mcp_servers (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_service_id INT REFERENCES services(id) ON DELETE SET NULL,
  transport VARCHAR(20) DEFAULT 'http',         -- stdio, http, sse, websocket
  manifest_url VARCHAR(500),                    -- /.well-known/mcp.json or similar
  endpoint_url VARCHAR(500),
  mcp_version VARCHAR(20) DEFAULT '2025-06-18', -- MCP protocol version
  tools_count INTEGER DEFAULT 0,
  prompts_count INTEGER DEFAULT 0,
  resources_count INTEGER DEFAULT 0,
  publisher VARCHAR(255),
  publisher_verified BOOLEAN DEFAULT FALSE,
  install_count INTEGER DEFAULT 0,
  rating DECIMAL DEFAULT 0,
  pricing_model VARCHAR(40) DEFAULT 'free',     -- free, byok, usage, subscription
  category VARCHAR(80),
  tags TEXT,                                    -- JSON array string
  source_url VARCHAR(500),                      -- github / source repo
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_category ON mcp_servers(category);

-- Quota tiers (Free / Developer / Scale / Enterprise) — schema-defined plans.
CREATE TABLE IF NOT EXISTS quota_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  monthly_calls_included BIGINT NOT NULL,
  overage_price_per_1k_usd DECIMAL,
  monthly_price_usd DECIMAL,
  rate_limit_rpm INTEGER,
  rate_limit_tpm INTEGER,
  max_parallel_executions INTEGER DEFAULT 10,
  features TEXT,                                -- JSON array string
  sort_order INTEGER DEFAULT 0
);

-- Per-agent quota usage (rolling current-period counters).
CREATE TABLE IF NOT EXISTS quota_usage (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
  tier_id INT REFERENCES quota_tiers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calls_used BIGINT DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  cost_accrued_usd DECIMAL DEFAULT 0,
  overage_calls BIGINT DEFAULT 0,
  throttled_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quota_usage_agent ON quota_usage(agent_id);

-- Sandbox / dry-run executions: replayable, idempotent test runs.
CREATE TABLE IF NOT EXISTS sandbox_runs (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  tool_id INT REFERENCES tools(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(80) UNIQUE,           -- agent-supplied; same key returns cached result
  input_payload TEXT,                           -- JSON
  output_payload TEXT,                          -- JSON
  schema_valid BOOLEAN DEFAULT TRUE,
  schema_errors TEXT,                           -- JSON array of zod-style errors
  duration_ms INTEGER,
  dry_run BOOLEAN DEFAULT TRUE,
  status_code INTEGER DEFAULT 200,
  error_code VARCHAR(60),                       -- structured error code (RATE_LIMIT, BAD_INPUT, ...)
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sandbox_idem ON sandbox_runs(idempotency_key);

-- Tool-call replay traces: production traces captured for regression / eval.
CREATE TABLE IF NOT EXISTS replay_traces (
  id SERIAL PRIMARY KEY,
  trace_id VARCHAR(60) UNIQUE NOT NULL,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  workflow_name VARCHAR(255),                   -- e.g. "support-triage-v3"
  framework VARCHAR(80),                        -- langgraph, crewai, autogen, mastra, ...
  step_count INTEGER DEFAULT 0,
  tool_calls TEXT,                              -- JSON array of {tool, input, output, ms}
  total_latency_ms INTEGER,
  total_tokens INTEGER,
  success BOOLEAN DEFAULT TRUE,
  outcome_label VARCHAR(60),                    -- success, partial, failed, hallucination
  created_at TIMESTAMP DEFAULT NOW()
);

-- Eval results: AgentBench / SWE-bench / ToolBench / GAIA / BFCL.
CREATE TABLE IF NOT EXISTS eval_results (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
  benchmark VARCHAR(60) NOT NULL,               -- BFCL_v3, AgentBench, SWE-bench-Verified, ToolBench, GAIA
  score DECIMAL,                                -- 0-100
  tasks_total INTEGER,
  tasks_passed INTEGER,
  tasks_failed INTEGER,
  category_scores TEXT,                         -- JSON object per-category
  notes TEXT,
  run_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_benchmark ON eval_results(benchmark);

-- Billing/metering ledger: append-only usage events for invoicing.
CREATE TABLE IF NOT EXISTS billing_events (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE SET NULL,
  event_type VARCHAR(40),                       -- tool_call, token_usage, sandbox_run, subscription
  service_id INT REFERENCES services(id) ON DELETE SET NULL,
  units DECIMAL,                                -- calls or tokens
  unit_price_usd DECIMAL,
  amount_usd DECIMAL,
  metadata TEXT,                                -- JSON
  invoiced BOOLEAN DEFAULT FALSE,
  occurred_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_billing_events_agent ON billing_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_occurred ON billing_events(occurred_at DESC);

-- OAuth-for-agents flow records: programmatic signup + delegated auth.
CREATE TABLE IF NOT EXISTS agent_oauth_grants (
  id SERIAL PRIMARY KEY,
  agent_id INT REFERENCES agents(id) ON DELETE CASCADE,
  provider VARCHAR(60),                         -- google, github, slack, custom
  granted_scopes TEXT,                          -- JSON array
  on_behalf_of VARCHAR(255),                    -- end-user email/uid the agent acts for
  status VARCHAR(30) DEFAULT 'pending',         -- pending, granted, revoked, expired
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
