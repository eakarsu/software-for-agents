# AgentHub — _AUDIT_NOTE.md

## Apply3 — Feature additions (2026-05-07)

Added **5 new AI features + 3 utility features** as both backend endpoints and
fully wired frontend pages. No working code touched; existing endpoints/pages
left intact.

### Backend changes
- `backend/routes/ai.js`
  - Hardened `callAI()`: now throws with `statusCode = 503` when
    `OPENROUTER_API_KEY` is missing, the upstream returns non-OK, or the
    response is empty. `aiHandler(res, e)` translates these to proper 5xx.
  - **NEW endpoints** (all `auth`-protected, JWT bearer):
    - `POST /api/ai/recommend-tools`         — tool recommendation for a goal
    - `POST /api/ai/integration-health`      — integration health scorer
    - `POST /api/ai/capability-gap`          — capability-gap finder
    - `POST /api/ai/critique-prompt`         — agent-prompt critic
    - `POST /api/ai/nl-to-toolcall`          — NL -> tool-call generator
- `backend/routes/utility.js` (NEW)
  - `GET  /api/utility/export/:entity`  — CSV export (whitelisted entities:
    services, tools, integrations, executions, documentation, usage_metrics,
    audit_log).
  - `GET  /api/utility/search`          — cross-entity search + filter
    (`q`, `entity`, `status`, `category`, `limit`).
  - `GET  /api/utility/audit`           — list audit entries (filter by
    `action`, `entity`).
  - `POST /api/utility/audit`           — create audit entry.
- `backend/server.js` — registers `/api/utility`.
- `backend/db/schema.sql` — adds `audit_log` table + 2 indexes.

### Frontend changes
- `frontend/src/api.ts`
  - `apiFetch()` now surfaces 503 / JSON `error` payloads.
  - New `apiDownload()` helper for CSV.
  - `api.ai.*` extended with 5 new methods.
  - New `api.utility.*` namespace.
- `frontend/src/components/AICenter.tsx` — adds 5 new tabs
  (Recommend Tools, Integration Health, Capability Gap, Prompt Critic,
  NL to Tool Call), reusing the existing `runAI` flow + `AIResponse`.
- `frontend/src/pages/UtilityPage.tsx` (NEW) — three tabs: CSV Export,
  Search & Filter, Audit Log.
- `frontend/src/components/Layout.tsx` — adds "Utilities" nav entry.
- `frontend/src/App.tsx` — adds `/utility` route.

### Smoke test (port 3013, admin@demo.com / demo123)
- Login OK, JWT issued.
- `GET /api/utility/search?q=search&entity=services` → 200, 2 hits.
- `GET /api/utility/export/services`               → 200, CSV stream.
- `GET /api/utility/audit?limit=5`                 → 200, audit entries
  populated by previous calls (export + search were auto-logged).
- AI endpoints (no valid OPENROUTER key in env) → **HTTP 503** with
  `{"error":"AI upstream returned 401"}`. 503 path verified.

### Syntax check
- `node --check` — clean for `routes/ai.js`, `routes/utility.js`, `server.js`.
- `tsc --noEmit --skipLibCheck` — only one **pre-existing** unrelated warning
  (`IntegrationsPage.tsx` `Link2` unused import); no new TS errors introduced.

### Rules followed
- Existing patterns (Express + JWT `auth` middleware, `db.query`, JSON 5xx)
- JWT bearer everywhere
- 503 handling on AI upstream errors / missing key
- No working code modified (only `ai.js` got new endpoints + the `callAI`
  hardening; old endpoints unchanged in behavior on success path)
- No `npm install` run; uses existing dependencies only
- All new JS / TS files syntax-checked

## Sample Data page (2026-05-07)

Added a **Sample Data** page with one button per main entity (services, tools,
integrations, executions, documentation, usage_metrics — `users` and
`audit_log` skipped per spec). Each button calls a JWT-protected backend
endpoint that inserts 5-10 domain-realistic rows.

### Backend
- **NEW** `backend/routes/sample_data.js` — `POST /api/admin/sample-data/:entity`
  (JWT-protected). Returns `{inserted, entity}`. Domain-realistic seeds for
  agent software: Stripe / Slack / GitHub / Twilio / Notion / AWS S3 / OpenAI
  Embeddings / HubSpot, with matching tools (`create_charge`, `post_message`,
  `open_pull_request`, `send_sms`, `embed_text`, …), integrations (OAuth and
  API-key with realistic key previews and plan tiers), executions (realistic
  input/output JSON, mixed success/error, latency, cost, tokens), docs (with
  code examples), and 7 days of usage metrics.
- **MODIFIED** `backend/server.js` — mounts `/api/admin`.

### Frontend
- **NEW** `frontend/src/pages/SampleDataPage.tsx` — card grid, one button per
  entity, per-entity counter, inline status, total counter, toast.
- **MODIFIED** `frontend/src/api.ts` — adds `api.admin.insertSampleData()`.
- **MODIFIED** `frontend/src/App.tsx` — adds `/sample-data` route.
- **MODIFIED** `frontend/src/components/Layout.tsx` — adds "Sample Data" nav
  entry (Database icon).

### Smoke test (port 3013, admin@demo.com / demo123)
- Login OK, JWT issued.
- `POST /api/admin/sample-data/services`      → 200 `{"inserted":8,…}`
- `POST /api/admin/sample-data/tools`         → 200 `{"inserted":9,…}`
- `POST /api/admin/sample-data/integrations`  → 200 `{"inserted":8,…}`
- `POST /api/admin/sample-data/documentation` → 200 `{"inserted":7,…}`
- `POST /api/admin/sample-data/usage_metrics` → 200 `{"inserted":7,…}`
- `POST /api/admin/sample-data/executions`    → 200 `{"inserted":8,…}`
- No-token request → 401. Bogus entity → 400 with valid-entity list.
- Backend stopped after test.

### Syntax check
- `node --check` — clean for `routes/sample_data.js` and `server.js`.
- `tsc --noEmit --skipLibCheck` — only the pre-existing
  `IntegrationsPage.tsx` `Link2` warning; no new TS errors introduced.

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/sample_data_software-for-agents.md`

## Sample-prefill buttons on AI pages (2026-05-07)

Added 2-3 **sample-prefill pill buttons** to every AI feature tab in the
AI Center. All 9 AI tabs now expose a "Try:" row of clickable pills above
the form; clicking one fully populates the inputs with realistic
agent-software data (Stripe `create_charge`, Slack `post_message`, GitHub
`open_pull_request`, OpenAI `embed_text`, Twilio SMS, HubSpot, etc.;
realistic auth — OAuth / API-key / GitHub App / bot tokens; realistic
agent goals — triage support tickets, weekly engineering digest, failed
Stripe charge recovery, on-call incident triage, lead enrichment, etc.).

### Frontend
- **MODIFIED** `frontend/src/components/AICenter.tsx` — added local
  `samples` literal + small `SamplePicker` sub-component, rendered once
  per tab. No existing handlers, hooks, or styles changed.

### Coverage
- 9 AI tabs × 3 samples = **27 prefill buttons**
- Tabs: discover, docs, debug, integration, recommend, health, gap,
  critique, nl2tool — every tab posting to `/api/ai/*` is covered.

### Syntax check
- `tsc --noEmit --skipLibCheck` — only the pre-existing unrelated
  `IntegrationsPage.tsx Link2` warning. No new TS errors.
- `npx vite build` — clean production bundle, 1486 modules, 1.16s.

### Smoke test (port 3013, admin@demo.com / demo123)
- UI-only change; no API surface touched. Vite bundle compiles. Existing
  login flow (Vite proxy `/api → localhost:3013`) unaffected. `dist/`
  cleaned up after the build.

### Rules followed
- No working code touched beyond samples
- No `npm install` run
- Short button labels (≤4 words each)
- Real services / tools / goals / auth methods only

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/samples_software-for-agents.md`

## Dashboard page (2026-05-07)

Added a domain-appropriate **Dashboard** page as the first sidebar item
and the new post-login landing route. Read-only overview of the
AgentHub registry — KPI cards, recent audit activity, and quick actions.

### Backend
- **NEW** `backend/routes/dashboard.js` — `GET /api/dashboard/stats`
  (JWT-protected). Single endpoint, 8 parallel SQL aggregates via
  `Promise.all`:
  - KPIs: services_registered, tools_available,
    integrations_active (status='active'), executions_today (last 24h
    on `executions.created_at`), doc_snippets.
  - `recent_activity` — latest 10 `audit_log` rows.
  - `executions_by_status` — 24h success/error/failed/timeout counts.
  - `top_services` — top 5 services by execution count, last 7 days.
- **MODIFIED** `backend/server.js` — mounts `/api/dashboard`.

### Frontend
- **NEW** `frontend/src/pages/Dashboard.tsx` — KPI cards, quick-action
  tiles (AI Center, Services, Tools, Sample Data), recent-activity
  list with relative-time and empty-state CTAs, exec-status + top
  services side panel, refresh button, error/loading states.
- **MODIFIED** `frontend/src/api.ts` — adds `api.dashboard.stats()`.
- **MODIFIED** `frontend/src/components/Layout.tsx` — adds Dashboard
  as the **first** sidebar entry (LayoutDashboard icon).
- **MODIFIED** `frontend/src/App.tsx` — adds `/dashboard` route and
  switches the index redirect from `/services` to `/dashboard`.

### Smoke test (port 3013, admin@demo.com / demo123)
- Login OK, JWT issued.
- `GET /api/dashboard/stats` no token  → **401**.
- `GET /api/dashboard/stats` with bearer → **200** with KPIs (38 services,
  41 tools, 33 integrations, 23 execs today, 37 docs), 2 audit rows,
  4 status buckets, 5 top services.
- Backend stopped, port 3013 freed, tmp files removed.

### Syntax check
- `node --check` — clean for `routes/dashboard.js` and `server.js`.
- `tsc --noEmit --skipLibCheck` — only the pre-existing unrelated
  `IntegrationsPage.tsx Link2` warning. No new TS errors.

### Rules followed
- Existing patterns (Express + JWT `auth` middleware, `db.query`)
- JWT bearer everywhere
- No working code modified beyond mount line + first nav entry +
  index redirect target
- No `npm install` run
- Cleanup performed

Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/dashboard_software-for-agents.md`

## Apply pass 7 (full backlog implementation)

Date: 2026-05-21. Implements the remaining unaddressed backlog items that are
neither NEEDS-CREDS (the `cf-*` / `gap-*` 503 stubs) nor TOO-RISKY structural
refactors. Three feature surfaces shipped end-to-end (backend + frontend +
schema + nav) plus one public well-known endpoint.

### Items shipped
1. **Webhook subscriptions** — agents register URLs to receive registry
   events (executions, quotas, integrations, MCP publishes).
2. **Agent-first discovery surface** — manifest, facets, tool tags, and SDK
   snippets for agents to programmatically self-onboard.
3. **Public well-known endpoint** — unauthenticated agent manifest at
   `/.well-known/agent-manifest.json`.
4. **Nav wiring for orphan view pages** — `TimelineView`,
   `CodexCustomVizFeature`, `CodexOperationsFeature` were routed but had no
   sidebar entry; added `Insights` nav group with `/views/*` Layout-wrapped
   routes (original `/insights/timeline`, `/codex/*` routes preserved for
   backwards-compat).

### Backend changes
- **NEW** `backend/routes/webhooks.js` — JWT-protected CRUD + `/test` (logs
  a simulated delivery to `webhook_deliveries`, bumps counters) +
  `/deliveries` history + `/event-types` enum.
  - `GET    /api/webhooks`                  — list current user's subs
  - `GET    /api/webhooks/:id`              — one
  - `POST   /api/webhooks`                  — create
  - `PUT    /api/webhooks/:id`              — update (active flag, events…)
  - `DELETE /api/webhooks/:id`              — remove
  - `POST   /api/webhooks/:id/test`         — simulated delivery (202)
  - `GET    /api/webhooks/:id/deliveries`   — recent delivery rows
  - `GET    /api/webhooks/event-types`      — supported event-type list
- **NEW** `backend/routes/discovery.js` — JWT-protected read-only surface.
  - `GET /api/discovery/manifest`      — platform self-description (counts,
    capabilities, endpoints, conventions)
  - `GET /api/discovery/facets`        — service facets by category / auth /
    status with counts
  - `GET /api/discovery/tags`          — tool-name verb tags (create, list,
    update…) with per-tag counts
  - `GET /api/discovery/sdk-snippets`  — curl / python / node bearer-auth
    quick-start snippets
- **MODIFIED** `backend/server.js` — mounts `/api/webhooks` and
  `/api/discovery` BEFORE the 404 handler, plus a public
  `GET /.well-known/agent-manifest.json` (no JWT) for unauth agent self-
  onboarding.
- **MODIFIED** `backend/db/schema.sql` — adds `webhook_subscriptions` and
  `webhook_deliveries` tables with `CREATE TABLE IF NOT EXISTS` + matching
  `CREATE INDEX IF NOT EXISTS` so migration is idempotent.

### Frontend changes
- **MODIFIED** `frontend/src/api.ts` — adds `api.webhooks.*` (8 methods) and
  `api.discovery.*` (4 methods).
- **NEW** `frontend/src/pages/WebhooksPage.tsx` — create-form (name/url/
  secret/event-types pills), subscriptions list with enable/disable/test/
  delete actions, deliveries side panel.
- **NEW** `frontend/src/pages/DiscoveryPage.tsx` — 4 tabs (Manifest JSON
  with copy, faceted bar charts, verb-tag pills, SDK snippets with copy).
- **MODIFIED** `frontend/src/components/Layout.tsx` — adds **Agent Surface**
  nav group (Discovery, Webhooks) and **Insights** group (Timeline View,
  Custom Viz, Operations). Icons added to lucide import: `Webhook`,
  `Compass`, `Activity`.
- **MODIFIED** `frontend/src/App.tsx` — routes for `/webhooks`,
  `/discovery`, `/views/timeline`, `/views/custom-viz`, `/views/operations`
  (all inside Layout / PrivateRoute). Old top-level `/insights/timeline`
  and `/codex/*` routes preserved for backwards-compat.

### Constraints honored
- No new npm deps (uses existing `express`, `pg`, JWT middleware, `lucide-
  react` already imported elsewhere).
- No breaking changes — all new routes are additive; existing endpoints and
  routes untouched. Original orphan routes kept for backwards-compat.
- All new route mounts placed BEFORE the `/api` 404 catch-all.
- New `.js` files passed `node --check` (`server.js`, `routes/webhooks.js`,
  `routes/discovery.js`).
- `tsc --noEmit --skipLibCheck` — only the **pre-existing** warnings
  (`IntegrationsPage.tsx` unused `Link2`, `CodexCustomVizFeature.tsx`/
  `TimelineView.tsx` unused `React` imports — none introduced by this
  pass). Memory rule "do not modify feature page JSX/TSX files" honored,
  so those pre-existing warnings are left untouched.
- Migration uses `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT
  EXISTS` so re-running `schema.sql` is safe.

### Status
Implementation complete. All endpoints reachable behind JWT (except the
public well-known manifest). Frontend nav exposes every new page.
