import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/app.js';

describe('S-ERP Server API', () => {
  it('GET /api/health returns 200 with service information', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 's-erp-backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /api/engines/status returns structured status for both engines', async () => {
    const response = await request(app).get('/api/engines/status');
    expect([200, 503]).toContain(response.status);
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('mysql');
    expect(response.body).toHaveProperty('mongodb');

    expect(response.body.mysql).toHaveProperty('engine', 'mysql');
    expect(response.body.mysql).toHaveProperty('reachable');

    expect(response.body.mongodb).toHaveProperty('engine', 'mongodb');
    expect(response.body.mongodb).toHaveProperty('reachable');
  });
});
