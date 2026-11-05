import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/src/app.js';
import { closePools, getAdapter } from '../server/src/db/adapter.js';

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

      // RBAC check: Operational user cannot delete departments
      it('Admin can list departments and deleting a dept with employees returns 409', async () => {
        const resList = await request(app)
          .get('/api/admin/departments')
          .set('Cookie', adminCookie);

        expect(resList.status).toBe(200);
        expect(Array.isArray(resList.body)).toBe(true);
        expect(resList.body.length).toBeGreaterThan(0);

        // Attempt deleting department 1 (Engineering) which has employees
        const resDelete = await request(app)
          .delete('/api/admin/departments/1')
          .set('Cookie', adminCookie);

        expect(resDelete.status).toBe(409);
        expect(resDelete.body.error).toContain('assigned employees');
      });

      // CRUD check: Admin can create and delete a department without employees
      it('Admin can create, update and delete a test department', async () => {
        const createRes = await request(app)
          .post('/api/admin/departments')
          .set('Cookie', adminCookie)
          .send({
            name: 'Test Temp Dept',
            description: 'Temporary for CRUD test',
            org_id: 1,
          });

        expect(createRes.status).toBe(201);
        const newDeptId = createRes.body.dept_id;
        expect(newDeptId).toBeDefined();

        // Update
        const updateRes = await request(app)
          .put(`/api/admin/departments/${newDeptId}`)
          .set('Cookie', adminCookie)
          .send({
            name: 'Updated Temp Dept',
            description: 'Updated desc',
          });
        expect(updateRes.status).toBe(200);

        // Delete
        const delRes = await request(app)
          .delete(`/api/admin/departments/${newDeptId}`)
          .set('Cookie', adminCookie);
        expect(delRes.status).toBe(200);
      });

      // M4: Employee CRUD
      it('Admin can perform full CRUD on employees', async () => {
        const testEmail = `test.employee.${Date.now()}@oscorp.com`;
        const createRes = await request(app)
          .post('/api/admin/employees')
          .set('Cookie', adminCookie)
          .send({
            name: 'Jane Doe',
            email: testEmail,
            role: 'Junior Analyst',
            department_id: 1,
          });

        expect(createRes.status).toBe(201);
        const empId = createRes.body.emp_id;
        expect(empId).toBeDefined();

        // Update
        const updateRes = await request(app)
          .put(`/api/admin/employees/${empId}`)
          .set('Cookie', adminCookie)
          .send({
            name: 'Jane Smith',
            email: testEmail,
            role: 'Senior Analyst',
            department_id: 1,
          });
        expect(updateRes.status).toBe(200);

        // Delete
        const delRes = await request(app)
          .delete(`/api/admin/employees/${empId}`)
          .set('Cookie', adminCookie);
        expect(delRes.status).toBe(200);
      });

      // M4: User Account Lifecycle (Link to Employee, Reset Password, Activate/Deactivate)
      it('Admin can manage user account lifecycle and employee links', async () => {
        const testUser = `temp_user_${Date.now()}`;
        const createRes = await request(app)
          .post('/api/admin/users')
          .set('Cookie', adminCookie)
          .send({
            username: testUser,
            password: 'InitialPassword123',
            app_role: 'Operational User',
            emp_id: 1,
            is_active: true,
          });

        expect(createRes.status).toBe(201);
        const userId = createRes.body.user_id;
        expect(userId).toBeDefined();

        // Deactivate and reset password
        const updateRes = await request(app)
          .put(`/api/admin/users/${userId}`)
          .set('Cookie', adminCookie)
          .send({
            password: 'NewResetPassword456',
            is_active: false,
          });
        expect(updateRes.status).toBe(200);

        // Attempt login with deactivated user -> expect 403
        const deactLogin = await request(app)
          .post('/api/auth/login')
          .send({ engine, username: testUser, password: 'NewResetPassword456' });
        expect(deactLogin.status).toBe(403);
        expect(deactLogin.body.error).toContain('deactivated');

        // Delete user
        const delRes = await request(app)
          .delete(`/api/admin/users/${userId}`)
          .set('Cookie', adminCookie);
        expect(delRes.status).toBe(200);
      });

      // M4: Organization Profile & Sustainability Dimensions (G1)
      it('Admin can fetch and update Organization profile with dimension focus', async () => {
        const orgRes = await request(app)
          .get('/api/admin/organization')
          .set('Cookie', adminCookie);

        expect(orgRes.status).toBe(200);
        expect(orgRes.body.name).toBe('Oscorp Industries');
        expect(Array.isArray(orgRes.body.dimensions)).toBe(true);

        const updateRes = await request(app)
          .put('/api/admin/organization')
          .set('Cookie', adminCookie)
          .send({
            name: 'Oscorp Industries',
            description: 'Advanced sustainable materials and clean technology enterprise.',
            address: '100 Innovation Boulevard, Tech District',
            dimensionIds: [1, 2, 3],
          });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.dimensions.length).toBe(3);
      });

      // Tactical project operations
      it('Tactical Manager can list projects and inspect project details with tasks', async () => {
        const res = await request(app)
          .get('/api/tactical/projects')
          .set('Cookie', tacticalCookie);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);

        const project = await request(app)
          .get(`/api/tactical/projects/${res.body[0].project_id}`)
          .set('Cookie', tacticalCookie);

        expect(project.status).toBe(200);
        expect(project.body).toHaveProperty('tasks');
        expect(Array.isArray(project.body.tasks)).toBe(true);
        expect(project.body).toHaveProperty('phases');
        expect(Array.isArray(project.body.phases)).toBe(true);
        expect(project.body).toHaveProperty('risks');
        expect(Array.isArray(project.body.risks)).toBe(true);
        expect(project.body).toHaveProperty('members');
        expect(Array.isArray(project.body.members)).toBe(true);
      });

      // M5: 100% Employee Project Allocation Rule Check
      it('Enforces 100% maximum allocation per employee across projects', async () => {
        // Emp 4 (Operational user) already has 60% on project 1
        // Attempting to assign 50% on project 2 -> Total 60% + 50% = 110% -> must reject with 400
        const overAllocRes = await request(app)
          .post('/api/tactical/projects/2/members')
          .set('Cookie', tacticalCookie)
          .send({
            emp_id: 4,
            role: 'Lead Architect',
            allocation_percentage: 50,
          });

        expect(overAllocRes.status).toBe(400);
        expect(overAllocRes.body.error).toContain('cannot exceed 100%');

        // Allocating within remainder (30%) -> Total 60% + 30% = 90% -> succeeds
        const validAllocRes = await request(app)
          .post('/api/tactical/projects/2/members')
          .set('Cookie', tacticalCookie)
          .send({
            emp_id: 4,
            role: 'Telemetry Field Operator',
            allocation_percentage: 30,
          });

        expect(validAllocRes.status).toBe(201);
      });

      // M5: Tactical Project & Components CRUD
      it('Tactical Manager can perform CRUD on tasks, phases and risks', async () => {
        // 1. Create task
        const taskRes = await request(app)
          .post('/api/tactical/projects/1/tasks')
          .set('Cookie', tacticalCookie)
          .send({
            name: 'Temp Project Task',
            description: 'Testing task lifecycle',
            status: 'Planned',
            start_date: '2026-11-01',
          });
        expect(taskRes.status).toBe(201);
        const taskId = taskRes.body.task_id;

        // Update task
        await request(app)
          .put(`/api/tactical/tasks/${taskId}`)
          .set('Cookie', tacticalCookie)
          .send({
            name: 'Updated Temp Task',
            status: 'Active',
            start_date: '2026-11-01',
          });

        // Delete task
        const delTask = await request(app)
          .delete(`/api/tactical/tasks/${taskId}`)
          .set('Cookie', tacticalCookie);
        expect(delTask.status).toBe(200);

        // 2. Create Risk
        const riskRes = await request(app)
          .post('/api/tactical/projects/1/risks')
          .set('Cookie', tacticalCookie)
          .send({
            title: 'Supply Chain Delay',
            description: 'Material arrival latency',
            level: 'Medium',
          });
        expect(riskRes.status).toBe(201);
        const riskId = riskRes.body.risk_id;

        // Delete Risk
        const delRisk = await request(app)
          .delete(`/api/tactical/risks/${riskId}`)
          .set('Cookie', tacticalCookie);
        expect(delRisk.status).toBe(200);
      });

      // Decisional paradigm: Tactical Manager cannot create Strategic decisions
      it('Enforces decision level constraints per role (Tactical Manager blocked from Strategic)', async () => {
        const res = await request(app)
          .post('/api/decisions')
          .set('Cookie', tacticalCookie)
          .send({
            title: 'Unauthorized Strategic Move',
            description: 'Trying to enact corporate policy',
            decision_level: 'Strategic',
            date: '2026-11-01',
          });

        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Tactical Managers may only record Tactical decisions');
      });

      // Operational measurement entry
      it('Operational user can enter valid measurement and future date is rejected', async () => {
        // Valid measurement
        const resValid = await request(app)
          .post('/api/operational/measurements')
          .set('Cookie', operatorCookie)
          .send({
            indicator_id: 1,
            value: 125.5,
            measurement_date: '2026-11-01',
            source: 'Field sensor station #4',
          });

        expect(resValid.status).toBe(201);
        expect(resValid.body).toHaveProperty('measurement_id');

        // Invalid future date
        const resFuture = await request(app)
          .post('/api/operational/measurements')
          .set('Cookie', operatorCookie)
          .send({
            indicator_id: 1,
            value: 200,
            measurement_date: '2099-01-01',
            source: 'Invalid future forecast',
          });

        expect(resFuture.status).toBe(400);
        expect(resFuture.body.error).toContain('cannot be in the future');

        // M6: Reject duplicate measurement on same date (Gap G4)
        const resDup = await request(app)
          .post('/api/operational/measurements')
          .set('Cookie', operatorCookie)
          .send({
            indicator_id: 1,
            value: 130.0,
            measurement_date: '2026-11-01',
            source: 'Duplicate meter reading',
          });
        expect(resDup.status).toBe(400);
        expect(resDup.body.error).toContain('already exists');

        // M6: Operational user cannot create indicators (returns 403)
        const unauthInd = await request(app)
          .post('/api/sustainability/indicators')
          .set('Cookie', operatorCookie)
          .send({
            name: 'Unauthorized Metric',
            unit: 'kg',
            dimension_id: 1,
          });
        expect(unauthInd.status).toBe(403);

        // M6: Strategic Manager can inspect indicator detail and measurement history
        const indDetail = await request(app)
          .get('/api/sustainability/indicators/1')
          .set('Cookie', strategicCookie);
        expect(indDetail.status).toBe(200);
        expect(indDetail.body).toHaveProperty('measurements');
        expect(Array.isArray(indDetail.body.measurements)).toBe(true);
        expect(indDetail.body.measurements.length).toBeGreaterThan(0);

        // Cleanup test measurement
        if (resValid.body?.measurement_id) {
          const db = getAdapter(engine);
          await db.execute('DELETE FROM indicator_measurement WHERE measurement_id = ?', [resValid.body.measurement_id]);
        }
      });

      // M7: Resources & Process Allocation
      it('Tactical Manager can manage resources and allocate to business process', async () => {
        // Create Resource
        const createRes = await request(app)
          .post('/api/tactical/resources')
          .set('Cookie', tacticalCookie)
          .send({
            type: 'Material',
            name: `Test Raw Steel Batch ${Date.now()}`,
            description: 'Recycled high-tensile steel billets',
            unit: 'metric_tons',
          });
        expect(createRes.status).toBe(201);
        const resourceId = createRes.body.resource_id;
        expect(resourceId).toBeDefined();

        // Allocate Resource to Business Process 1
        const allocRes = await request(app)
          .post('/api/tactical/processes/1/resources')
          .set('Cookie', tacticalCookie)
          .send({
            resource_id: resourceId,
            quantity: 50.5,
            unit: 'metric_tons',
          });
        expect(allocRes.status).toBe(201);

        // Verify Process lists the resource
        const procList = await request(app)
          .get('/api/tactical/processes')
          .set('Cookie', tacticalCookie);
        expect(procList.status).toBe(200);
        const proc1 = procList.body.find((p: any) => p.process_id === 1);
        expect(proc1).toBeDefined();
        expect(proc1.resources.some((r: any) => r.resource_id === resourceId)).toBe(true);

        // Remove resource from process
        const deallocRes = await request(app)
          .delete(`/api/tactical/processes/1/resources/${resourceId}`)
          .set('Cookie', tacticalCookie);
        expect(deallocRes.status).toBe(200);

        // Delete Resource
        const delRes = await request(app)
          .delete(`/api/tactical/resources/${resourceId}`)
          .set('Cookie', tacticalCookie);
        expect(delRes.status).toBe(200);
      });

      // M7: Decisional Paradigm & Risk Linkage (Strategic & Tactical decisions, risk linking)
      it('Decisional paradigm: Strategic Manager can log Strategic decision linked to risk (G3)', async () => {
        const stratDec = await request(app)
          .post('/api/decisions')
          .set('Cookie', strategicCookie)
          .send({
            title: `Strategic Carbon Divestment ${Date.now()}`,
            description: 'Phasing out scope 1 heavy fuel oil burners by Q3',
            decision_level: 'Strategic',
            date: '2026-11-01',
            riskIds: [1],
          });
        expect(stratDec.status).toBe(201);
        const decId = stratDec.body.decision_id;
        expect(decId).toBeDefined();

        // Inspect detail & verify linked risk
        const detail = await request(app)
          .get(`/api/decisions/${decId}`)
          .set('Cookie', strategicCookie);
        expect(detail.status).toBe(200);
        expect(detail.body.decision_level).toBe('Strategic');
        expect(Array.isArray(detail.body.risks)).toBe(true);
        expect(detail.body.risks.some((r: any) => r.risk_id === 1)).toBe(true);

        // Cleanup decision
        const db = getAdapter(engine);
        await db.execute('DELETE FROM decision_risk WHERE decision_id = ?', [decId]);
        await db.execute('DELETE FROM decision WHERE decision_id = ?', [decId]);
      });

      // M7: Implementation Phase Report Archival & Retrieval (G5)
      it('Implementation Phase Report Archival and Retrieval on both engines (G5)', async () => {
        const reportTitle = `Audit Phase 1 ESG Verification ${Date.now()}`;
        const createRep = await request(app)
          .post('/api/sustainability/reports')
          .set('Cookie', tacticalCookie)
          .send({
            title: reportTitle,
            type: 'Performance',
            phase_id: 1,
            file_path: '/docs/reports/generated/phase1_audit.md',
          });
        expect(createRep.status).toBe(201);
        const repId = createRep.body.report_id;
        expect(repId).toBeDefined();

        // Fetch reports list and verify phase link
        const repList = await request(app)
          .get('/api/sustainability/reports')
          .set('Cookie', tacticalCookie);
        expect(repList.status).toBe(200);
        const found = repList.body.find((r: any) => r.report_id === repId);
        expect(found).toBeDefined();
        expect(found.phase_id).toBe(1);
        expect(found.phase_name).toBeDefined();

        // Cleanup report
        const db = getAdapter(engine);
        await db.execute('DELETE FROM phase_report WHERE report_id = ?', [repId]);
        await db.execute('DELETE FROM report WHERE report_id = ?', [repId]);
      });

      // Dashboard analytics endpoint per role
      it(`Returns role-specific dashboard metrics on ${engine}`, async () => {
        const resStrat = await request(app)
          .get('/api/dashboard')
          .set('Cookie', strategicCookie);

        expect(resStrat.status).toBe(200);
        expect(resStrat.body.role).toBe('Strategic Manager');
        expect(resStrat.body).toHaveProperty('stats');
      });
    });
  }
});
