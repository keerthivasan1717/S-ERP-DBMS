import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/app.js';
import { closePools } from '../server/src/db/adapter.js';
import { resetRateLimits } from '../server/src/auth/rate-limiter.js';

describe('Auth & Session API', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterAll(async () => {
    await closePools();
  });

  const engines = ['mysql', 'mongodb'] as const;

  for (const engine of engines) {
    describe(`Engine: ${engine}`, () => {
      it(`logs in as admin on ${engine}`, async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'admin', password: '1234' });

        expect(res.status).toBe(200);
        expect(res.body.user).toMatchObject({
          username: 'admin',
          role: 'Administrator',
          engine,
        });
        expect(res.headers['set-cookie']).toBeDefined();

        const cookie = res.headers['set-cookie'][0];

        // Access /api/auth/me
        const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
        expect(meRes.status).toBe(200);
        expect(meRes.body.user.role).toBe('Administrator');
      });

      it(`logs in as all other demo roles on ${engine}`, async () => {
        const roles = [
          { username: 'strategic', password: '1234', role: 'Strategic Manager' },
          { username: 'tactical', password: '1234', role: 'Tactical Manager' },
          { username: 'operator', password: '1234', role: 'Operational User' },
        ];

        for (const account of roles) {
          const res = await request(app)
            .post('/api/auth/login')
            .send({ engine, username: account.username, password: account.password });

          expect(res.status).toBe(200);
          expect(res.body.user.role).toBe(account.role);
        }
      });

      it(`rejects invalid password on ${engine}`, async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'admin', password: 'WrongPassword' });

        expect(res.status).toBe(401);
      });
    });
  }

  describe('Rate Limiting & Security', () => {
    it('throttles rapid login attempts (exceeding 10 within 15 min window)', async () => {
      // 10 allowed attempts
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ engine: 'mysql', username: 'ratelimit_target', password: 'bad' });
        expect(res.status).toBe(401);
      }

      // 11th attempt should trigger 429
      const throttledRes = await request(app)
        .post('/api/auth/login')
        .send({ engine: 'mysql', username: 'ratelimit_target', password: 'bad' });

      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body.error).toContain('Too many login attempts');
      expect(throttledRes.headers['retry-after']).toBeDefined();
    });

    it('rejects unauthenticated requests to protected endpoints', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Authentication required');
    });

    it('enforces RBAC: Operational User cannot access admin endpoints', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ engine: 'mysql', username: 'operator', password: '1234' });
      const cookie = loginRes.headers['set-cookie'][0];

      const res = await request(app)
        .get('/api/admin/users')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Forbidden');
    });
  });

  describe('Cross-Engine Session Isolation', () => {
    it('ensures session tokens are tied strictly to their chosen engine', async () => {
      const mysqlLogin = await request(app)
        .post('/api/auth/login')
        .send({ engine: 'mysql', username: 'admin', password: '1234' });
      const mysqlCookie = mysqlLogin.headers['set-cookie'][0];

      const mongoLogin = await request(app)
        .post('/api/auth/login')
        .send({ engine: 'mongodb', username: 'admin', password: '1234' });
      const mongoCookie = mongoLogin.headers['set-cookie'][0];

      const meMysql = await request(app).get('/api/auth/me').set('Cookie', mysqlCookie);
      expect(meMysql.status).toBe(200);
      expect(meMysql.body.user.engine).toBe('mysql');

      const meMongo = await request(app).get('/api/auth/me').set('Cookie', mongoCookie);
      expect(meMongo.status).toBe(200);
      expect(meMongo.body.user.engine).toBe('mongodb');
    });
  });

  it('clears session on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Signed out');
  });
});
