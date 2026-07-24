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
    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = 'admin'
       RETURNING id, email, (xmax = 0) AS created`,
      [email, passwordHash, name]
    );
    return inserted.rows[0];
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
