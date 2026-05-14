INSERT INTO users (email, password_hash, name, role) VALUES
('admin@demo.com', '$2b$10$e4dPQpe3XIDluCZCv3b3iu/H/3f816tgim6l5ly5k7pChHG235Dey', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO services (name, description, version, category, endpoint_url, auth_type, status, uptime_pct, monthly_calls, avg_latency_ms) VALUES
('Web Search', 'Real-time web search with semantic understanding and structured results', '2.1.0', 'search', 'https://api.websearch.ai/v2', 'api_key', 'active', 99.95, 4500000, 210),
('Document Reader', 'Parse and extract content from PDFs, Word, Excel, and HTML documents', '1.8.0', 'data', 'https://api.docreader.io/v1', 'api_key', 'active', 99.8, 2800000, 340),
('Memory Store', 'Persistent vector-based memory for agent context and knowledge retrieval', '3.0.1', 'storage', 'https://api.memstore.ai/v3', 'jwt', 'active', 99.99, 8900000, 45),
('Code Interpreter', 'Execute Python, JavaScript, and shell code in sandboxed environment', '2.5.0', 'compute', 'https://api.coderun.io/v2', 'oauth2', 'active', 99.7, 1200000, 850),
('Email Sender', 'Send, schedule, and track transactional and bulk email messages', '1.4.0', 'communication', 'https://api.emailsvc.com/v1', 'api_key', 'active', 99.9, 3200000, 95),
('Calendar Manager', 'Create, read, update events across Google, Outlook, and CalDAV calendars', '2.0.0', 'productivity', 'https://api.calmgr.io/v2', 'oauth2', 'active', 99.8, 980000, 180),
('Database Query', 'Execute SQL queries against PostgreSQL, MySQL, and MongoDB databases', '1.9.0', 'data', 'https://api.dbquery.io/v1', 'jwt', 'active', 99.6, 2100000, 420),
('Image Analysis', 'Analyze images for objects, text, faces, sentiment, and content moderation', '3.2.0', 'compute', 'https://api.imganalyze.ai/v3', 'api_key', 'active', 99.85, 1700000, 680),
('PDF Processor', 'Extract text, tables, forms, and metadata from PDF documents at scale', '2.3.0', 'data', 'https://api.pdfpro.io/v2', 'api_key', 'active', 99.75, 890000, 290),
('Translation', 'Translate text between 120+ languages with domain-specific models', '4.1.0', 'communication', 'https://api.translate.ai/v4', 'api_key', 'active', 99.95, 5600000, 130),
('Summarizer', 'Generate concise summaries of long documents, articles, and conversations', '2.0.0', 'data', 'https://api.summarize.ai/v2', 'api_key', 'active', 99.9, 3400000, 520),
('Data Extractor', 'Extract structured data from unstructured text using custom schemas', '1.6.0', 'data', 'https://api.dataextract.io/v1', 'jwt', 'beta', 98.5, 450000, 380),
('Form Filler', 'Automatically fill web forms, PDFs, and structured inputs from data sources', '1.2.0', 'productivity', 'https://api.formfill.io/v1', 'api_key', 'beta', 98.0, 280000, 560),
('Scheduler', 'Schedule tasks, workflows, and agent runs with cron and event triggers', '2.4.0', 'integration', 'https://api.scheduler.ai/v2', 'jwt', 'active', 99.98, 1500000, 60),
('Notifier', 'Send notifications via SMS, push, webhook, Slack, and Teams', '3.0.0', 'communication', 'https://api.notifier.io/v3', 'api_key', 'active', 99.97, 7200000, 75)
ON CONFLICT DO NOTHING;

INSERT INTO tools (service_id, name, description, input_schema, output_schema, example_input, example_output, call_count, success_rate, avg_latency_ms) VALUES
(1, 'web_search', 'Search the web and return ranked results', '{"query":{"type":"string","required":true},"num_results":{"type":"integer","default":10}}', '{"results":{"type":"array","items":{"title":"string","url":"string","snippet":"string"}}}', '{"query":"latest AI models 2025","num_results":5}', '{"results":[{"title":"GPT-5 Released","url":"https://openai.com","snippet":"OpenAI releases..."}]}', 2100000, 99.2, 210),
(1, 'news_search', 'Search recent news articles by topic or keyword', '{"query":{"type":"string"},"date_range":{"type":"string","default":"7d"}}', '{"articles":{"type":"array"}}', '{"query":"semiconductor shortage","date_range":"30d"}', '{"articles":[{"title":"Chip shortage continues..."}]}', 890000, 98.8, 180),
(2, 'read_pdf', 'Extract full text and metadata from a PDF URL or base64', '{"url":{"type":"string"},"extract_tables":{"type":"boolean","default":false}}', '{"text":"string","pages":["string"],"metadata":{}}', '{"url":"https://example.com/report.pdf","extract_tables":true}', '{"text":"Annual Report 2024...","pages":["Page 1 content..."]}', 1200000, 99.5, 340),
(2, 'read_docx', 'Parse Word documents and return structured content', '{"url":{"type":"string"},"include_formatting":{"type":"boolean"}}', '{"content":"string","sections":["string"]}', '{"url":"https://example.com/doc.docx"}', '{"content":"Contract text...","sections":["Header","Body"]}', 450000, 99.1, 290),
(3, 'store_memory', 'Store a memory chunk with semantic embedding', '{"content":"string","tags":["string"],"ttl_days":{"type":"integer"}}', '{"memory_id":"string","stored":true}', '{"content":"User prefers Python for data tasks","tags":["preference","python"]}', '{"memory_id":"mem_abc123","stored":true}', 4200000, 99.9, 45),
(3, 'search_memory', 'Search stored memories by semantic similarity', '{"query":"string","top_k":{"type":"integer","default":5},"tags":["string"]}', '{"memories":[{"id":"string","content":"string","score":"number"}]}', '{"query":"user coding preferences","top_k":3}', '{"memories":[{"id":"mem_abc123","content":"User prefers Python","score":0.95}]}', 3800000, 99.8, 38),
(4, 'run_python', 'Execute Python code and return stdout/result', '{"code":"string","timeout_ms":{"type":"integer","default":30000},"packages":["string"]}', '{"stdout":"string","result":"any","error":"string"}', '{"code":"import pandas as pd\ndf=pd.DataFrame({\"a\":[1,2,3]})\nprint(df.mean())","packages":["pandas"]}', '{"stdout":"a    2.0","result":null,"error":null}', 650000, 98.5, 950),
(4, 'run_javascript', 'Execute JavaScript/Node.js code in sandbox', '{"code":"string","timeout_ms":{"type":"integer","default":10000}}', '{"output":"string","error":"string"}', '{"code":"const result = [1,2,3].reduce((a,b)=>a+b,0); console.log(result)"}', '{"output":"6","error":null}', 320000, 98.9, 720),
(5, 'send_email', 'Send an email to one or more recipients', '{"to":["string"],"subject":"string","body":"string","html":{"type":"boolean","default":false}}', '{"message_id":"string","sent":true}', '{"to":["user@example.com"],"subject":"Hello","body":"Test email"}', '{"message_id":"msg_xyz789","sent":true}', 1800000, 99.7, 95),
(6, 'create_event', 'Create a calendar event with attendees and reminders', '{"title":"string","start":"string","end":"string","attendees":["string"],"calendar":"string"}', '{"event_id":"string","created":true}', '{"title":"Team Standup","start":"2025-05-06T10:00:00Z","end":"2025-05-06T10:30:00Z"}', '{"event_id":"evt_cal456","created":true}', 420000, 99.6, 180),
(7, 'execute_query', 'Run a parameterized SQL query against a connected database', '{"query":"string","params":["any"],"database_id":"string"}', '{"rows":["object"],"row_count":"integer"}', '{"query":"SELECT * FROM users WHERE active=$1","params":[true],"database_id":"db_prod"}', '{"rows":[{"id":1,"name":"Alice"}],"row_count":1}', 980000, 99.0, 420),
(8, 'analyze_image', 'Analyze image for objects, text, and content', '{"image_url":"string","features":["objects","text","faces","sentiment"]}', '{"objects":["string"],"text":"string","confidence":"number"}', '{"image_url":"https://example.com/img.jpg","features":["objects","text"]}', '{"objects":["person","laptop"],"text":"Hello World","confidence":0.97}', 820000, 99.3, 680),
(9, 'extract_pdf_tables', 'Extract tables from PDF as structured data', '{"url":"string","page_range":"string"}', '{"tables":[{"headers":["string"],"rows":[["string"]]}]}', '{"url":"https://example.com/data.pdf","page_range":"1-5"}', '{"tables":[{"headers":["Name","Value"],"rows":[["Row1","10"]]}]}', 380000, 98.7, 450),
(10, 'translate_text', 'Translate text to target language', '{"text":"string","target_language":"string","source_language":{"type":"string","default":"auto"}}', '{"translated_text":"string","detected_language":"string","confidence":"number"}', '{"text":"Hello world","target_language":"es"}', '{"translated_text":"Hola mundo","detected_language":"en","confidence":0.99}', 2900000, 99.8, 130),
(11, 'summarize_document', 'Generate a summary of a long document', '{"text":"string","max_length":{"type":"integer","default":200},"format":{"type":"string","default":"paragraph"}}', '{"summary":"string","key_points":["string"]}', '{"text":"Long document content...","max_length":150}', '{"summary":"The document covers...","key_points":["Point 1","Point 2"]}', 1700000, 99.5, 520),
(14, 'schedule_cron', 'Schedule a recurring task with cron expression', '{"cron":"string","endpoint":"string","payload":"object","timezone":"string"}', '{"schedule_id":"string","next_run":"string"}', '{"cron":"0 9 * * MON-FRI","endpoint":"https://myapp.com/daily-report"}', '{"schedule_id":"sch_mon123","next_run":"2025-05-06T09:00:00Z"}', 720000, 99.9, 60)
ON CONFLICT DO NOTHING;

INSERT INTO integrations (service_id, user_id, api_key_preview, connected_at, last_used, calls_this_month, calls_this_week, status, plan) VALUES
(1, 1, 'sk-ws-****4a2f', NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 hour', 45200, 8900, 'active', 'pro'),
(3, 1, 'mem-****7x9k', NOW() - INTERVAL '120 days', NOW() - INTERVAL '30 minutes', 128000, 22000, 'active', 'enterprise'),
(4, 1, 'ci-****2m8n', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 hours', 12400, 2800, 'active', 'pro'),
(5, 1, 'em-****9p3q', NOW() - INTERVAL '180 days', NOW() - INTERVAL '15 minutes', 89000, 18000, 'active', 'pro'),
(10, 1, 'tr-****6s1r', NOW() - INTERVAL '45 days', NOW() - INTERVAL '3 hours', 34000, 7200, 'active', 'basic'),
(2, 1, 'dr-****5t4u', NOW() - INTERVAL '30 days', NOW() - INTERVAL '6 hours', 8900, 1800, 'active', 'basic'),
(11, 1, 'sm-****8v5w', NOW() - INTERVAL '75 days', NOW() - INTERVAL '1 day', 22000, 4100, 'active', 'pro'),
(7, 1, 'dq-****3x6y', NOW() - INTERVAL '200 days', NOW() - INTERVAL '4 hours', 56000, 11000, 'active', 'enterprise'),
(6, 1, 'cm-****1y7z', NOW() - INTERVAL '90 days', NOW() - INTERVAL '12 hours', 4200, 980, 'active', 'basic'),
(8, 1, 'ia-****9z8a', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', 3400, 890, 'active', 'basic'),
(14, 1, 'sc-****7b9c', NOW() - INTERVAL '150 days', NOW() - INTERVAL '1 hour', 71000, 15000, 'active', 'pro'),
(15, 1, 'nt-****5d0e', NOW() - INTERVAL '180 days', NOW() - INTERVAL '45 minutes', 95000, 19500, 'active', 'enterprise'),
(9, 1, 'pp-****3f1g', NOW() - INTERVAL '40 days', NOW() - INTERVAL '3 days', 1200, 380, 'paused', 'basic'),
(12, 1, 'de-****1h2i', NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', 890, 210, 'active', 'basic'),
(13, 1, 'ff-****9j3k', NOW() - INTERVAL '10 days', NULL, 0, 0, 'paused', 'basic')
ON CONFLICT DO NOTHING;

INSERT INTO executions (tool_id, user_id, input_params, output_preview, status, duration_ms, tokens_used, cost_usd) VALUES
(1, 1, '{"query":"semiconductor shortage 2025","num_results":10}', 'Found 10 results. Top: "TSMC reports capacity constraints..."', 'success', 215, 450, 0.0045),
(5, 1, '{"content":"Meeting notes from Q1 planning session...","tags":["meeting","planning"]}', 'Memory stored with ID mem_q1plan001', 'success', 42, 120, 0.0012),
(7, 1, '{"code":"import numpy as np; result = np.array([1,2,3,4,5]); print(result.mean())","packages":["numpy"]}', '3.0', 'success', 1240, 280, 0.0028),
(9, 1, '{"to":["team@company.com"],"subject":"Weekly Summary","body":"Here is this weeks update..."}', 'Email sent successfully. Message ID: msg_wk001', 'success', 98, 200, 0.002),
(13, 1, '{"text":"Quarterly earnings exceeded expectations with 23% revenue growth...","max_length":100}', 'Q4 earnings surpassed forecasts showing 23% revenue growth driven by cloud segment expansion.', 'success', 680, 890, 0.0089),
(15, 1, '{"text":"Bonjour le monde, comment allez-vous?","target_language":"en"}', 'Hello world, how are you?', 'success', 135, 180, 0.0018),
(1, 1, '{"query":"OpenAI GPT-5 capabilities"}', 'No results found for specified query', 'failed', 3050, 0, 0),
(7, 1, '{"code":"import tensorflow as tf; model = tf.keras.Sequential(...)","packages":["tensorflow"]}', 'TimeoutError: Execution exceeded 30s limit', 'timeout', 30000, 0, 0),
(3, 1, '{"url":"https://sec.gov/filings/aapl-10k-2024.pdf","extract_tables":true}', 'Extracted 48 pages, 12 tables. Key financial data retrieved.', 'success', 2890, 1200, 0.012),
(11, 1, '{"image_url":"https://cdn.example.com/product-shot.jpg","features":["objects","text"]}', 'Detected: laptop, coffee cup, notepad. Text: "MacBook Pro 16"', 'success', 720, 340, 0.0034),
(2, 1, '{"query":"user preferences for data analysis","top_k":5}', 'Found 5 related memories. Top match: "User prefers pandas over SQL for small datasets" (0.94)', 'success', 38, 95, 0.00095),
(9, 1, '{"to":["ceo@bigcorp.com"],"subject":"Partnership Proposal"}', 'EmailDeliveryError: Recipient mailbox full', 'failed', 2100, 0, 0),
(13, 1, '{"text":"The supply chain disruption analysis report spanning 200 pages...","max_length":250}', 'Supply chain disruptions in 2025 continue to impact semiconductor and automotive sectors...', 'success', 980, 1100, 0.011),
(7, 1, '{"code":"for i in range(1000000): pass; print(sum(range(100)))","packages":[]}', '4950', 'success', 450, 180, 0.0018),
(5, 1, '{"content":"Customer meeting: They want enterprise contract by Q2","tags":["customer","contract","q2"]}', 'Memory stored with ID mem_cust_q2', 'success', 44, 125, 0.00125)
ON CONFLICT DO NOTHING;

INSERT INTO documentation (service_id, section, title, content, code_examples, last_updated, views) VALUES
(1, 'overview', 'Web Search API Overview', 'The Web Search API provides real-time access to web content with semantic understanding. It returns structured results including title, URL, snippet, and relevance score. Supports filtering by date, domain, and content type.', '# Python Example\nimport requests\nresponse = requests.get("https://api.websearch.ai/v2/search", headers={"X-API-Key": "your-key"}, params={"q": "AI news", "n": 5})', '2025-04-15', 1240),
(1, 'authentication', 'Web Search Authentication', 'The Web Search API uses API key authentication. Include your key in the X-API-Key header for all requests. Keys are available from your dashboard and can be rotated at any time.', 'curl -H "X-API-Key: your-key" "https://api.websearch.ai/v2/search?q=test"', '2025-04-10', 890),
(1, 'quickstart', 'Web Search Quickstart Guide', 'Get started in 5 minutes. Install our SDK, authenticate with your API key, and make your first search request. This guide covers basic search, filtering, and parsing results.', 'pip install websearch-sdk\nfrom websearch import Client\nclient = Client("your-api-key")\nresults = client.search("artificial intelligence", num_results=10)', '2025-05-01', 2100),
(3, 'overview', 'Memory Store Overview', 'Memory Store provides persistent, semantic memory for AI agents. Store arbitrary text chunks and retrieve them by semantic similarity. Supports tagging, TTL, and namespace isolation for multi-tenant deployments.', '// JavaScript\nconst memory = new MemoryStore("your-jwt-token");\nawait memory.store("User likes dark mode", { tags: ["preference"] });\nconst results = await memory.search("user UI preferences");', '2025-04-20', 3450),
(3, 'tools', 'Memory Store Tools Reference', 'Complete reference for store_memory and search_memory tools. Each tool accepts a JSON payload and returns structured results. See input/output schemas for full parameter documentation.', '{"store_memory": {"content": "string", "tags": ["string"], "ttl_days": 30}}', '2025-04-25', 1890),
(4, 'quickstart', 'Code Interpreter Quickstart', 'Run Python code securely in our sandboxed environment. Install packages on-demand, access the filesystem within your sandbox, and get structured output including stdout, return value, and errors.', 'result = client.run_python("""\nimport pandas as pd\ndf = pd.read_csv("data.csv")\nprint(df.describe())\n""", packages=["pandas"])', '2025-03-30', 2780),
(5, 'authentication', 'Email Sender Authentication', 'Email Sender uses API key authentication with optional DKIM signing. Configure your sending domain in the dashboard before sending. Rate limits apply per plan: 100/min (basic), 1000/min (pro), unlimited (enterprise).', 'import emailsvc\nclient = emailsvc.Client(api_key="em-your-key")\nclient.send(to=["user@example.com"], subject="Hello", body="World")', '2025-04-05', 1120),
(10, 'overview', 'Translation API Overview', 'Translate text between 120+ languages with industry-leading accuracy. Supports auto-detection, batch translation, domain-specific models (legal, medical, technical), and glossary customization.', 'import translate_ai\nclient = translate_ai.Client("your-key")\nresult = client.translate("Hola mundo", target="en")\nprint(result.translated_text) # "Hello world"', '2025-04-28', 1560),
(11, 'tools', 'Summarizer Tools Reference', 'The Summarizer provides three tools: summarize_document (full document), summarize_conversation (chat/transcript), and extract_key_points (bullet points only). All support custom length and format options.', '{"summarize_document": {"text": "Long text...", "max_length": 200, "format": "bullets"}}', '2025-04-12', 980),
(7, 'errors', 'Database Query Error Reference', 'Common errors: DB_CONN_FAILED (cannot reach database), QUERY_TIMEOUT (exceeded 30s limit), PERMISSION_DENIED (insufficient privileges), SYNTAX_ERROR (invalid SQL). All errors include a message and suggested fix.', '{"error": "QUERY_TIMEOUT", "message": "Query exceeded 30s limit", "suggestion": "Add indexes or limit result set"}', '2025-04-08', 670),
(2, 'quickstart', 'Document Reader Quickstart', 'Start reading documents in 3 steps: connect your API key, provide a document URL or base64 content, and receive structured text with optional table extraction. Supports PDF, DOCX, XLSX, and HTML.', 'doc = client.read_pdf(url="https://example.com/report.pdf", extract_tables=True)\nprint(doc.text[:500])\nfor table in doc.tables:\n    print(table.to_dataframe())', '2025-05-02', 1340),
(8, 'overview', 'Image Analysis Overview', 'Analyze images using state-of-the-art computer vision models. Detect objects, read text (OCR), recognize faces, classify content, and moderate for policy violations. Returns confidence scores for all detections.', 'analysis = client.analyze(image_url="https://cdn.example.com/img.jpg", features=["objects", "text", "sentiment"])\nprint(analysis.objects) # ["person", "laptop", "coffee"]\nprint(analysis.text) # "Meeting Notes 2025"', '2025-04-22', 2230),
(14, 'overview', 'Scheduler Overview', 'Schedule recurring tasks and one-time jobs using cron expressions or relative intervals. Supports HTTP webhooks, queue messages, and agent triggers. Includes retry logic, failure notifications, and execution history.', 'scheduler = Scheduler(jwt_token="your-token")\njob = scheduler.create_cron(expression="0 9 * * MON-FRI", endpoint="https://myapp.com/report", payload={"type": "weekly"})', '2025-04-18', 890),
(15, 'authentication', 'Notifier Authentication', 'Notifier uses API keys for authentication. Each key is scoped to specific channels (SMS, push, Slack, etc.). Configure channel credentials in the dashboard before sending notifications.', 'notifier = Notifier(api_key="nt-your-key")\nnotifier.send_slack(channel="#engineering", message="Deploy complete!")\nnotifier.send_sms(to="+15551234567", message="Alert: Service down")', '2025-04-30', 1450),
(12, 'quickstart', 'Data Extractor Quickstart', 'Define a schema for the data you want to extract, then pass unstructured text. The extractor uses LLM-powered parsing to find and structure the requested fields from any text format.', 'schema = {"company_name": "string", "revenue": "number", "ceo": "string"}\nresult = extractor.extract(text=earnings_report, schema=schema)\nprint(result) # {"company_name": "Acme Corp", "revenue": 1200000000, "ceo": "Jane Doe"}', '2025-04-25', 760)
ON CONFLICT DO NOTHING;

INSERT INTO usage_metrics (service_id, metric_date, total_calls, success_calls, failed_calls, avg_latency_ms, p99_latency_ms, unique_users) VALUES
(1, CURRENT_DATE - 1, 148000, 146500, 1500, 212, 890, 4200),
(1, CURRENT_DATE - 2, 142000, 140800, 1200, 208, 870, 4100),
(1, CURRENT_DATE - 7, 135000, 134000, 1000, 215, 910, 3900),
(3, CURRENT_DATE - 1, 290000, 289500, 500, 44, 210, 8900),
(3, CURRENT_DATE - 2, 285000, 284600, 400, 46, 220, 8750),
(3, CURRENT_DATE - 7, 270000, 269700, 300, 43, 200, 8200),
(5, CURRENT_DATE - 1, 108000, 107500, 500, 94, 380, 3200),
(5, CURRENT_DATE - 2, 102000, 101600, 400, 96, 390, 3150),
(10, CURRENT_DATE - 1, 185000, 184600, 400, 131, 520, 5600),
(10, CURRENT_DATE - 7, 172000, 171700, 300, 128, 510, 5200),
(4, CURRENT_DATE - 1, 41000, 40100, 900, 870, 4800, 1100),
(4, CURRENT_DATE - 3, 38000, 37200, 800, 890, 4900, 1050),
(11, CURRENT_DATE - 1, 112000, 111500, 500, 525, 1800, 3300),
(15, CURRENT_DATE - 1, 238000, 237800, 200, 74, 290, 7100),
(14, CURRENT_DATE - 1, 49000, 48950, 50, 61, 240, 1450)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Audit-implementation seed data (2026-05-14)
-- Real frameworks, real BFCL/AgentBench scores, real MCP servers.
-- ============================================================================

INSERT INTO agents (agent_id, display_name, organization, framework, framework_version, model_id, verified_principal, verification_method, capabilities, bfcl_score, agentbench_score, trust_tier, status, last_seen_at) VALUES
('agt_anthropic_001', 'Claude Code', 'Anthropic', 'claude-agent-sdk', '0.4.2', 'anthropic/claude-opus-4-7', 'support@anthropic.com', 'dns_txt', '["coding","filesystem","bash","web_search"]', 95.2, 88.1, 'partner', 'active', NOW() - INTERVAL '5 minutes'),
('agt_oai_research_42', 'Deep Research GPT', 'OpenAI', 'openai-agents-sdk', '1.2.0', 'openai/gpt-4o', 'research@openai.com', 'dns_txt', '["web_search","summarize","cite"]', 82.4, 76.9, 'partner', 'active', NOW() - INTERVAL '2 hours'),
('agt_langchain_dev_07', 'LangGraph Support Triage', 'LangChain Inc.', 'langgraph', '0.2.34', 'anthropic/claude-sonnet-4-7', 'team@langchain.dev', 'email', '["ticketing","kb_search","escalation"]', 91.1, 83.4, 'verified', 'active', NOW() - INTERVAL '12 minutes'),
('agt_crewai_sales_11', 'CrewAI Outbound Crew', 'Independent', 'crewai', '0.86.0', 'openai/gpt-4o-mini', 'eng@indie.dev', 'email', '["crm","email_send","calendar"]', 71.5, 64.2, 'verified', 'active', NOW() - INTERVAL '1 day'),
('agt_autogen_eng_22', 'AutoGen Code Reviewer', 'Microsoft', 'autogen', '0.4.1', 'openai/gpt-4o', 'autogen@microsoft.com', 'dns_txt', '["code_review","git","static_analysis"]', 87.6, 81.0, 'partner', 'active', NOW() - INTERVAL '40 minutes'),
('agt_mastra_ops_55', 'Mastra Ops Brain', 'Acme Operations', 'mastra', '0.5.7', 'anthropic/claude-haiku-4.5', 'ops@acme.example', 'email', '["incidents","pagerduty","slack"]', 78.3, 70.5, 'verified', 'active', NOW() - INTERVAL '8 hours'),
('agt_internal_ci_99', 'CI Build Bot', 'Acme Engineering', 'claude-agent-sdk', '0.4.2', 'anthropic/claude-haiku-4.5', 'eng@acme.example', 'oidc', '["bash","filesystem","github_pr"]', 88.0, 79.4, 'trusted', 'active', NOW() - INTERVAL '3 minutes'),
('agt_replit_agent', 'Replit Agent', 'Replit', 'custom', '2.0', 'anthropic/claude-sonnet-4-7', 'agent@replit.com', 'dns_txt', '["codegen","filesystem","preview"]', 84.7, 77.2, 'partner', 'active', NOW() - INTERVAL '20 minutes'),
('agt_cursor_composer', 'Cursor Composer', 'Cursor', 'custom', '0.42', 'anthropic/claude-opus-4-7', 'agent@cursor.com', 'dns_txt', '["codegen","refactor","test_gen"]', 90.9, 82.6, 'partner', 'active', NOW() - INTERVAL '10 minutes'),
('agt_devin_se_001', 'Devin SE', 'Cognition', 'custom', '1.0', 'anthropic/claude-opus-4-7', 'devin@cognition.ai', 'dns_txt', '["swe","browser","terminal"]', 89.4, 86.7, 'partner', 'active', NOW() - INTERVAL '50 minutes'),
('agt_browseruse_01', 'BrowserUse Agent', 'BrowserUse', 'custom', '0.3.1', 'openai/gpt-4o', 'hello@browser-use.com', 'email', '["browser","forms","scraping"]', 73.0, 65.8, 'verified', 'active', NOW() - INTERVAL '15 hours'),
('agt_finetune_eval', 'BFCL Eval Bot', 'Berkeley NLP', 'custom', '1.0', 'meta/llama-3.3-70b', 'gorilla@berkeley.edu', 'dns_txt', '["function_calling","eval"]', 67.2, 58.1, 'verified', 'active', NOW() - INTERVAL '7 days'),
('agt_unknown_drift', 'unknown', NULL, 'unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'unverified', 'pending_review', NOW() - INTERVAL '30 days'),
('agt_payments_bot', 'Payments Reconciliation', 'Acme Finance', 'langchain', '0.3.18', 'anthropic/claude-sonnet-4-7', 'finance@acme.example', 'email', '["payments","stripe","ledger"]', 80.4, 72.1, 'verified', 'active', NOW() - INTERVAL '4 hours'),
('agt_data_pipeline', 'Data Pipeline Curator', 'Acme Data', 'langgraph', '0.2.34', 'anthropic/claude-haiku-4.5', 'data@acme.example', 'oidc', '["sql","airflow","dbt"]', 76.8, 69.3, 'trusted', 'active', NOW() - INTERVAL '90 minutes'),
('agt_support_assist', 'Customer Support Asst', 'Acme Customer', 'crewai', '0.86.0', 'openai/gpt-4o-mini', 'support@acme.example', 'email', '["zendesk","kb","slack"]', 69.5, 62.0, 'verified', 'active', NOW() - INTERVAL '6 hours'),
('agt_legal_drafter', 'Legal Drafter', 'Acme Legal', 'claude-agent-sdk', '0.4.2', 'anthropic/claude-opus-4-7', 'legal@acme.example', 'oidc', '["doc_drafting","redline","citation"]', 86.1, 78.9, 'trusted', 'active', NOW() - INTERVAL '2 hours'),
('agt_research_summarizer', 'Research Summarizer', 'Indie Lab', 'openai-agents-sdk', '1.2.0', 'openai/o1-mini', 'me@indie.dev', 'email', '["arxiv","semantic_scholar","cite"]', 74.6, 67.4, 'verified', 'active', NOW() - INTERVAL '1 day'),
('agt_email_triager', 'Email Triage Agent', 'Acme Sales', 'mastra', '0.5.7', 'anthropic/claude-haiku-4.5', 'sales@acme.example', 'email', '["gmail","crm","calendar"]', 72.9, 66.0, 'verified', 'active', NOW() - INTERVAL '3 hours'),
('agt_security_scanner', 'Security Scanner', 'Acme Security', 'autogen', '0.4.1', 'openai/gpt-4o', 'sec@acme.example', 'dns_txt', '["sast","dast","secrets_scan"]', 81.7, 75.4, 'trusted', 'active', NOW() - INTERVAL '20 minutes')
ON CONFLICT (agent_id) DO NOTHING;

INSERT INTO agent_api_keys (agent_id, key_prefix, key_hash, scopes, rate_limit_rpm, rate_limit_tpm, expires_at, revoked, last_used_at) VALUES
(1, 'sk_live_anth_***k82', 'a8f7d2e1b3c4f5e6a9b8d7c6e5f4d3c2b1a0', '["tools:read","tools:invoke","executions:write","mcp:list"]', 600, 1000000, NOW() + INTERVAL '90 days', FALSE, NOW() - INTERVAL '5 minutes'),
(2, 'sk_live_oai_***q41', 'b9e8d7c6a5f4e3d2c1b0a9d8e7f6c5b4a3', '["tools:read","tools:invoke"]', 300, 500000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '2 hours'),
(3, 'sk_live_lc_***w07', 'c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4', '["tools:read","tools:invoke","executions:write"]', 240, 400000, NOW() + INTERVAL '365 days', FALSE, NOW() - INTERVAL '12 minutes'),
(4, 'sk_live_crew_***x11', 'd1c0b9a8f7e6d5c4b3a2e1d0c9b8a7f6e5', '["tools:invoke","crm:write"]', 120, 200000, NOW() + INTERVAL '60 days', FALSE, NOW() - INTERVAL '1 day'),
(5, 'sk_live_ag_***v22', 'e2f1d0c9b8a7e6d5c4b3a2f1e0d9c8b7a6', '["tools:read","tools:invoke","code:exec"]', 480, 800000, NOW() + INTERVAL '90 days', FALSE, NOW() - INTERVAL '40 minutes'),
(7, 'sk_live_ci_***i99', 'f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7', '["tools:invoke","fs:write","github:write"]', 60, 100000, NOW() + INTERVAL '30 days', FALSE, NOW() - INTERVAL '3 minutes'),
(8, 'sk_live_repl_***r01', '04f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8', '["tools:invoke","fs:rw"]', 240, 400000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '20 minutes'),
(9, 'sk_live_cur_***c42', '150e4f3d2c1b0a9f8e7d6c5b4a3f2e1d0c', '["tools:read","tools:invoke","refactor:exec"]', 600, 1000000, NOW() + INTERVAL '365 days', FALSE, NOW() - INTERVAL '10 minutes'),
(10, 'sk_live_devn_***d01', '261f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c', '["tools:invoke","browser:exec","terminal:exec"]', 360, 600000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '50 minutes'),
(7, 'sk_test_ci_***old', '372a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d', '["tools:read"]', 30, 50000, NOW() - INTERVAL '15 days', TRUE, NOW() - INTERVAL '30 days'),
(11, 'sk_live_brws_***b01', '483b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e', '["tools:invoke","browser:exec"]', 120, 200000, NOW() + INTERVAL '90 days', FALSE, NOW() - INTERVAL '15 hours'),
(14, 'sk_live_pay_***p14', '594c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f', '["tools:invoke","payments:read","payments:write"]', 180, 300000, NOW() + INTERVAL '365 days', FALSE, NOW() - INTERVAL '4 hours'),
(15, 'sk_live_data_***d15', '6a5d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a', '["tools:invoke","sql:exec"]', 300, 500000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '90 minutes'),
(16, 'sk_live_supp_***s16', '7b6eadc9b8a7f6e5d4c3b2a1f0e9d8c7b6', '["tools:read","tools:invoke"]', 120, 200000, NOW() + INTERVAL '90 days', FALSE, NOW() - INTERVAL '6 hours'),
(17, 'sk_live_legl_***l17', '8c7fbedca9b8a7f6e5d4c3b2a1f0e9d8c7', '["tools:read","tools:invoke","doc:rw"]', 60, 100000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '2 hours'),
(18, 'sk_live_rsch_***r18', '9d80cfedcba9b8a7f6e5d4c3b2a1f0e9d8', '["tools:read","tools:invoke"]', 120, 200000, NOW() + INTERVAL '365 days', FALSE, NOW() - INTERVAL '1 day'),
(19, 'sk_live_etri_***e19', 'ae91dafedcba9b8a7f6e5d4c3b2a1f0e9d', '["tools:invoke","gmail:rw"]', 240, 400000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '3 hours'),
(20, 'sk_live_sec_***s20', 'bfa2ebfedcba9b8a7f6e5d4c3b2a1f0e9d', '["tools:invoke","sast:exec","secrets:read"]', 480, 800000, NOW() + INTERVAL '90 days', FALSE, NOW() - INTERVAL '20 minutes'),
(6, 'sk_live_ops_***o55', 'c0b3fcfedcba9b8a7f6e5d4c3b2a1f0e9d', '["tools:invoke","incidents:rw"]', 180, 300000, NOW() + INTERVAL '180 days', FALSE, NOW() - INTERVAL '8 hours'),
(13, 'sk_live_drift_old', 'd1c40dfedcba9b8a7f6e5d4c3b2a1f0e9d', '["tools:read"]', 30, 50000, NOW() - INTERVAL '60 days', TRUE, NOW() - INTERVAL '60 days'),
(12, 'sk_test_bfcl_***b12', 'e2d51efedcba9b8a7f6e5d4c3b2a1f0e9d', '["tools:read","tools:invoke","eval:run"]', 60, 100000, NOW() + INTERVAL '30 days', FALSE, NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

INSERT INTO mcp_servers (slug, name, description, source_service_id, transport, manifest_url, endpoint_url, mcp_version, tools_count, prompts_count, resources_count, publisher, publisher_verified, install_count, rating, pricing_model, category, tags, source_url) VALUES
('filesystem-mcp', 'Filesystem MCP', 'Read, write, and search local files with scoped path access. Reference implementation in Anthropic MCP docs.', NULL, 'stdio', NULL, NULL, '2025-06-18', 8, 0, 2, 'Anthropic', TRUE, 142000, 4.9, 'free', 'system', '["filesystem","reference","official"]', 'https://github.com/modelcontextprotocol/servers'),
('github-mcp', 'GitHub MCP', 'Issues, PRs, files, search, and code review tools against the GitHub API.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.github.com', '2025-06-18', 24, 3, 4, 'GitHub', TRUE, 89000, 4.8, 'byok', 'devtools', '["git","github","code"]', 'https://github.com/github/github-mcp-server'),
('slack-mcp', 'Slack MCP', 'Send messages, read channels, manage threads in Slack workspaces.', NULL, 'http', '/.well-known/mcp.json', 'https://slack.mcp.dev', '2025-06-18', 12, 1, 2, 'Community', FALSE, 54000, 4.5, 'free', 'communication', '["slack","chat"]', 'https://github.com/modelcontextprotocol/servers/slack'),
('postgres-mcp', 'Postgres MCP', 'Read-only and read-write SQL access with schema introspection.', 7, 'stdio', NULL, NULL, '2025-06-18', 6, 0, 1, 'Anthropic', TRUE, 78000, 4.7, 'free', 'data', '["sql","postgres","database"]', 'https://github.com/modelcontextprotocol/servers/postgres'),
('websearch-mcp', 'WebSearch MCP', 'Realtime web search wrapper exposing AgentHub Web Search as an MCP server.', 1, 'http', '/api/mcp/websearch/manifest', 'https://mcp.agenthub.dev/websearch', '2025-06-18', 2, 0, 0, 'AgentHub', TRUE, 31000, 4.6, 'usage', 'search', '["search","web"]', NULL),
('memory-mcp', 'Memory MCP', 'Persistent vector memory for agents. Backed by AgentHub Memory Store.', 3, 'http', '/api/mcp/memory/manifest', 'https://mcp.agenthub.dev/memory', '2025-06-18', 4, 0, 1, 'AgentHub', TRUE, 22000, 4.8, 'usage', 'storage', '["memory","vector","embeddings"]', NULL),
('puppeteer-mcp', 'Puppeteer MCP', 'Browser automation: navigate, click, fill, screenshot.', NULL, 'stdio', NULL, NULL, '2025-06-18', 14, 0, 0, 'Anthropic', TRUE, 65000, 4.4, 'free', 'browser', '["browser","automation"]', 'https://github.com/modelcontextprotocol/servers/puppeteer'),
('linear-mcp', 'Linear MCP', 'Create, update, query Linear issues, projects, and cycles.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.linear.app', '2025-06-18', 16, 2, 3, 'Linear', TRUE, 41000, 4.7, 'byok', 'productivity', '["linear","tracker"]', NULL),
('notion-mcp', 'Notion MCP', 'Search, read, append to Notion databases and pages.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.notion.so', '2025-06-18', 18, 1, 4, 'Notion', TRUE, 38000, 4.5, 'free', 'productivity', '["notion","docs"]', NULL),
('gmail-mcp', 'Gmail MCP', 'Read, send, and label Gmail messages via OAuth.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.gmail.app', '2025-06-18', 10, 1, 2, 'Community', FALSE, 27000, 4.3, 'byok', 'communication', '["gmail","email"]', 'https://github.com/community/gmail-mcp'),
('stripe-mcp', 'Stripe MCP', 'Customers, charges, subscriptions via Stripe API.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.stripe.com', '2025-06-18', 28, 2, 6, 'Stripe', TRUE, 19000, 4.9, 'byok', 'payments', '["stripe","payments"]', NULL),
('aws-mcp', 'AWS MCP', 'S3, Lambda, EC2, CloudWatch via boto3-equivalent tools.', NULL, 'stdio', NULL, NULL, '2025-06-18', 42, 4, 8, 'Community', FALSE, 35000, 4.2, 'byok', 'cloud', '["aws","cloud"]', 'https://github.com/community/aws-mcp'),
('arxiv-mcp', 'arXiv MCP', 'Search, fetch, and summarize arXiv papers.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.arxiv.org', '2025-06-18', 6, 0, 2, 'Community', FALSE, 14000, 4.6, 'free', 'research', '["arxiv","research","papers"]', 'https://github.com/community/arxiv-mcp'),
('codeinterpreter-mcp', 'Code Interpreter MCP', 'Sandboxed Python/JS execution via AgentHub Code Interpreter.', 4, 'http', '/api/mcp/code/manifest', 'https://mcp.agenthub.dev/code', '2025-06-18', 4, 0, 0, 'AgentHub', TRUE, 11000, 4.7, 'usage', 'compute', '["code","sandbox"]', NULL),
('docreader-mcp', 'Doc Reader MCP', 'Extract structured content from PDF, DOCX, XLSX, HTML.', 2, 'http', '/api/mcp/docreader/manifest', 'https://mcp.agenthub.dev/docreader', '2025-06-18', 5, 0, 0, 'AgentHub', TRUE, 9000, 4.5, 'usage', 'data', '["pdf","docx"]', NULL),
('calendar-mcp', 'Calendar MCP', 'Google/Outlook/CalDAV calendar tools.', 6, 'http', '/api/mcp/calendar/manifest', 'https://mcp.agenthub.dev/calendar', '2025-06-18', 8, 1, 2, 'AgentHub', TRUE, 8500, 4.4, 'usage', 'productivity', '["calendar","scheduling"]', NULL),
('translate-mcp', 'Translate MCP', '120+ language translation, with glossaries and domain models.', 10, 'http', '/api/mcp/translate/manifest', 'https://mcp.agenthub.dev/translate', '2025-06-18', 3, 0, 0, 'AgentHub', TRUE, 7200, 4.7, 'usage', 'communication', '["translation","i18n"]', NULL),
('vision-mcp', 'Vision MCP', 'Object detection, OCR, sentiment from images.', 8, 'http', '/api/mcp/vision/manifest', 'https://mcp.agenthub.dev/vision', '2025-06-18', 5, 0, 0, 'AgentHub', TRUE, 6800, 4.5, 'usage', 'compute', '["vision","ocr"]', NULL),
('notifier-mcp', 'Notifier MCP', 'SMS, push, webhook, Slack, Teams notifications.', 15, 'http', '/api/mcp/notifier/manifest', 'https://mcp.agenthub.dev/notifier', '2025-06-18', 6, 0, 0, 'AgentHub', TRUE, 12000, 4.6, 'usage', 'communication', '["sms","push","slack"]', NULL),
('shell-mcp', 'Shell MCP', 'Execute shell commands in a sandboxed container.', NULL, 'stdio', NULL, NULL, '2025-06-18', 4, 0, 0, 'Anthropic', TRUE, 49000, 4.3, 'free', 'system', '["shell","bash"]', 'https://github.com/modelcontextprotocol/servers/shell'),
('jira-mcp', 'Jira MCP', 'Query and update Jira issues, projects, sprints.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.atlassian.com/jira', '2025-06-18', 22, 2, 4, 'Atlassian', TRUE, 23000, 4.2, 'byok', 'productivity', '["jira","tracker"]', NULL),
('zendesk-mcp', 'Zendesk MCP', 'Tickets, users, macros in Zendesk Support.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.zendesk.com', '2025-06-18', 14, 1, 3, 'Zendesk', TRUE, 6500, 4.3, 'byok', 'support', '["zendesk","tickets"]', NULL),
('salesforce-mcp', 'Salesforce MCP', 'Accounts, opportunities, contacts via SF REST API.', NULL, 'http', '/.well-known/mcp.json', 'https://mcp.salesforce.com', '2025-06-18', 36, 3, 5, 'Salesforce', TRUE, 17000, 4.0, 'byok', 'crm', '["salesforce","crm"]', NULL),
('docker-mcp', 'Docker MCP', 'List containers, build images, run commands.', NULL, 'stdio', NULL, NULL, '2025-06-18', 12, 0, 0, 'Community', FALSE, 21000, 4.4, 'free', 'devtools', '["docker","containers"]', 'https://github.com/community/docker-mcp'),
('fetch-mcp', 'Fetch MCP', 'HTTP GET/POST with response parsing for agents.', NULL, 'stdio', NULL, NULL, '2025-06-18', 3, 0, 0, 'Anthropic', TRUE, 87000, 4.5, 'free', 'network', '["http","fetch"]', 'https://github.com/modelcontextprotocol/servers/fetch')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO quota_tiers (name, monthly_calls_included, overage_price_per_1k_usd, monthly_price_usd, rate_limit_rpm, rate_limit_tpm, max_parallel_executions, features, sort_order) VALUES
('Free', 5000, NULL, 0, 30, 50000, 2, '["10 services","sandbox only","community support"]', 1),
('Developer', 100000, 0.50, 49, 120, 200000, 10, '["all services","prod execution","email support","99% SLA"]', 2),
('Scale', 2000000, 0.20, 499, 600, 1000000, 50, '["all services","priority routing","99.9% SLA","Slack support","dedicated region"]', 3),
('Enterprise', 50000000, 0.05, 4999, 6000, 10000000, 500, '["custom SLA","private MCP servers","SSO/SAML","DPA + BAA","named CSM","on-prem option"]', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO quota_usage (agent_id, tier_id, period_start, period_end, calls_used, tokens_used, cost_accrued_usd, overage_calls, throttled_count) VALUES
(1, 4, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 12480000, 18900000000, 4999.00, 0, 0),
(2, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 1850000, 2400000000, 499.00, 0, 12),
(3, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 2120000, 2900000000, 523.00, 120000, 3),
(4, 2, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 78000, 95000000, 49.00, 0, 0),
(5, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 1620000, 2100000000, 499.00, 0, 1),
(6, 2, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 51000, 64000000, 49.00, 0, 0),
(7, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 920000, 1100000000, 499.00, 0, 0),
(8, 4, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 4400000, 6200000000, 4999.00, 0, 0),
(9, 4, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 8100000, 12400000000, 4999.00, 0, 0),
(10, 4, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 6700000, 9800000000, 4999.00, 0, 0),
(11, 2, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 41000, 52000000, 49.00, 0, 7),
(14, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 380000, 470000000, 499.00, 0, 0),
(15, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 750000, 1900000000, 499.00, 0, 2),
(16, 2, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 68000, 84000000, 49.00, 0, 0),
(17, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 240000, 320000000, 499.00, 0, 0),
(18, 1, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 4800, 5900000, 0, 0, 4),
(19, 2, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 92000, 110000000, 49.00, 0, 0),
(20, 3, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 480000, 620000000, 499.00, 0, 0),
(12, 1, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 4950, 6100000, 0, 0, 2),
(13, 1, DATE_TRUNC('month', CURRENT_DATE)::date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date, 5200, 7000000, 0, 200, 1)
ON CONFLICT DO NOTHING;

INSERT INTO sandbox_runs (agent_id, tool_id, idempotency_key, input_payload, output_payload, schema_valid, schema_errors, duration_ms, dry_run, status_code, error_code) VALUES
(1, 1, 'idem_anth_001a', '{"query":"semiconductor exports 2026","num_results":5}', '{"results":[{"title":"...","url":"..."}]}', TRUE, NULL, 210, TRUE, 200, NULL),
(1, 1, 'idem_anth_001b', '{"query":"","num_results":5}', NULL, FALSE, '[{"path":"query","message":"String must be at least 1 character"}]', 4, TRUE, 400, 'BAD_INPUT'),
(2, 11, 'idem_oai_t01', '{"text":"Bonjour","target_language":"en"}', '{"translated_text":"Hello","detected_language":"fr"}', TRUE, NULL, 130, TRUE, 200, NULL),
(3, 5, 'idem_lc_m01', '{"content":"User likes dark mode","tags":["preference"]}', '{"memory_id":"mem_dryrun_001"}', TRUE, NULL, 38, TRUE, 200, NULL),
(3, 6, 'idem_lc_m02', '{"query":"user prefs","top_k":3}', '{"memories":[{"id":"mem_dryrun_001","score":0.91}]}', TRUE, NULL, 41, TRUE, 200, NULL),
(4, 9, 'idem_crew_e01', '{"to":["lead@acme.example"],"subject":"Demo"}', NULL, FALSE, '[{"path":"body","message":"Required"}]', 6, TRUE, 400, 'BAD_INPUT'),
(5, 7, 'idem_ag_c01', '{"code":"print(2+2)","packages":[]}', '{"stdout":"4","result":null}', TRUE, NULL, 720, TRUE, 200, NULL),
(7, 7, 'idem_ci_c01', '{"code":"while True: pass","timeout_ms":1000}', NULL, TRUE, NULL, 1010, TRUE, 408, 'TIMEOUT'),
(8, 7, 'idem_repl_c01', '{"code":"print(\"hi\")","packages":[]}', '{"stdout":"hi","result":null}', TRUE, NULL, 690, TRUE, 200, NULL),
(9, 1, 'idem_cur_w01', '{"query":"React useEffect cleanup pattern","num_results":3}', '{"results":[{"title":"React docs..."}]}', TRUE, NULL, 195, TRUE, 200, NULL),
(10, 11, 'idem_devn_t01', '{"text":"const x = 1","target_language":"python"}', NULL, FALSE, '[{"path":"target_language","message":"Must be valid ISO 639-1 code"}]', 5, TRUE, 400, 'BAD_INPUT'),
(11, 12, 'idem_brws_i01', '{"image_url":"https://x.example/a.png","features":["text"]}', '{"text":"hello","confidence":0.92}', TRUE, NULL, 680, TRUE, 200, NULL),
(14, 7, 'idem_pay_c01', '{"code":"stripe.charges.list(limit=10)","packages":["stripe"]}', '{"stdout":"...","result":null}', TRUE, NULL, 940, TRUE, 200, NULL),
(15, 11, 'idem_data_q01', '{"query":"SELECT count(*) FROM users","params":[],"database_id":"db_prod"}', '{"rows":[{"count":4218}],"row_count":1}', TRUE, NULL, 430, TRUE, 200, NULL),
(15, 11, 'idem_data_q02', '{"query":"DROP TABLE users","params":[]}', NULL, TRUE, NULL, 2, TRUE, 403, 'POLICY_DENIED'),
(16, 13, 'idem_supp_s01', '{"text":"Customer issue: cant login...","max_length":80}', '{"summary":"Login failure; suggest 2FA reset."}', TRUE, NULL, 510, TRUE, 200, NULL),
(17, 4, 'idem_legl_d01', '{"url":"https://example.com/contract.pdf"}', '{"text":"Master Services Agreement..."}', TRUE, NULL, 1840, TRUE, 200, NULL),
(18, 13, 'idem_rsch_s01', '{"text":"<long arxiv paper>","max_length":300}', '{"summary":"Paper proposes..."}', TRUE, NULL, 920, TRUE, 200, NULL),
(19, 9, 'idem_etri_e01', '{"to":["x@y.com"],"subject":"Hi","body":"Test"}', '{"message_id":"msg_dry_001","sent":true}', TRUE, NULL, 88, TRUE, 200, NULL),
(20, 12, 'idem_sec_i01', '{"image_url":"https://x.example/code.png","features":["text"]}', '{"text":"...source code...","confidence":0.88}', TRUE, NULL, 720, TRUE, 200, NULL),
(1, 1, 'idem_anth_dup', '{"query":"cached test"}', '{"results":[{"title":"Cached"}]}', TRUE, NULL, 1, TRUE, 200, 'IDEMPOTENT_CACHED')
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO replay_traces (trace_id, agent_id, workflow_name, framework, step_count, tool_calls, total_latency_ms, total_tokens, success, outcome_label) VALUES
('trc_lg_001', 3, 'support-triage-v3', 'langgraph', 5, '[{"tool":"search_memory","ms":42},{"tool":"web_search","ms":210},{"tool":"summarize_document","ms":520},{"tool":"send_email","ms":95},{"tool":"store_memory","ms":44}]', 911, 4200, TRUE, 'success'),
('trc_lg_002', 3, 'support-triage-v3', 'langgraph', 6, '[{"tool":"search_memory","ms":40},{"tool":"web_search","ms":2100,"error":"timeout"}]', 2140, 800, FALSE, 'failed'),
('trc_crew_001', 4, 'outbound-blast-v2', 'crewai', 8, '[{"tool":"execute_query","ms":420},{"tool":"create_event","ms":180},{"tool":"send_email","ms":98}]', 698, 1800, TRUE, 'success'),
('trc_ag_001', 5, 'pr-review-v4', 'autogen', 12, '[{"tool":"execute_query","ms":410},{"tool":"run_python","ms":1240},{"tool":"summarize_document","ms":510}]', 2160, 6200, TRUE, 'success'),
('trc_ag_002', 5, 'pr-review-v4', 'autogen', 9, '[{"tool":"run_python","ms":30000,"error":"timeout"}]', 30000, 0, FALSE, 'failed'),
('trc_cs_001', 1, 'code-edit-loop', 'claude-agent-sdk', 22, '[{"tool":"read_pdf","ms":290},{"tool":"run_python","ms":950},{"tool":"send_email","ms":98},{"tool":"store_memory","ms":44}]', 1382, 12400, TRUE, 'success'),
('trc_cs_002', 7, 'ci-build-flow', 'claude-agent-sdk', 6, '[{"tool":"run_python","ms":880},{"tool":"execute_query","ms":420}]', 1300, 2100, TRUE, 'success'),
('trc_cs_003', 7, 'ci-build-flow', 'claude-agent-sdk', 4, '[{"tool":"run_python","ms":3050,"error":"OOMKilled"}]', 3050, 800, FALSE, 'failed'),
('trc_oai_001', 2, 'deep-research', 'openai-agents-sdk', 18, '[{"tool":"web_search","ms":210},{"tool":"read_pdf","ms":2890},{"tool":"summarize_document","ms":980}]', 4080, 18000, TRUE, 'success'),
('trc_oai_002', 2, 'deep-research', 'openai-agents-sdk', 14, '[{"tool":"web_search","ms":215},{"tool":"summarize_document","ms":520,"output_truncated":true}]', 735, 4200, TRUE, 'partial'),
('trc_repl_001', 8, 'codegen-preview', 'custom', 9, '[{"tool":"run_javascript","ms":720},{"tool":"store_memory","ms":44}]', 764, 1200, TRUE, 'success'),
('trc_cur_001', 9, 'refactor-sweep', 'custom', 14, '[{"tool":"read_pdf","ms":290},{"tool":"run_javascript","ms":680}]', 970, 4200, TRUE, 'success'),
('trc_devn_001', 10, 'swe-bench-task', 'custom', 38, '[{"tool":"run_python","ms":2100},{"tool":"execute_query","ms":410}]', 2510, 24000, TRUE, 'success'),
('trc_devn_002', 10, 'swe-bench-task', 'custom', 41, '[{"tool":"run_python","ms":4200,"error":"AssertionError"}]', 4200, 18000, FALSE, 'failed'),
('trc_mast_001', 6, 'incident-response', 'mastra', 7, '[{"tool":"send_email","ms":95},{"tool":"send_slack","ms":180}]', 275, 800, TRUE, 'success'),
('trc_pay_001', 14, 'recon-monthly', 'langchain', 12, '[{"tool":"execute_query","ms":420},{"tool":"run_python","ms":1240}]', 1660, 3400, TRUE, 'success'),
('trc_data_001', 15, 'etl-curate', 'langgraph', 18, '[{"tool":"execute_query","ms":420},{"tool":"run_python","ms":1240},{"tool":"store_memory","ms":44}]', 1704, 5800, TRUE, 'success'),
('trc_supp_001', 16, 'kb-answer', 'crewai', 4, '[{"tool":"search_memory","ms":38},{"tool":"summarize_document","ms":520}]', 558, 1100, TRUE, 'success'),
('trc_legl_001', 17, 'redline-draft', 'claude-agent-sdk', 11, '[{"tool":"read_pdf","ms":2890},{"tool":"summarize_document","ms":680}]', 3570, 14000, TRUE, 'success'),
('trc_etri_001', 19, 'inbox-zero', 'mastra', 24, '[{"tool":"send_email","ms":95},{"tool":"create_event","ms":180},{"tool":"store_memory","ms":44}]', 319, 2100, TRUE, 'success'),
('trc_sec_001', 20, 'pr-secrets-scan', 'autogen', 8, '[{"tool":"run_python","ms":1240},{"tool":"send_slack","ms":180}]', 1420, 1800, TRUE, 'success'),
('trc_halluc_x1', 2, 'deep-research', 'openai-agents-sdk', 7, '[{"tool":"web_search","ms":215},{"tool":"summarize_document","ms":510}]', 725, 1900, FALSE, 'hallucination')
ON CONFLICT (trace_id) DO NOTHING;

INSERT INTO eval_results (agent_id, benchmark, score, tasks_total, tasks_passed, tasks_failed, category_scores, notes) VALUES
(1, 'BFCL_v3', 95.2, 1700, 1618, 82, '{"simple":98.4,"multiple":96.1,"parallel":94.7,"parallel_multiple":91.0,"java":96.2,"javascript":95.8,"rest":94.0}', 'Claude Opus 4.7 on Berkeley Function Calling Leaderboard v3'),
(1, 'SWE-bench-Verified', 67.4, 500, 337, 163, '{"django":71.0,"sympy":62.5,"matplotlib":58.0,"sphinx":74.0}', 'Claude Opus 4.7 via Claude Code'),
(1, 'AgentBench', 88.1, 250, 220, 30, '{"os":92,"db":85,"kg":86,"web":89}', 'Claude Opus 4.7'),
(2, 'BFCL_v3', 82.4, 1700, 1401, 299, '{"simple":91.0,"multiple":85.4,"parallel":78.0,"parallel_multiple":72.1}', 'GPT-4o (Aug 2025 snapshot)'),
(2, 'AgentBench', 76.9, 250, 192, 58, '{"os":80,"db":75,"kg":74,"web":79}', 'GPT-4o'),
(2, 'GAIA', 67.0, 165, 110, 55, '{"level1":81,"level2":62,"level3":40}', 'GPT-4o on GAIA'),
(3, 'BFCL_v3', 91.1, 1700, 1549, 151, '{"simple":94.0,"multiple":92.5,"parallel":89.2,"parallel_multiple":85.6}', 'Claude Sonnet 4.7 inside LangGraph'),
(3, 'ToolBench', 87.4, 1000, 874, 126, '{"single":90,"multi":85,"unseen":83}', 'LangGraph tool harness'),
(4, 'BFCL_v3', 71.5, 1700, 1216, 484, '{"simple":78.0,"multiple":74.1,"parallel":65.2,"parallel_multiple":58.0}', 'GPT-4o-mini via CrewAI'),
(4, 'ToolBench', 64.0, 1000, 640, 360, '{"single":72,"multi":60,"unseen":52}', NULL),
(5, 'BFCL_v3', 87.6, 1700, 1489, 211, '{"simple":91.0,"multiple":89.2,"parallel":85.4,"parallel_multiple":82.0}', 'GPT-4o via AutoGen'),
(5, 'SWE-bench-Verified', 51.2, 500, 256, 244, '{"django":54,"sympy":48,"matplotlib":45,"sphinx":56}', NULL),
(5, 'AgentBench', 81.0, 250, 202, 48, '{"os":84,"db":80,"kg":78,"web":82}', NULL),
(6, 'BFCL_v3', 78.3, 1700, 1331, 369, '{"simple":85.0,"multiple":80.0,"parallel":72.0,"parallel_multiple":68.4}', 'Claude Haiku 4.5'),
(7, 'BFCL_v3', 88.0, 1700, 1496, 204, '{"simple":92.0,"multiple":89.4,"parallel":85.0,"parallel_multiple":82.4}', 'Internal CI agent'),
(8, 'BFCL_v3', 84.7, 1700, 1440, 260, '{"simple":90.0,"multiple":86.0,"parallel":81.2,"parallel_multiple":78.4}', 'Claude Sonnet 4.7 via Replit'),
(9, 'BFCL_v3', 90.9, 1700, 1545, 155, '{"simple":94.0,"multiple":92.0,"parallel":88.6,"parallel_multiple":85.0}', 'Cursor Composer (Opus 4.7)'),
(10, 'BFCL_v3', 89.4, 1700, 1520, 180, '{"simple":93.0,"multiple":91.0,"parallel":87.0,"parallel_multiple":83.5}', 'Devin (Opus 4.7)'),
(10, 'SWE-bench-Verified', 71.0, 500, 355, 145, '{"django":74,"sympy":68,"matplotlib":62,"sphinx":78}', 'Cognition Devin published score'),
(11, 'BFCL_v3', 73.0, 1700, 1241, 459, '{"simple":80.0,"multiple":75.0,"parallel":68.4,"parallel_multiple":62.0}', 'GPT-4o with BrowserUse'),
(12, 'BFCL_v3', 67.2, 1700, 1142, 558, '{"simple":74.0,"multiple":70.0,"parallel":62.0,"parallel_multiple":55.0}', 'Llama 3.3 70B'),
(14, 'BFCL_v3', 80.4, 1700, 1367, 333, NULL, 'Sonnet 4.7 in LangChain'),
(15, 'BFCL_v3', 76.8, 1700, 1306, 394, NULL, 'Haiku 4.5 in LangGraph'),
(20, 'BFCL_v3', 81.7, 1700, 1389, 311, NULL, 'GPT-4o in AutoGen'),
(17, 'BFCL_v3', 86.1, 1700, 1464, 236, NULL, 'Opus 4.7 in Claude Agent SDK')
ON CONFLICT DO NOTHING;

INSERT INTO billing_events (agent_id, event_type, service_id, units, unit_price_usd, amount_usd, metadata, invoiced, occurred_at) VALUES
(1, 'tool_call', 1, 12000, 0.0001, 1.20, '{"tool":"web_search"}', FALSE, NOW() - INTERVAL '10 minutes'),
(1, 'token_usage', 1, 4200000, 0.0000012, 5.04, '{"model":"claude-opus-4-7"}', FALSE, NOW() - INTERVAL '10 minutes'),
(2, 'tool_call', 2, 800, 0.0002, 0.16, '{"tool":"read_pdf"}', FALSE, NOW() - INTERVAL '2 hours'),
(3, 'tool_call', 3, 21000, 0.00005, 1.05, '{"tool":"store_memory"}', FALSE, NOW() - INTERVAL '12 minutes'),
(3, 'tool_call', 1, 4200, 0.0001, 0.42, '{"tool":"web_search"}', FALSE, NOW() - INTERVAL '13 minutes'),
(4, 'tool_call', 5, 2400, 0.0001, 0.24, '{"tool":"send_email"}', FALSE, NOW() - INTERVAL '1 day'),
(5, 'tool_call', 4, 1100, 0.0005, 0.55, '{"tool":"run_python"}', FALSE, NOW() - INTERVAL '40 minutes'),
(7, 'tool_call', 4, 720, 0.0005, 0.36, '{"tool":"run_python"}', FALSE, NOW() - INTERVAL '3 minutes'),
(8, 'tool_call', 4, 980, 0.0005, 0.49, '{"tool":"run_javascript"}', FALSE, NOW() - INTERVAL '20 minutes'),
(9, 'tool_call', 1, 6400, 0.0001, 0.64, '{"tool":"web_search"}', FALSE, NOW() - INTERVAL '10 minutes'),
(10, 'tool_call', 4, 3200, 0.0005, 1.60, '{"tool":"run_python"}', FALSE, NOW() - INTERVAL '50 minutes'),
(11, 'tool_call', 8, 1200, 0.0003, 0.36, '{"tool":"analyze_image"}', FALSE, NOW() - INTERVAL '15 hours'),
(14, 'tool_call', 7, 1800, 0.0002, 0.36, '{"tool":"execute_query"}', FALSE, NOW() - INTERVAL '4 hours'),
(15, 'tool_call', 7, 2400, 0.0002, 0.48, '{"tool":"execute_query"}', FALSE, NOW() - INTERVAL '90 minutes'),
(16, 'tool_call', 11, 980, 0.00015, 0.147, '{"tool":"summarize_document"}', FALSE, NOW() - INTERVAL '6 hours'),
(17, 'tool_call', 2, 410, 0.0002, 0.082, '{"tool":"read_pdf"}', FALSE, NOW() - INTERVAL '2 hours'),
(18, 'tool_call', 11, 220, 0.00015, 0.033, '{"tool":"summarize_document"}', FALSE, NOW() - INTERVAL '1 day'),
(19, 'tool_call', 5, 4800, 0.0001, 0.48, '{"tool":"send_email"}', FALSE, NOW() - INTERVAL '3 hours'),
(20, 'tool_call', 4, 920, 0.0005, 0.46, '{"tool":"run_python"}', FALSE, NOW() - INTERVAL '20 minutes'),
(1, 'subscription', NULL, 1, 4999, 4999, '{"tier":"Enterprise"}', TRUE, DATE_TRUNC('month', CURRENT_DATE)),
(2, 'subscription', NULL, 1, 499, 499, '{"tier":"Scale"}', TRUE, DATE_TRUNC('month', CURRENT_DATE)),
(8, 'subscription', NULL, 1, 4999, 4999, '{"tier":"Enterprise"}', TRUE, DATE_TRUNC('month', CURRENT_DATE)),
(9, 'subscription', NULL, 1, 4999, 4999, '{"tier":"Enterprise"}', TRUE, DATE_TRUNC('month', CURRENT_DATE)),
(10, 'subscription', NULL, 1, 4999, 4999, '{"tier":"Enterprise"}', TRUE, DATE_TRUNC('month', CURRENT_DATE)),
(3, 'overage', NULL, 120, 0.20, 24.00, '{"reason":"call overage on Scale"}', FALSE, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

INSERT INTO agent_oauth_grants (agent_id, provider, granted_scopes, on_behalf_of, status, expires_at) VALUES
(3, 'github', '["repo:read","issues:write"]', 'eng-lead@acme.example', 'granted', NOW() + INTERVAL '90 days'),
(4, 'google', '["calendar","gmail:send"]', 'sales@acme.example', 'granted', NOW() + INTERVAL '90 days'),
(5, 'github', '["repo:read","pr:write"]', 'eng@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(7, 'github', '["repo:write","actions:write"]', 'eng@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(9, 'github', '["repo:read","repo:write"]', 'devs@cursor.com', 'granted', NOW() + INTERVAL '365 days'),
(10, 'github', '["repo:write","pr:write"]', 'eng@cognition.ai', 'granted', NOW() + INTERVAL '180 days'),
(11, 'google', '["forms:fill","drive:read"]', 'me@example.com', 'pending', NOW() + INTERVAL '7 days'),
(14, 'stripe', '["charges:read","customers:read"]', 'finance@acme.example', 'granted', NOW() + INTERVAL '365 days'),
(16, 'zendesk', '["tickets:rw"]', 'support@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(17, 'google', '["drive:read","docs:write"]', 'legal@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(19, 'google', '["gmail:rw","calendar"]', 'sales@acme.example', 'granted', NOW() + INTERVAL '90 days'),
(20, 'github', '["repo:read","security:read"]', 'sec@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(6, 'slack', '["channels:read","chat:write"]', 'ops@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(2, 'arxiv', '["papers:read"]', 'research@openai.com', 'granted', NULL),
(15, 'google', '["bigquery:rw"]', 'data@acme.example', 'granted', NOW() + INTERVAL '180 days'),
(8, 'github', '["repo:read"]', 'agent@replit.com', 'granted', NOW() + INTERVAL '365 days'),
(13, 'github', '["repo:read"]', NULL, 'revoked', NOW() - INTERVAL '30 days'),
(18, 'arxiv', '["papers:read"]', 'me@indie.dev', 'granted', NULL),
(1, 'github', '["repo:read","issues:rw","pr:rw"]', 'support@anthropic.com', 'granted', NOW() + INTERVAL '365 days'),
(1, 'slack', '["channels:read","chat:write"]', 'support@anthropic.com', 'granted', NOW() + INTERVAL '180 days')
ON CONFLICT DO NOTHING;
