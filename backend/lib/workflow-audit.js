const crypto = require('crypto');

function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
}

async function appendAudit(client, event) {
  await client.query(
    `INSERT INTO workflow_audit_heads (tenant_id) VALUES ($1)
     ON CONFLICT (tenant_id) DO NOTHING`,
    [event.tenantId]
  );
  const head = await client.query(
    'SELECT sequence_number, head_hash FROM workflow_audit_heads WHERE tenant_id = $1 FOR UPDATE',
    [event.tenantId]
  );
  const sequence = Number(head.rows[0].sequence_number) + 1;
  const previousHash = head.rows[0].head_hash;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const canonical = stableJson({
    id,
    tenantId: event.tenantId,
    sequence,
    actorType: event.actorType,
    actorId: event.actorId || null,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: String(event.entityId),
    data: event.data || {},
    createdAt,
    previousHash
  });
  const eventHash = crypto.createHash('sha256').update(canonical).digest('hex');
  await client.query(
    `INSERT INTO workflow_audit_events
       (id, tenant_id, sequence_number, actor_type, actor_id, event_type, entity_type,
        entity_id, data, previous_hash, event_hash, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, event.tenantId, sequence, event.actorType, event.actorId || null,
      event.eventType, event.entityType, String(event.entityId), event.data || {},
      previousHash, eventHash, createdAt]
  );
  await client.query(
    'UPDATE workflow_audit_heads SET sequence_number = $2, head_hash = $3 WHERE tenant_id = $1',
    [event.tenantId, sequence, eventHash]
  );
  return { id, sequence, previousHash, eventHash, createdAt };
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { appendAudit, stableJson, withTransaction };
