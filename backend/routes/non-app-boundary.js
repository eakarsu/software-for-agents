const express = require('express');

function createNonAppBoundary(feature) {
  const router = express.Router();
  router.use((_req, res) => res.status(410).json({
    error: `${feature} is not an implemented production capability`,
    error_code: 'NOT_IMPLEMENTED',
    retryable: false,
    boundary: 'reference-only',
    supported_workflow: '/api/agent-workflow'
  }));
  return router;
}

module.exports = { createNonAppBoundary };
