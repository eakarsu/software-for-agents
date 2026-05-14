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
