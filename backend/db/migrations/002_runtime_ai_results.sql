CREATE TABLE IF NOT EXISTS runtime_ai_results (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature VARCHAR(100) NOT NULL,
  prompt JSONB NOT NULL,
  response JSONB NOT NULL,
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_runtime_ai_results_user_created
  ON runtime_ai_results(user_id, created_at DESC);
