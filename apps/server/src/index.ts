import { createServer } from 'node:http';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Server } from 'colyseus';
import { createApiApp } from './api';
import { registerRooms } from './app.config';

const PORT = Number(process.env.PORT ?? 2567);

const app = createApiApp();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

registerRooms(gameServer);

gameServer
  .listen(PORT)
  .then(() => {
    console.log(`✅ Colyseus listening on ws://0.0.0.0:${PORT}`);
    console.log(`📊 HTTP API: http://0.0.0.0:${PORT}/api/stats/top`);
  })
  .catch((err: unknown) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down…');
  gameServer.gracefullyShutdown().finally(() => process.exit(0));
});
