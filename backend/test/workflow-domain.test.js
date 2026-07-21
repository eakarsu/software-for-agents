const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenRouterClient } = require('../lib/openrouter-client');
const { retryableStatus } = require('../lib/tool-worker-service');
const { validateAnswer, validateSync } = require('../lib/workflow-schema');
const { stableJson } = require('../lib/workflow-audit');
const { validateHttpsUrl, validateModelOutput } = require('../lib/workflow-service');

const document = {
  id: '11111111-1111-4111-8111-111111111111',
  connector_id: '22222222-2222-4222-8222-222222222222',
  content: 'Circuit breaker policy requires human approval before a production change.',
  action_url: 'https://connector.example/cases',
  allowed_actions: ['create_case']
};

function validOutput() {
  return {
    answer: `Human approval is required. [source:${document.id}]`,
    citations: [{ documentId: document.id, quote: 'requires human approval' }],
    confidence: 0.95,
    proposedAction: null
  };
}

test('answer schema accepts the bounded response shape', () => {
  assert.equal(validateAnswer(validOutput()), true);
});

test('answer schema rejects untyped extra output fields', () => {
  assert.equal(validateAnswer({ ...validOutput(), shellCommand: 'rm -rf /' }), false);
});

test('sync schema requires full content for non-deletion events', () => {
  assert.equal(validateSync({ cursor: '1', documents: [{ sourceId: 'a', updatedAt: new Date().toISOString(), deleted: false }] }), false);
});

test('provenance validation rejects citations outside retrieved context', () => {
  const output = validOutput();
  output.citations[0].documentId = '33333333-3333-4333-8333-333333333333';
  assert.throws(() => validateModelOutput(output, [document], { role: 'operator' }, false), { code: 'PROVENANCE_INVALID' });
});

test('provenance validation rejects fabricated quotes', () => {
  const output = validOutput();
  output.citations[0].quote = 'never appears in source';
  assert.throws(() => validateModelOutput(output, [document], { role: 'operator' }, false), { code: 'PROVENANCE_INVALID' });
});

test('viewer cannot turn a model proposal into a pending action', () => {
  const output = validOutput();
  output.proposedAction = {
    connectorId: document.connector_id,
    action: 'create_case',
    payload: { summary: 'Case', description: 'Investigate', severity: 'high' }
  };
  assert.throws(() => validateModelOutput(output, [document], { role: 'viewer' }, true), { code: 'ACTION_NOT_ALLOWED' });
});

test('action proposal must target an action-enabled retrieved connector', () => {
  const output = validOutput();
  output.proposedAction = {
    connectorId: document.connector_id,
    action: 'create_case',
    payload: { summary: 'Case', description: 'Investigate', severity: 'high' }
  };
  assert.doesNotThrow(() => validateModelOutput(output, [document], { role: 'operator' }, true));
});

test('connector action URLs require HTTPS without embedded credentials', () => {
  assert.equal(validateHttpsUrl('https://connector.example/cases', 'url'), 'https://connector.example/cases');
  assert.throws(() => validateHttpsUrl('http://127.0.0.1/admin', 'url'));
  assert.throws(() => validateHttpsUrl('https://user:pass@connector.example/cases', 'url'));
});

test('stable JSON canonicalizes object key order', () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test('worker retry policy is bounded to transient statuses', () => {
  assert.equal(retryableStatus(429), true);
  assert.equal(retryableStatus(503), true);
  assert.equal(retryableStatus(400), false);
  assert.equal(retryableStatus(401), false);
});

test('OpenRouter client requests strict schema output and reuses request identity across a retry', async () => {
  const calls = [];
  const fetchImpl = async (_url, options) => {
    calls.push(options);
    if (calls.length === 1) return new Response('busy', { status: 503 });
    return new Response(JSON.stringify({
      model: 'provider/model',
      choices: [{ message: { content: JSON.stringify(validOutput()) } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0.001 }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const client = createOpenRouterClient({
    fetchImpl,
    apiKey: 'test-key',
    model: 'provider/model',
    attempts: 2
  });
  const result = await client.answer({
    question: 'What is required?',
    documents: [{ ...document, title: 'Policy', source_url: 'https://source.example/policy', source_updated_at: new Date(), last_synced_at: new Date() }],
    timeoutMs: 2000,
    requestId: 'run-123',
    allowAction: false
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers['X-Request-ID'], 'run-123');
  assert.equal(calls[1].headers['X-Request-ID'], 'run-123');
  const body = JSON.parse(calls[1].body);
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.provider.require_parameters, true);
  assert.equal(result.output.confidence, 0.95);
});
