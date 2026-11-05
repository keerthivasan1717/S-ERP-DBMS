import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/app.js';
import { closePools } from '../server/src/db/adapter.js';

describe('S-ERP CRUD Modules & Dual-Engine Parity', () => {
  afterAll(async () => {
    await closePools();
  });

  const engines = ['mysql', 'mongodb'] as const;

  for (const engine of engines) {
    describe(`Parity & Security on Engine: ${engine}`, () => {
      let adminCookie: string;
      let tacticalCookie: string;
      let strategicCookie: string;
      let operatorCookie: string;

      beforeAll(async () => {
        const resAdmin = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'admin', password: '1234' });
        adminCookie = resAdmin.headers['set-cookie'][0];

        const resTact = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'tactical', password: '1234' });
        tacticalCookie = resTact.headers['set-cookie'][0];

        const resStrat = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'strategic', password: '1234' });
        strategicCookie = resStrat.headers['set-cookie'][0];

        const resOper = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: 'operator', password: '1234' });
        operatorCookie = resOper.headers['set-cookie'][0];
      });

      // RBAC check: Operational user cannot access Tactical screens
      it('Operational User cannot access tactical project management (returns 403)', async () => {
        const res = await request(app)
          .get('/api/tactical/projects')
          .set('Cookie', operatorCookie);

        expect(res.status).toBe(403);
      });

      // Admin CRUD
      it('Admin can list departments and deleting a dept with employees returns 409', async () => {
        const listRes = await request(app)
          .get('/api/admin/departments')
          .set('Cookie', adminCookie);

        expect(listRes.status).toBe(200);
        expect(listRes.body.length).toBeGreaterThanOrEqual(5);

        // Attempt to delete Operations & Manufacturing (has employees)
        const opsDept = listRes.body.find((d: any) => d.name.includes('Operations'));
        expect(opsDept).toBeDefined();

        const delRes = await request(app)
          .delete(`/api/admin/departments/${opsDept.dept_id}`)
          .set('Cookie', adminCookie);

        expect(delRes.status).toBe(409);
        expect(delRes.body.error).toContain('assigned employees');
      });

      it('Admin can create, update and delete a test department', async () => {
        const createRes = await request(app)
          .post('/api/admin/departments')
          .set('Cookie', adminCookie)
          .send({ name: `Test Dept ${engine}`, description: 'Temporary test department', org_id: 1 });

        expect(createRes.status).toBe(201);
        const deptId = createRes.body.dept_id;

        const updateRes = await request(app)
          .put(`/api/admin/departments/${deptId}`)
          .set('Cookie', adminCookie)
          .send({ name: `Updated Dept ${engine}` });
        expect(updateRes.status).toBe(200);

        const deleteRes = await request(app)
          .delete(`/api/admin/departments/${deptId}`)
          .set('Cookie', adminCookie);
        expect(deleteRes.status).toBe(200);
      });

      // Tactical CRUD
      it('Tactical Manager can list projects and tasks', async () => {
        const res = await request(app)
          .get('/api/tactical/projects')
          .set('Cookie', tacticalCookie);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].name).toBe('S-ERP Rollout');
      });

      // Decision Level Enforcement
      it('Enforces decision level constraints per role (Tactical Manager blocked from Strategic)', async () => {
        // Tactical Manager attempting to create a Strategic decision -> 403
        const badRes = await request(app)
          .post('/api/decisions')
          .set('Cookie', tacticalCookie)
          .send({
            title: 'Unauthorized Strategic Pivot',
            decision_level: 'Strategic',
            date: '2026-10-29',
          });

        expect(badRes.status).toBe(403);
        expect(badRes.body.error).toContain('Tactical Managers may only record Tactical decisions');

        // Tactical Manager creating a Tactical decision -> 201
        const goodRes = await request(app)
          .post('/api/decisions')
          .set('Cookie', tacticalCookie)
          .send({
            title: `Valid Tactical Decision on ${engine}`,
            decision_level: 'Tactical',
            date: '2026-10-29',
          });

        expect(goodRes.status).toBe(201);
      });

      // Operational Measurement Entry & Validation
      it('Operational user can enter valid measurement and future date is rejected', async () => {
        // Future date -> 400
        const badDateRes = await request(app)
          .post('/api/operational/measurements')
          .set('Cookie', operatorCookie)
          .send({
            indicator_id: 1,
            value: 120.5,
            measurement_date: '2099-01-01',
            source: 'Future Meter',
          });

        expect(badDateRes.status).toBe(400);
        expect(badDateRes.body.error).toContain('future');

        // Valid date -> 201
        const goodRes = await request(app)
          .post('/api/operational/measurements')
          .set('Cookie', operatorCookie)
          .send({
            indicator_id: 1,
            value: 1350.25,
            measurement_date: '2026-10-28',
            source: 'Manual Calibration Log',
          });

        expect(goodRes.status).toBe(201);
      });

      // Dashboard
      it(`Returns role-specific dashboard metrics on ${engine}`, async () => {
        const adminDash = await request(app).get('/api/dashboard').set('Cookie', adminCookie);
        expect(adminDash.status).toBe(200);
        expect(adminDash.body.stats.userCount).toBeGreaterThanOrEqual(4);
        expect(adminDash.body.stats.deptCount).toBeGreaterThanOrEqual(5);

        const stratDash = await request(app).get('/api/dashboard').set('Cookie', strategicCookie);
        expect(stratDash.status).toBe(200);
        expect(stratDash.body.stats.dimensionStats.length).toBe(3);

        const tactDash = await request(app).get('/api/dashboard').set('Cookie', tacticalCookie);
        expect(tactDash.status).toBe(200);
        expect(tactDash.body.stats.openTaskCount).toBeGreaterThanOrEqual(1);

        const operDash = await request(app).get('/api/dashboard').set('Cookie', operatorCookie);
        expect(operDash.status).toBe(200);
        expect(operDash.body.stats).toHaveProperty('measurementsThisMonth');
      });
    });
  }
});
