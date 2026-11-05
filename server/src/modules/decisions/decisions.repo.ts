import { DbAdapter } from '../../db/adapter.js';

export class DecisionsRepo {
  constructor(private db: DbAdapter) {}

  async listDecisions(levelFilter?: string) {
    let sql = `
      SELECT d.decision_id, d.title, d.description, d.decision_level, d.date,
             d.created_by, d.project_id, d.process_id,
             e.name AS creator_name,
             p.name AS project_name,
             bp.name AS process_name
      FROM decision d
      JOIN employee e ON d.created_by = e.emp_id
      LEFT JOIN project p ON d.project_id = p.project_id
      LEFT JOIN business_process bp ON d.process_id = bp.process_id
    `;
    const params: unknown[] = [];
    if (levelFilter) {
      sql += ' WHERE d.decision_level = ?';
      params.push(levelFilter);
    }
    sql += ' ORDER BY d.date DESC, d.decision_id DESC';

    const decisions = await this.db.query<any>(sql, params);
    for (const dec of decisions) {
      dec.risks = await this.db.query<any>(
        `SELECT r.risk_id, r.title, r.level
         FROM decision_risk dr
         JOIN risk r ON dr.risk_id = r.risk_id
         WHERE dr.decision_id = ?`,
        [dec.decision_id]
      );
    }
    return decisions;
  }

  async getDecision(decisionId: number) {
    const decision = await this.db.one<any>(
      `SELECT d.*, e.name AS creator_name, p.name AS project_name, bp.name AS process_name
       FROM decision d
       JOIN employee e ON d.created_by = e.emp_id
       LEFT JOIN project p ON d.project_id = p.project_id
       LEFT JOIN business_process bp ON d.process_id = bp.process_id
       WHERE d.decision_id = ?`,
      [decisionId]
    );
    if (!decision) return null;

    decision.risks = await this.db.query<any>(
      `SELECT r.risk_id, r.title, r.level
       FROM decision_risk dr
       JOIN risk r ON dr.risk_id = r.risk_id
       WHERE dr.decision_id = ?`,
      [decisionId]
    );
    return decision;
  }

  async createDecision(data: {
    title: string;
    description?: string;
    decision_level: 'Strategic' | 'Tactical' | 'Operational';
    date: string;
    created_by: number;
    project_id?: number | null;
    process_id?: number | null;
    riskIds?: number[];
  }) {
    const decId = await this.db.insert(
      'INSERT INTO decision (title, description, decision_level, date, created_by, project_id, process_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.title, data.description || null, data.decision_level, data.date, data.created_by, data.project_id || null, data.process_id || null],
      'decision_id'
    );

    if (data.riskIds) {
      for (const rId of data.riskIds) {
        await this.db.execute('INSERT INTO decision_risk (decision_id, risk_id) VALUES (?, ?)', [decId, rId]);
      }
    }
    return decId;
  }

  async updateDecision(
    decisionId: number,
    data: {
      title: string;
      description?: string;
      decision_level: 'Strategic' | 'Tactical' | 'Operational';
      date: string;
      project_id?: number | null;
      process_id?: number | null;
      riskIds?: number[];
    }
  ) {
    await this.db.execute(
      'UPDATE decision SET title = ?, description = ?, decision_level = ?, date = ?, project_id = ?, process_id = ? WHERE decision_id = ?',
      [data.title, data.description || null, data.decision_level, data.date, data.project_id || null, data.process_id || null, decisionId]
    );

    if (data.riskIds !== undefined) {
      await this.db.execute('DELETE FROM decision_risk WHERE decision_id = ?', [decisionId]);
      for (const rId of data.riskIds) {
        await this.db.execute('INSERT INTO decision_risk (decision_id, risk_id) VALUES (?, ?)', [decisionId, rId]);
      }
    }
  }

  async deleteDecision(decisionId: number) {
    await this.db.execute('DELETE FROM decision WHERE decision_id = ?', [decisionId]);
  }
}
