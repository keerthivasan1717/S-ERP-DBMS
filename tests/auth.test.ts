import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/app.js';
import { closePools } from '../server/src/db/adapter.js';

describe('Auth & Session API', () => {
  afterAll(async () => {
    await closePools();
  });

  const engines = ['mysql', 'postgres'] as const;

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

  it('clears session on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Signed out');
  });
});
