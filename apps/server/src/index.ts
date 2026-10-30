import http from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { NET_CONFIG } from '@tower-clash/shared';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT || NET_CONFIG.defaultPort);
const app = createApp();
const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
  }),
});

gameServer.listen(PORT).then(() => {
  console.log(`[Tower Clash Server] Listening on ws://localhost:${PORT}`);
  console.log(`[Tower Clash Server] Health check available at http://localhost:${PORT}/health`);
});

export { gameServer, server };
