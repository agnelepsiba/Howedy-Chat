import { createServer } from 'http';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { createSocketServer } from './socket/index.js';

async function main() {
  await connectDb();

  const app = createApp();
  const httpServer = createServer(app);

  createSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
