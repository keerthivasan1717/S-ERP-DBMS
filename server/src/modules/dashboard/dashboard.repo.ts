import { DbAdapter } from '../../db/adapter.js';

export class DashboardRepo {
  constructor(private db: DbAdapter) {}

  async getAdminStats() {
    const userCount = await this.db.one<any>('SELECT COUNT(*) AS c FROM app_user');
    const deptCount = await this.db.one<any>('SELECT COUNT(*) AS c FROM department');
    const empCount = await this.db.one<any>('SELECT COUNT(*) AS c FROM employee');
    const activeProjectCount = await this.db.one<any>("SELECT COUNT(*) AS c FROM project WHERE status = 'Active'");

    return {
      userCount: Number(userCount?.c || 0),
      deptCount: Number(deptCount?.c || 0),
      empCount: Number(empCount?.c || 0),
      activeProjectCount: Number(activeProjectCount?.c || 0),
    };
  }

  async getStrategicStats() {
    const dimensions = await this.db.query<any>(
      `SELECT d.dimension_id, d.name,
              COUNT(DISTINCT si.indicator_id) AS indicator_count,
              MAX(im.measurement_date) AS latest_measurement_date
       FROM sustainability_dimension d
       LEFT JOIN sustainability_indicator si ON d.dimension_id = si.dimension_id
       LEFT JOIN indicator_measurement im ON si.indicator_id = im.indicator_id
       GROUP BY d.dimension_id, d.name
       ORDER BY d.dimension_id ASC`
    );

    const primaryOrgDim = await this.db.one<any>(
      `SELECT d.name FROM organization_dimension od
       JOIN sustainability_dimension d ON od.dimension_id = d.dimension_id
       WHERE od.org_id = 1`
    );

    const recentDecisions = await this.db.query<any>(
      `SELECT decision_id, title, date FROM decision
       WHERE decision_level = 'Strategic'
       ORDER BY date DESC LIMIT 4`
    );

    const decisionCount = await this.db.one<any>('SELECT COUNT(*) AS c FROM decision');
    const strategicDecisionCount = await this.db.one<any>("SELECT COUNT(*) AS c FROM decision WHERE decision_level = 'Strategic'");
    const reportCount = await this.db.one<any>('SELECT COUNT(*) AS c FROM report');

    return {
      primaryDimension: primaryOrgDim?.name || 'Environmental',
      dimensionStats: dimensions.map((d: any) => ({
        dimension_id: d.dimension_id,
        name: d.name,
        indicator_count: Number(d.indicator_count || 0),
        latest_measurement_date: d.latest_measurement_date || 'No data',
      })),
      recentDecisions,
      totalDecisions: Number(decisionCount?.c || 0),
      strategicDecisions: Number(strategicDecisionCount?.c || 0),
      totalReports: Number(reportCount?.c || 0),
    };
  }

  async getTacticalStats() {
    const projectStats = await this.db.query<any>(
      'SELECT status, COUNT(*) AS count FROM project GROUP BY status'
    );
    const riskStats = await this.db.query<any>(
      'SELECT level, COUNT(*) AS count FROM risk GROUP BY level'
    );
    const openTaskCount = await this.db.one<any>(
      "SELECT COUNT(*) AS c FROM project_task WHERE status IN ('Planned', 'Active')"
    );

    const recentDecisions = await this.db.query<any>(
      `SELECT decision_id, title, date FROM decision
       WHERE decision_level = 'Tactical'
       ORDER BY date DESC LIMIT 4`
    );

    const deptWorkload = await this.db.query<any>(
      `SELECT d.name AS dept_name, COUNT(ep.project_id) AS assignment_count
       FROM department d
       LEFT JOIN employee e ON d.dept_id = e.department_id
       LEFT JOIN employee_project ep ON e.emp_id = ep.emp_id
       GROUP BY d.dept_id, d.name
       ORDER BY d.dept_id ASC`
    );

    return {
      projectsByStatus: projectStats.map((p: any) => ({ status: p.status, count: Number(p.count) })),
      risksByLevel: riskStats.map((r: any) => ({ level: r.level, count: Number(r.count) })),
      openTaskCount: Number(openTaskCount?.c || 0),
      recentDecisions,
      deptWorkload: deptWorkload.map((dw: any) => ({
        dept_name: dw.dept_name,
        assignment_count: Number(dw.assignment_count || 0),
      })),
    };
  }

  async getOperationalStats(empId: number | null, userId: number) {
    let assignedTasks: any[] = [];
    if (empId) {
      assignedTasks = await this.db.query<any>(
        `SELECT t.status, COUNT(*) AS count
         FROM project_task t
         JOIN project p ON t.project_id = p.project_id
         JOIN employee_project ep ON p.project_id = ep.project_id
         WHERE ep.emp_id = ?
         GROUP BY t.status`,
        [empId]
      );
    }

    const startOfMonth = new Date().toISOString().slice(0, 7) + '-01';
    const measurementsThisMonth = await this.db.one<any>(
      'SELECT COUNT(*) AS c FROM indicator_measurement WHERE recorded_by = ? AND measurement_date >= ?',
      [userId, startOfMonth]
    );

    const totalMeasurements = await this.db.one<any>(
      'SELECT COUNT(*) AS c FROM indicator_measurement WHERE recorded_by = ?',
      [userId]
    );

    const recentMeasurements = await this.db.query<any>(
      `SELECT m.measurement_id, m.value, m.measurement_date, si.name AS indicator_name, si.unit
       FROM indicator_measurement m
       JOIN sustainability_indicator si ON m.indicator_id = si.indicator_id
       WHERE m.recorded_by = ?
       ORDER BY m.measurement_date DESC LIMIT 4`,
      [userId]
    );

    return {
      tasksByStatus: assignedTasks.map((t: any) => ({ status: t.status, count: Number(t.count) })),
      measurementsThisMonth: Number(measurementsThisMonth?.c || 0),
      totalMeasurementsEntered: Number(totalMeasurements?.c || 0),
      recentMeasurements,
    };
  }
}
