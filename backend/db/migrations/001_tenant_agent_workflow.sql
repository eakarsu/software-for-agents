CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(24) NOT NULL CHECK (role IN ('viewer', 'operator', 'approver', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS knowledge_connectors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'signed_push' CHECK (kind = 'signed_push'),
  ingestion_token_hash CHAR(64) NOT NULL,
  action_url TEXT,
  action_token_env VARCHAR(100),
  allowed_actions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(24) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name),
  CHECK (action_url IS NULL OR action_url ~ '^https://'),
  CHECK (action_token_env IS NULL OR action_token_env ~ '^CONNECTOR_TOKEN_[A-Z0-9_]+$')
);
CREATE INDEX IF NOT EXISTS idx_knowledge_connectors_tenant ON knowledge_connectors(tenant_id);

CREATE TABLE IF NOT EXISTS connector_syncs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES knowledge_connectors(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(160) NOT NULL,
  cursor TEXT,
  input_hash CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  upserted_count INTEGER NOT NULL DEFAULT 0 CHECK (upserted_count >= 0),
  deleted_count INTEGER NOT NULL DEFAULT 0 CHECK (deleted_count >= 0),
  error_code VARCHAR(80),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (connector_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES knowledge_connectors(id) ON DELETE CASCADE,
  source_id VARCHAR(300) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  content_hash CHAR(64) NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['viewer', 'operator', 'approver', 'admin']::TEXT[],
  source_updated_at TIMESTAMPTZ NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (connector_id, source_id),
  CHECK (cardinality(allowed_roles) > 0),
  CHECK (allowed_roles <@ ARRAY['viewer', 'operator', 'approver', 'admin']::TEXT[])
);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant_active ON knowledge_documents(tenant_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_search ON knowledge_documents USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
);

CREATE TABLE IF NOT EXISTS agent_rate_limits (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (tenant_id, user_id, bucket_start)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  idempotency_key VARCHAR(160) NOT NULL,
  input_hash CHAR(64) NOT NULL,
  question TEXT NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('running', 'completed', 'rejected', 'provider_failed', 'budget_exceeded')),
  model_id VARCHAR(160),
  retrieved_document_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  answer JSONB,
  provider_output JSONB,
  provider_error TEXT,
  schema_valid BOOLEAN NOT NULL DEFAULT FALSE,
  citation_coverage DECIMAL(6,5),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens INTEGER CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  cost_usd DECIMAL(12,8) CHECK (cost_usd IS NULL OR cost_usd >= 0),
  latency_budget_ms INTEGER NOT NULL CHECK (latency_budget_ms > 0),
  cost_budget_usd DECIMAL(12,8) NOT NULL CHECK (cost_budget_usd > 0),
  error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_tenant_created ON agent_runs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_citations (
  run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id),
  quote TEXT NOT NULL,
  source_url TEXT,
  PRIMARY KEY (run_id, document_id, quote)
);

CREATE TABLE IF NOT EXISTS tool_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  connector_id UUID NOT NULL REFERENCES knowledge_connectors(id),
  action VARCHAR(60) NOT NULL,
  input_payload JSONB NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending_approval', 'approved', 'running', 'retry_wait', 'succeeded', 'failed', 'rejected')),
  approved_by INTEGER REFERENCES users(id),
  approval_note TEXT,
  approved_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 5),
  timeout_ms INTEGER NOT NULL DEFAULT 5000 CHECK (timeout_ms BETWEEN 100 AND 30000),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_expires_at TIMESTAMPTZ,
  worker_id VARCHAR(120),
  result_payload JSONB,
  error_code VARCHAR(80),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_tool_jobs_worker ON tool_jobs(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS tool_job_attempts (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES tool_jobs(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  request_payload JSONB NOT NULL,
  response_status INTEGER,
  response_preview TEXT,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('succeeded', 'retryable_failure', 'terminal_failure', 'timeout')),
  error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS workflow_audit_heads (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_number BIGINT NOT NULL DEFAULT 0,
  head_hash CHAR(64) NOT NULL DEFAULT repeat('0', 64)
);

CREATE TABLE IF NOT EXISTS workflow_audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_number BIGINT NOT NULL,
  actor_type VARCHAR(24) NOT NULL CHECK (actor_type IN ('user', 'connector', 'worker', 'system')),
  actor_id TEXT,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id TEXT NOT NULL,
  data JSONB NOT NULL,
  previous_hash CHAR(64) NOT NULL,
  event_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, sequence_number),
  UNIQUE (tenant_id, event_hash)
);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_tenant_created ON workflow_audit_events(tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_workflow_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'workflow audit events are immutable';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS workflow_audit_no_update ON workflow_audit_events;
CREATE TRIGGER workflow_audit_no_update BEFORE UPDATE OR DELETE ON workflow_audit_events
FOR EACH ROW EXECUTE FUNCTION reject_workflow_audit_mutation();
DROP TRIGGER IF EXISTS tool_attempt_no_update ON tool_job_attempts;
CREATE TRIGGER tool_attempt_no_update BEFORE UPDATE OR DELETE ON tool_job_attempts
FOR EACH ROW EXECUTE FUNCTION reject_workflow_audit_mutation();

CREATE TABLE IF NOT EXISTS agent_eval_cases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  question TEXT NOT NULL,
  expected_source_ids TEXT[] NOT NULL,
  required_terms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  minimum_score DECIMAL(5,4) NOT NULL DEFAULT 0.8 CHECK (minimum_score BETWEEN 0 AND 1),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS agent_eval_runs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES agent_eval_cases(id) ON DELETE CASCADE,
  agent_run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  source_recall DECIMAL(5,4) NOT NULL CHECK (source_recall BETWEEN 0 AND 1),
  term_coverage DECIMAL(5,4) NOT NULL CHECK (term_coverage BETWEEN 0 AND 1),
  score DECIMAL(5,4) NOT NULL CHECK (score BETWEEN 0 AND 1),
  passed BOOLEAN NOT NULL,
  latency_within_budget BOOLEAN NOT NULL,
  cost_within_budget BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_eval_runs_case_created ON agent_eval_runs(case_id, created_at DESC);
