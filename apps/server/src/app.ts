import express from 'express';
import cors from 'cors';
import type { HealthResponse } from '@tower-clash/shared';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'tower-clash-server',
      timestamp: Date.now(),
    };
    res.status(200).json(response);
  });

  return app;
}
