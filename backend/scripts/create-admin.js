const bcrypt = require('bcrypt');
const { Pool } = require('pg');

function required(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
  return value.trim();
}

async function provisionAdmin(options = {}) {
  const acknowledgement = options.acknowledgement ?? process.env.BOOTSTRAP_ACKNOWLEDGEMENT;
  if (acknowledgement !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }

  const connectionString = options.connectionString ?? required(process.env.DATABASE_URL, 'DATABASE_URL');
  const email = required(options.email ?? process.env.PROVISION_ADMIN_EMAIL, 'PROVISION_ADMIN_EMAIL').toLowerCase();
  const password = required(options.password ?? process.env.PROVISION_ADMIN_PASSWORD, 'PROVISION_ADMIN_PASSWORD');
  const name = required(options.name ?? process.env.PROVISION_ADMIN_NAME ?? 'Initial Administrator', 'PROVISION_ADMIN_NAME');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('PROVISION_ADMIN_EMAIL must be a valid email address');
  if (password.length < 16) throw new Error('PROVISION_ADMIN_PASSWORD must contain at least 16 characters');

  const ownsPool = !options.pool;
  const pool = options.pool || new Pool({ connectionString, max: 1 });
  try {
    let existing = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE lower(email) = lower($1)',
      [email]
    );
    if (existing.rows[0]) {
      const user = existing.rows[0];
      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches || user.role !== 'admin') {
        throw new Error('The requested administrator already exists with different credentials or role');
      }
      return { id: user.id, email: user.email, created: false };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [email, passwordHash, name]
    );
    if (inserted.rows[0]) return { ...inserted.rows[0], created: true };

    existing = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE lower(email) = lower($1)',
      [email]
    );
    const user = existing.rows[0];
    if (!user || user.role !== 'admin' || !(await bcrypt.compare(password, user.password_hash))) {
      throw new Error('Administrator provisioning conflicted with an existing account');
    }
    return { id: user.id, email: user.email, created: false };
  } finally {
    if (ownsPool) await pool.end();
  }
}

if (require.main === module) {
  provisionAdmin()
    .then((result) => console.log(`${result.created ? 'Created' : 'Confirmed'} administrator ${result.email}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { provisionAdmin };
