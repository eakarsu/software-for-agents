const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');

function createAuthRouter(pool) {
  const router = express.Router();
  router.post('/login', async (req, res) => {
    try {
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        return res.status(503).json({ error: 'Authentication is not configured' });
      }
      const { email, password } = req.body || {};
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const result = await pool.query(
        'SELECT id, email, password_hash, name, role FROM users WHERE lower(email) = lower($1)',
        [email]
      );
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const memberships = await pool.query(
        `SELECT t.id, t.name, tm.role FROM tenant_members tm
         JOIN tenants t ON t.id = tm.tenant_id
         WHERE tm.user_id = $1 AND t.status = 'active' ORDER BY t.name`,
        [user.id]
      );
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '8h',
        issuer: 'software-for-agents',
        audience: 'agenthub-api'
      });
      return res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, tenants: memberships.rows }
      });
    } catch {
      return res.status(500).json({ error: 'Authentication service failed' });
    }
  });
  router.get('/me', auth, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, email, name, role FROM users WHERE id = $1',
        [req.user.id]
      );
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Account no longer exists', error_code: 'AUTH_INVALID' });
      const memberships = await pool.query(
        `SELECT t.id, t.name, tm.role FROM tenant_members tm
         JOIN tenants t ON t.id = tm.tenant_id
         WHERE tm.user_id = $1 AND t.status = 'active' ORDER BY t.name`,
        [user.id]
      );
      return res.json({ ...user, tenants: memberships.rows });
    } catch {
      return res.status(500).json({ error: 'Authentication service failed' });
    }
  });
  return router;
}

module.exports = { createAuthRouter };
