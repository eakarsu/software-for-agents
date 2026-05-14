const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

router.get('/stats', auth, async (req, res) => {
  try {
    const [
      svc, tools, integ, execToday, docs, recent,
      execStatus, topServices
    ] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS n FROM services'),
      db.query('SELECT COUNT(*)::int AS n FROM tools'),
      db.query("SELECT COUNT(*)::int AS n FROM integrations WHERE status = 'active'"),
      db.query("SELECT COUNT(*)::int AS n FROM executions WHERE created_at >= NOW() - INTERVAL '1 day'"),
      db.query('SELECT COUNT(*)::int AS n FROM documentation'),
      db.query(`SELECT id, user_email, action, entity, entity_id, details, created_at
                FROM audit_log
                ORDER BY created_at DESC
                LIMIT 10`),
      db.query(`SELECT status, COUNT(*)::int AS n
                FROM executions
                WHERE created_at >= NOW() - INTERVAL '1 day'
                GROUP BY status`),
      db.query(`SELECT s.name AS service_name, COUNT(e.id)::int AS calls
                FROM executions e
                JOIN tools t ON t.id = e.tool_id
                JOIN services s ON s.id = t.service_id
                WHERE e.created_at >= NOW() - INTERVAL '7 days'
                GROUP BY s.name
                ORDER BY calls DESC
                LIMIT 5`),
    ]);

    res.json({
      kpis: {
        services_registered: svc.rows[0].n,
        tools_available:     tools.rows[0].n,
        integrations_active: integ.rows[0].n,
        executions_today:    execToday.rows[0].n,
        doc_snippets:        docs.rows[0].n,
      },
      recent_activity: recent.rows,
      executions_by_status: execStatus.rows,
      top_services: topServices.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
