export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  version: string;
  category: string;
  endpoint_url: string;
  auth_type: string;
  status: string;
  uptime_pct: number;
  monthly_calls: number;
  avg_latency_ms: number;
  created_at: string;
  last_updated: string;
}

export interface Tool {
  id: number;
  service_id: number;
  service_name: string;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  example_input: string;
  example_output: string;
  call_count: number;
  success_rate: number;
  avg_latency_ms: number;
}

export interface Integration {
  id: number;
  service_id: number;
  service_name: string;
  user_id: number;
  api_key_preview: string;
  connected_at: string;
  last_used: string;
  calls_this_month: number;
  calls_this_week: number;
  status: string;
  plan: string;
}

export interface Execution {
  id: number;
  tool_id: number;
  tool_name: string;
  user_id: number;
  input_params: string;
  output_preview: string;
  status: string;
  duration_ms: number;
  created_at: string;
  tokens_used: number;
  cost_usd: number;
}

export interface Documentation {
  id: number;
  service_id: number;
  service_name: string;
  section: string;
  title: string;
  content: string;
  code_examples: string;
  last_updated: string;
  views: number;
}

export interface UsageMetric {
  id: number;
  service_id: number;
  service_name: string;
  metric_date: string;
  total_calls: number;
  success_calls: number;
  failed_calls: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  unique_users: number;
}
