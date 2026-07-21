const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const request = require('supertest');

const connectionString = process.env.WORKFLOW_TEST_DATABASE_URL;

test('HTTP production boundary', { skip: !connectionString }, async (t) => {
  process.env.DATABASE_URL = connectionString;
  process.env.JWT_SECRET = 'integration-jwt-secret-with-more-than-32-characters';
  process.env.NODE_ENV = 'test';
  delete process.env.ENABLE_LEGACY_DEMO_ROUTES;
  const { createApp } = require('../app');
  const pool = new Pool({ connectionString, max: 1 });
  t.after(() => pool.end());
  await pool.query('TRUNCATE users CASCADE');
  const passwordHash = await bcrypt.hash('correct horse battery staple', 4);
  const user = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,'admin') RETURNING id`,
    ['http-admin@example.test', passwordHash, 'HTTP Admin']
  );
  const tenantId = crypto.randomUUID();
  await pool.query('INSERT INTO tenants (id, name) VALUES ($1,$2)', [tenantId, 'HTTP tenant']);
  await pool.query("INSERT INTO tenant_members (tenant_id, user_id, role) VALUES ($1,$2,'admin')", [tenantId, user.rows[0].id]);
  const app = createApp({ pool });

  let token;
  await t.test('login issues a short-lived scoped token and tenant list', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'http-admin@example.test', password: 'correct horse battery staple'
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    token = response.body.token;
    assert.equal(response.body.user.tenants[0].id, tenantId);
    assert.equal(response.body.user.tenants[0].role, 'admin');
  });

  await t.test('authenticated identity endpoint rejects anonymous requests and returns the token subject', async () => {
    await request(app).get('/api/auth/me').expect(401);
    const response = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    assert.equal(response.body.email, 'http-admin@example.test');
    assert.equal(response.body.role, 'admin');
    assert.equal(response.body.tenants[0].id, tenantId);
  });

  await t.test('tenant header is mandatory and membership is checked in the database', async () => {
    await request(app).get('/api/agent-workflow/connectors').set('Authorization', `Bearer ${token}`).expect(400);
    await request(app).get('/api/agent-workflow/connectors')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', crypto.randomUUID())
      .expect(403);
    await request(app).get('/api/agent-workflow/connectors')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-ID', tenantId)
      .expect(200, []);
  });

  await t.test('generated and legacy prototype endpoints are explicit non-app boundaries', async () => {
    const generated = await request(app).post('/api/gap-ai-synthetic-load-tester').send({ note: 'pretend' }).expect(410);
    assert.equal(generated.body.error_code, 'NOT_IMPLEMENTED');
    const legacy = await request(app).get('/api/services').expect(410);
    assert.equal(legacy.body.boundary, 'reference-only');
  });

  await t.test('manifest advertises only the supported workflow', async () => {
    const response = await request(app).get('/.well-known/agent-manifest.json').expect(200);
    assert.equal(response.body.schema_version, '2026-07-20');
    assert.equal(response.body.endpoints.runs, '/api/agent-workflow/runs');
  });

  await t.test('readiness checks the database', async () => {
    await request(app).get('/api/health/live').expect(200);
    const ready = await request(app).get('/api/health/ready');
    assert.equal(ready.status, 200, JSON.stringify(ready.body));
  });

});
