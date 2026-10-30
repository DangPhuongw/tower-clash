import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('Server Health Endpoint', () => {
  it('GET /health returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'tower-clash-server');
    expect(typeof res.body.timestamp).toBe('number');
  });
});
