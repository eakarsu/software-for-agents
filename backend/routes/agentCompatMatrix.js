const express = require('express');
const router = express.Router();

router.post('/score', (req, res) => {
  const clients = Array.isArray(req.body?.clients) ? req.body.clients : [
    { name: 'LangGraph Agent', protocol: 'mcp', auth: 'oauth', version: '1.2.0' },
    { name: 'Legacy Bot', protocol: 'rest', auth: 'api_key', version: '0.8.4' },
  ];
  const required = req.body?.required || { protocol: 'mcp', auth: 'oauth', min_version: '1.0.0' };
  const rows = clients.map((client) => {
    const misses = [];
    if (client.protocol !== required.protocol) misses.push('protocol');
    if (client.auth !== required.auth) misses.push('auth');
    if (String(client.version || '0.0.0').localeCompare(required.min_version, undefined, { numeric: true }) < 0) misses.push('version');
    return { name: client.name, compatible: misses.length === 0, misses, action: misses.length ? `Add ${misses.join(', ')} compatibility shim.` : 'Ready for agent onboarding.' };
  });
  res.json({ compatibleCount: rows.filter((row) => row.compatible).length, clients: rows });
});

module.exports = router;
