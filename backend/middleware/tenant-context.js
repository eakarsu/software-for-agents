const { UUID_PATTERN } = require('../lib/workflow-schema');

const uuidPattern = new RegExp(UUID_PATTERN, 'i');

function createTenantContext(pool) {
  return async function tenantContext(req, res, next) {
    const tenantId = req.headers['x-tenant-id'];
    if (typeof tenantId !== 'string' || !uuidPattern.test(tenantId)) {
      return res.status(400).json({ error: 'X-Tenant-ID is required', error_code: 'TENANT_REQUIRED' });
    }
    try {
      const membership = await pool.query(
        `SELECT tm.role, t.name
           FROM tenant_members tm JOIN tenants t ON t.id = tm.tenant_id
          WHERE tm.tenant_id = $1 AND tm.user_id = $2 AND t.status = 'active'`,
        [tenantId, req.user.id]
      );
      if (!membership.rows[0]) {
        return res.status(403).json({ error: 'Tenant membership required', error_code: 'TENANT_FORBIDDEN' });
      }
      req.tenant = { id: tenantId, name: membership.rows[0].name, role: membership.rows[0].role };
      return next();
    } catch {
      return res.status(503).json({ error: 'Tenant authorization unavailable', error_code: 'TENANT_AUTH_UNAVAILABLE' });
    }
  };
}

module.exports = { createTenantContext };
