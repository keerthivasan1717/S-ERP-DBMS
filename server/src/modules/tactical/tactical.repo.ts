import { DbAdapter } from '../../db/adapter.js';

export class TacticalRepo {
  constructor(private db: DbAdapter) {}

  // Projects
  async listProjects() {
    return this.db.query<any>(
      `SELECT p.project_id, p.name, p.description, p.start_date, p.end_date, p.status, p.department_id,
              d.name AS department_name,
              COUNT(DISTINCT t.task_id) AS task_count,
              COUNT(DISTINCT ep.emp_id) AS member_count
       FROM project p
       JOIN department d ON p.department_id = d.dept_id
       LEFT JOIN project_task t ON p.project_id = t.project_id
       LEFT JOIN employee_project ep ON p.project_id = ep.project_id
       GROUP BY p.project_id, p.name, p.description, p.start_date, p.end_date, p.status, p.department_id, d.name
       ORDER BY p.project_id ASC`
    );
  }

  async getProject(projectId: number) {
    const project = await this.db.one<any>(
      `SELECT p.*, d.name AS department_name
       FROM project p
       JOIN department d ON p.department_id = d.dept_id
       WHERE p.project_id = ?`,
      [projectId]
    );
    if (!project) return null;

    const tasks = await this.db.query<any>(
      'SELECT * FROM project_task WHERE project_id = ? ORDER BY start_date ASC',
      [projectId]
    );
    const phases = await this.db.query<any>(
      'SELECT * FROM implementation_phase WHERE project_id = ? ORDER BY start_date ASC',
      [projectId]
    );
    const risks = await this.db.query<any>(
      'SELECT * FROM risk WHERE project_id = ? ORDER BY risk_id ASC',
      [projectId]
    );
    const members = await this.db.query<any>(
      `SELECT ep.*, e.name AS employee_name, e.email, e.role AS employee_role
       FROM employee_project ep
       JOIN employee e ON ep.emp_id = e.emp_id
       WHERE ep.project_id = ?`,
      [projectId]
    );

    return { ...project, tasks, phases, risks, members };
  }

  async createProject(data: { name: string; description?: string; start_date: string; end_date?: string | null; status?: string; department_id: number }) {
    return this.db.insert(
      'INSERT INTO project (name, description, start_date, end_date, status, department_id) VALUES (?, ?, ?, ?, ?, ?)',
      [data.name, data.description || null, data.start_date, data.end_date || null, data.status || 'Planned', data.department_id],
      'project_id'
    );
  }

  async updateProject(projectId: number, data: { name: string; description?: string; start_date: string; end_date?: string | null; status: string; department_id: number }) {
    await this.db.execute(
      'UPDATE project SET name = ?, description = ?, start_date = ?, end_date = ?, status = ?, department_id = ? WHERE project_id = ?',
      [data.name, data.description || null, data.start_date, data.end_date || null, data.status, data.department_id, projectId]
    );
  }

  async deleteProject(projectId: number) {
    await this.db.execute('DELETE FROM project WHERE project_id = ?', [projectId]);
  }

  // Tasks
  async createTask(data: { project_id: number; name: string; description?: string; status?: string; start_date: string; end_date?: string | null }) {
    return this.db.insert(
      'INSERT INTO project_task (project_id, name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [data.project_id, data.name, data.description || null, data.status || 'Planned', data.start_date, data.end_date || null],
      'task_id'
    );
  }

  async updateTask(taskId: number, data: { name: string; description?: string; status: string; start_date: string; end_date?: string | null }) {
    await this.db.execute(
      'UPDATE project_task SET name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE task_id = ?',
      [data.name, data.description || null, data.status, data.start_date, data.end_date || null, taskId]
    );
  }

  async deleteTask(taskId: number) {
    await this.db.execute('DELETE FROM project_task WHERE task_id = ?', [taskId]);
  }

  // Phases
  async createPhase(data: { project_id: number; name: string; description?: string; start_date: string; end_date?: string | null }) {
    return this.db.insert(
      'INSERT INTO implementation_phase (project_id, name, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [data.project_id, data.name, data.description || null, data.start_date, data.end_date || null],
      'phase_id'
    );
  }

  async updatePhase(phaseId: number, data: { name: string; description?: string; start_date: string; end_date?: string | null }) {
    await this.db.execute(
      'UPDATE implementation_phase SET name = ?, description = ?, start_date = ?, end_date = ? WHERE phase_id = ?',
      [data.name, data.description || null, data.start_date, data.end_date || null, phaseId]
    );
  }

  async deletePhase(phaseId: number) {
    await this.db.execute('DELETE FROM implementation_phase WHERE phase_id = ?', [phaseId]);
  }

  // Risks
  async createRisk(data: { project_id: number; title: string; description?: string; level: string }) {
    return this.db.insert(
      'INSERT INTO risk (project_id, title, description, level) VALUES (?, ?, ?, ?)',
      [data.project_id, data.title, data.description || null, data.level],
      'risk_id'
    );
  }

  async updateRisk(riskId: number, data: { title: string; description?: string; level: string }) {
    await this.db.execute(
      'UPDATE risk SET title = ?, description = ?, level = ? WHERE risk_id = ?',
      [data.title, data.description || null, data.level, riskId]
    );
  }

  async deleteRisk(riskId: number) {
    await this.db.execute('DELETE FROM risk WHERE risk_id = ?', [riskId]);
  }

  // Employee-Project Members
  async addMember(projectId: number, data: { emp_id: number; role: string; allocation_percentage?: number }) {
    const alloc = data.allocation_percentage ?? 100.0;
    const existing = await this.db.query<any>(
      'SELECT SUM(allocation_percentage) AS total_alloc FROM employee_project WHERE emp_id = ? AND project_id != ?',
      [data.emp_id, projectId]
    );
    const currentAlloc = Number(existing[0]?.total_alloc || 0);
    if (currentAlloc + alloc > 100.0) {
      throw new Error(`Total allocation for employee cannot exceed 100% (current: ${currentAlloc}%, attempted +${alloc}%).`);
    }

    const already = await this.db.one<any>(
      'SELECT * FROM employee_project WHERE project_id = ? AND emp_id = ?',
      [projectId, data.emp_id]
    );
    if (already) {
      await this.db.execute(
        'UPDATE employee_project SET role = ?, allocation_percentage = ? WHERE project_id = ? AND emp_id = ?',
        [data.role, alloc, projectId, data.emp_id]
      );
    } else {
      await this.db.execute(
        'INSERT INTO employee_project (project_id, emp_id, role, allocation_percentage) VALUES (?, ?, ?, ?)',
        [projectId, data.emp_id, data.role, alloc]
      );
    }
  }

  async removeMember(projectId: number, empId: number) {
    await this.db.execute(
      'DELETE FROM employee_project WHERE project_id = ? AND emp_id = ?',
      [projectId, empId]
    );
  }

  // Business Processes
  async listProcesses() {
    const processes = await this.db.query<any>(
      `SELECT bp.process_id, bp.name, bp.description, bp.department_id,
              d.name AS department_name
       FROM business_process bp
       JOIN department d ON bp.department_id = d.dept_id
       ORDER BY bp.process_id ASC`
    );

    for (const p of processes) {
      p.resources = await this.db.query<any>(
        `SELECT pr.resource_id, pr.quantity, pr.unit, r.name, r.type
         FROM process_resource pr
         JOIN resource r ON pr.resource_id = r.resource_id
         WHERE pr.process_id = ?`,
        [p.process_id]
      );
      p.indicators = await this.db.query<any>(
        `SELECT pi.indicator_id, si.name, si.unit
         FROM process_indicator pi
         JOIN sustainability_indicator si ON pi.indicator_id = si.indicator_id
         WHERE pi.process_id = ?`,
        [p.process_id]
      );
    }
    return processes;
  }

  async createProcess(data: { name: string; description?: string; department_id: number; indicatorIds?: number[] }) {
    const processId = await this.db.insert(
      'INSERT INTO business_process (name, description, department_id) VALUES (?, ?, ?)',
      [data.name, data.description || null, data.department_id],
      'process_id'
    );

    if (data.indicatorIds) {
      for (const indId of data.indicatorIds) {
        await this.db.execute(
          'INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)',
          [processId, indId]
        );
      }
    }
    return processId;
  }

  async updateProcess(processId: number, data: { name: string; description?: string; department_id: number; indicatorIds?: number[] }) {
    await this.db.execute(
      'UPDATE business_process SET name = ?, description = ?, department_id = ? WHERE process_id = ?',
      [data.name, data.description || null, data.department_id, processId]
    );

    if (data.indicatorIds !== undefined) {
      await this.db.execute('DELETE FROM process_indicator WHERE process_id = ?', [processId]);
      for (const indId of data.indicatorIds) {
        await this.db.execute(
          'INSERT INTO process_indicator (process_id, indicator_id) VALUES (?, ?)',
          [processId, indId]
        );
      }
    }
  }

  async deleteProcess(processId: number) {
    await this.db.execute('DELETE FROM business_process WHERE process_id = ?', [processId]);
  }

  // Resources
  async listResources() {
    return this.db.query<any>('SELECT * FROM resource ORDER BY resource_id ASC');
  }

  async createResource(data: { type: string; name: string; description?: string; unit: string }) {
    return this.db.insert(
      'INSERT INTO resource (type, name, description, unit) VALUES (?, ?, ?, ?)',
      [data.type, data.name, data.description || null, data.unit],
      'resource_id'
    );
  }

  async updateResource(resourceId: number, data: { type: string; name: string; description?: string; unit: string }) {
    await this.db.execute(
      'UPDATE resource SET type = ?, name = ?, description = ?, unit = ? WHERE resource_id = ?',
      [data.type, data.name, data.description || null, data.unit, resourceId]
    );
  }

  async deleteResource(resourceId: number) {
    await this.db.execute('DELETE FROM resource WHERE resource_id = ?', [resourceId]);
  }

  // Process-Resource assignment
  async assignResourceToProcess(processId: number, data: { resource_id: number; quantity: number; unit: string }) {
    await this.db.execute(
      'INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), unit = VALUES(unit)',
      [processId, data.resource_id, data.quantity, data.unit]
    ).catch(async () => {
      // In PostgreSQL ON CONFLICT DO UPDATE
      await this.db.execute(
        'INSERT INTO process_resource (process_id, resource_id, quantity, unit) VALUES (?, ?, ?, ?) ON CONFLICT (process_id, resource_id) DO UPDATE SET quantity = EXCLUDED.quantity, unit = EXCLUDED.unit',
        [processId, data.resource_id, data.quantity, data.unit]
      );
    });
  }

  async removeResourceFromProcess(processId: number, resourceId: number) {
    await this.db.execute(
      'DELETE FROM process_resource WHERE process_id = ? AND resource_id = ?',
      [processId, resourceId]
    );
  }
}
