const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(503).json({ error: 'Authentication is not configured', error_code: 'AUTH_NOT_CONFIGURED' });
  }
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized', error_code: 'AUTH_REQUIRED' });
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'software-for-agents',
      audience: 'agenthub-api'
    });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token', error_code: 'AUTH_INVALID' });
  }
};
