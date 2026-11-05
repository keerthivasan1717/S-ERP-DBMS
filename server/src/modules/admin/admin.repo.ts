import { DbAdapter } from '../../db/adapter.js';

export class AdminRepo {
  constructor(private db: DbAdapter) {}

  // Organization
  async getOrganization() {
    const org = await this.db.one<any>('SELECT * FROM organization LIMIT 1');
    if (!org) return null;
    const dimensions = await this.db.query<any>(
      `SELECT d.dimension_id, d.name
       FROM organization_dimension od
       JOIN sustainability_dimension d ON od.dimension_id = d.dimension_id
       WHERE od.org_id = ?`,
      [org.org_id]
    );
    return { ...org, dimensions };
  }

  async updateOrganization(orgId: number, data: { name: string; description?: string; address?: string; dimensionIds?: number[] }) {
    await this.db.execute(
      'UPDATE organization SET name = ?, description = ?, address = ? WHERE org_id = ?',
      [data.name, data.description || null, data.address || null, orgId]
    );

    if (data.dimensionIds) {
      await this.db.execute('DELETE FROM organization_dimension WHERE org_id = ?', [orgId]);
      for (const dimId of data.dimensionIds) {
        await this.db.execute(
          'INSERT INTO organization_dimension (org_id, dimension_id) VALUES (?, ?)',
          [orgId, dimId]
        );
      }
    }
    return this.getOrganization();
  }

  // Departments
  async listDepartments() {
    return this.db.query<any>(
      `SELECT d.dept_id, d.name, d.description, d.parent_dept_id, d.org_id,
              p.name AS parent_name,
              COUNT(e.emp_id) AS employee_count
       FROM department d
       LEFT JOIN department p ON d.parent_dept_id = p.dept_id
       LEFT JOIN employee e ON d.dept_id = e.department_id
       GROUP BY d.dept_id, d.name, d.description, d.parent_dept_id, d.org_id, p.name
       ORDER BY d.dept_id ASC`
    );
  }

  async createDepartment(data: { name: string; description?: string; parent_dept_id?: number | null; org_id: number }) {
    return this.db.insert(
      'INSERT INTO department (name, description, parent_dept_id, org_id) VALUES (?, ?, ?, ?)',
      [data.name, data.description || null, data.parent_dept_id || null, data.org_id],
      'dept_id'
    );
  }

  async updateDepartment(deptId: number, data: { name: string; description?: string; parent_dept_id?: number | null }) {
    await this.db.execute(
      'UPDATE department SET name = ?, description = ?, parent_dept_id = ? WHERE dept_id = ?',
      [data.name, data.description || null, data.parent_dept_id || null, deptId]
    );
  }

  async deleteDepartment(deptId: number) {
    const empCount = await this.db.one<any>(
      'SELECT COUNT(*) AS c FROM employee WHERE department_id = ?',
      [deptId]
    );
    if (Number(empCount?.c || 0) > 0) {
      throw new Error('CONFLICT: Department has assigned employees. Reassign them before deleting.');
    }

    const childCount = await this.db.one<any>(
      'SELECT COUNT(*) AS c FROM department WHERE parent_dept_id = ?',
      [deptId]
    );
    if (Number(childCount?.c || 0) > 0) {
      throw new Error('CONFLICT: Department has sub-departments. Reassign or remove them first.');
    }

    await this.db.execute('DELETE FROM department WHERE dept_id = ?', [deptId]);
  }

  // Employees
  async listEmployees() {
    return this.db.query<any>(
      `SELECT e.emp_id, e.name, e.email, e.role, e.department_id, e.created_at,
              d.name AS department_name
       FROM employee e
       JOIN department d ON e.department_id = d.dept_id
       ORDER BY e.emp_id ASC`
    );
  }

  async createEmployee(data: { name: string; email: string; role: string; department_id: number }) {
    return this.db.insert(
      'INSERT INTO employee (name, email, role, department_id) VALUES (?, ?, ?, ?)',
      [data.name, data.email, data.role, data.department_id],
      'emp_id'
    );
  }

  async updateEmployee(empId: number, data: { name: string; email: string; role: string; department_id: number }) {
    await this.db.execute(
      'UPDATE employee SET name = ?, email = ?, role = ?, department_id = ? WHERE emp_id = ?',
      [data.name, data.email, data.role, data.department_id, empId]
    );
  }

  async deleteEmployee(empId: number) {
    await this.db.execute('DELETE FROM employee WHERE emp_id = ?', [empId]);
  }

  // Users
  async listUsers() {
    return this.db.query<any>(
      `SELECT u.user_id, u.username, u.app_role, u.emp_id, u.is_active, u.created_at,
              e.name AS employee_name, e.email AS employee_email
       FROM app_user u
       LEFT JOIN employee e ON u.emp_id = e.emp_id
       ORDER BY u.user_id ASC`
    );
  }

  async createUser(data: { username: string; password_hash: string; app_role: string; emp_id?: number | null; is_active?: boolean }) {
    return this.db.insert(
      'INSERT INTO app_user (username, password_hash, app_role, emp_id, is_active) VALUES (?, ?, ?, ?, ?)',
      [data.username, data.password_hash, data.app_role, data.emp_id || null, data.is_active ?? true],
      'user_id'
    );
  }

  async updateUser(userId: number, data: { app_role?: string; emp_id?: number | null; is_active?: boolean; password_hash?: string }) {
    if (data.password_hash) {
      await this.db.execute(
        'UPDATE app_user SET password_hash = ? WHERE user_id = ?',
        [data.password_hash, userId]
      );
    }
    if (data.app_role !== undefined || data.emp_id !== undefined || data.is_active !== undefined) {
      const current = await this.db.one<any>('SELECT * FROM app_user WHERE user_id = ?', [userId]);
      if (!current) throw new Error('User not found');
      await this.db.execute(
        'UPDATE app_user SET app_role = ?, emp_id = ?, is_active = ? WHERE user_id = ?',
        [
          data.app_role ?? current.app_role,
          data.emp_id !== undefined ? data.emp_id : current.emp_id,
          data.is_active !== undefined ? data.is_active : current.is_active,
          userId,
        ]
      );
    }
  }

  async deleteUser(userId: number) {
    await this.db.execute('DELETE FROM app_user WHERE user_id = ?', [userId]);
  }
}
