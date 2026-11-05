import { DbAdapter } from '../../db/adapter.js';

export class OperationalRepo {
  constructor(private db: DbAdapter) {}

  async getMyTasks(empId: number | null) {
    if (!empId) return [];

    return this.db.query<any>(
      `SELECT t.task_id, t.name, t.description, t.status, t.start_date, t.end_date,
              p.project_id, p.name AS project_name, ep.role AS assignment_role
       FROM project_task t
       JOIN project p ON t.project_id = p.project_id
       JOIN employee_project ep ON p.project_id = ep.project_id
       WHERE ep.emp_id = ?
       ORDER BY t.start_date DESC`,
      [empId]
    );
  }

  async enterMeasurement(data: {
    indicator_id: number;
    value: number;
    measurement_date: string;
    source: string;
    recorded_by: number;
  }) {
    return this.db.insert(
      'INSERT INTO indicator_measurement (indicator_id, value, measurement_date, source, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [data.indicator_id, data.value, data.measurement_date, data.source, data.recorded_by],
      'measurement_id'
    );
  }

  async getRecentMeasurements(limit: number = 30) {
    return this.db.query<any>(
      `SELECT m.measurement_id, m.indicator_id, m.value, m.measurement_date, m.source,
              si.name AS indicator_name, si.unit,
              d.name AS dimension_name,
              u.username AS recorded_by_username
       FROM indicator_measurement m
       JOIN sustainability_indicator si ON m.indicator_id = si.indicator_id
       JOIN sustainability_dimension d ON si.dimension_id = d.dimension_id
       LEFT JOIN app_user u ON m.recorded_by = u.user_id
       ORDER BY m.measurement_date DESC, m.measurement_id DESC
       LIMIT ?`,
      [limit]
    );
  }
}
