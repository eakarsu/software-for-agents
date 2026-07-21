const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrate(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8'));
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await client.query('COMMIT');

    const crypto = require('crypto');
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
    for (const name of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name = $1', [name]);
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [name, checksum]);
      await client.query('COMMIT');
      console.log(`Applied ${name}`);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { migrate };
