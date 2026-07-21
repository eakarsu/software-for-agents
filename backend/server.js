require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createApp, validateRuntimeConfig } = require('./app');
const db = require('./db');

validateRuntimeConfig();
const app = createApp();
const port = Number(process.env.PORT || 3013);
const server = app.listen(port, () => console.log(`AgentHub backend listening on port ${port}`));

async function shutdown() {
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = server;
