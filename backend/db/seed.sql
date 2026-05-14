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
