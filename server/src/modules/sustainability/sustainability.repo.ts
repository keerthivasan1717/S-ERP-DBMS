import { DbAdapter } from '../../db/adapter.js';

export class SustainabilityRepo {
  constructor(private db: DbAdapter) {}

  async listDimensions() {
    return this.db.query<any>('SELECT * FROM sustainability_dimension ORDER BY dimension_id ASC');
  }

  async listIndicatorsGrouped() {
    const dimensions = await this.listDimensions();
    for (const dim of dimensions) {
      dim.indicators = await this.db.query<any>(
        `SELECT si.indicator_id, si.name, si.description, si.unit, si.department_id,
                d.name AS department_name,
                (SELECT im.value FROM indicator_measurement im
                 WHERE im.indicator_id = si.indicator_id
                 ORDER BY im.measurement_date DESC, im.measurement_id DESC LIMIT 1) AS latest_value,
                (SELECT im.measurement_date FROM indicator_measurement im
                 WHERE im.indicator_id = si.indicator_id
                 ORDER BY im.measurement_date DESC, im.measurement_id DESC LIMIT 1) AS latest_date
         FROM sustainability_indicator si
         LEFT JOIN department d ON si.department_id = d.dept_id
         WHERE si.dimension_id = ?
         ORDER BY si.indicator_id ASC`,
        [dim.dimension_id]
      );
    }
    return dimensions;
  }

  async getIndicatorDetail(indicatorId: number) {
    const indicator = await this.db.one<any>(
      `SELECT si.*, d.name AS dimension_name, dept.name AS department_name
       FROM sustainability_indicator si
       JOIN sustainability_dimension d ON si.dimension_id = d.dimension_id
       LEFT JOIN department dept ON si.department_id = dept.dept_id
       WHERE si.indicator_id = ?`,
      [indicatorId]
    );
    if (!indicator) return null;

    indicator.measurements = await this.db.query<any>(
      `SELECT im.measurement_id, im.value, im.measurement_date, im.source, im.recorded_by,
              u.username AS recorded_by_username
       FROM indicator_measurement im
       LEFT JOIN app_user u ON im.recorded_by = u.user_id
       WHERE im.indicator_id = ?
       ORDER BY im.measurement_date DESC, im.measurement_id DESC`,
      [indicatorId]
    );

    return indicator;
  }

  async createIndicator(data: { name: string; description?: string; unit: string; dimension_id: number; department_id?: number | null }) {
    return this.db.insert(
      'INSERT INTO sustainability_indicator (name, description, unit, dimension_id, department_id) VALUES (?, ?, ?, ?, ?)',
      [data.name, data.description || null, data.unit, data.dimension_id, data.department_id || null],
      'indicator_id'
    );
  }

  // Reports
  async listReports() {
    return this.db.query<any>(
      `SELECT r.report_id, r.title, r.type, r.generated_by, r.created_at, r.file_path,
              e.name AS generated_by_name,
              ip.phase_id, ip.name AS phase_name
       FROM report r
       JOIN employee e ON r.generated_by = e.emp_id
       LEFT JOIN phase_report pr ON r.report_id = pr.report_id
       LEFT JOIN implementation_phase ip ON pr.phase_id = ip.phase_id
       ORDER BY r.created_at DESC`
    );
  }

  async createReport(data: { title: string; type: 'Sustainability' | 'Performance'; generated_by: number; file_path?: string; phase_id?: number | null }) {
    const reportId = await this.db.insert(
      'INSERT INTO report (title, type, generated_by, file_path) VALUES (?, ?, ?, ?)',
      [data.title, data.type, data.generated_by, data.file_path || null],
      'report_id'
    );
    if (data.phase_id) {
      await this.db.execute(
        'INSERT INTO phase_report (phase_id, report_id) VALUES (?, ?)',
        [data.phase_id, reportId]
      );
    }
    return reportId;
  }
}
