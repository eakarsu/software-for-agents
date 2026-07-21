const db = require('../db');
const { createToolWorker } = require('../lib/tool-worker-service');

const worker = createToolWorker({ pool: db });
let stopping = false;

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

async function main() {
  if (process.env.WORKER_ONCE === 'true') {
    await worker.runOnce();
    await db.end();
    return;
  }
  while (!stopping) {
    const job = await worker.runOnce();
    if (!job) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await db.end();
}

main().catch(async (error) => {
  console.error('Tool worker failed:', error.message);
  await db.end().catch(() => {});
  process.exitCode = 1;
});
