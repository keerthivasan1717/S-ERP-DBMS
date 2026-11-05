import { Router, Request, Response } from 'express';
import { authenticate } from '../../auth/middleware.js';
import { DashboardRepo } from './dashboard.repo.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', async (req: Request, res: Response) => {
  try {
    const repo = new DashboardRepo(req.db!);
    const role = req.user!.role;

    let stats: any = {};
    if (role === 'Administrator') {
      stats = await repo.getAdminStats();
    } else if (role === 'Strategic Manager') {
      stats = await repo.getStrategicStats();
    } else if (role === 'Tactical Manager') {
      stats = await repo.getTacticalStats();
    } else if (role === 'Operational User') {
      stats = await repo.getOperationalStats(req.user!.empId, req.user!.userId);
    }

    res.json({
      role,
      engine: req.user!.engine,
      username: req.user!.username,
      stats,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to retrieve dashboard stats', details: String(err) });
  }
});

dashboardRouter.get('/benchmark', async (req: Request, res: Response) => {
  try {
    const start = performance.now();
    const repo = new DashboardRepo(req.db!);
    await repo.getStrategicStats();
    const elapsed = performance.now() - start;

    res.json({
      engine: req.user!.engine,
      sql: `SELECT d.dimension_id, d.name, COUNT(DISTINCT si.indicator_id) AS indicator_count, MAX(im.measurement_date) AS latest_measurement_date FROM sustainability_dimension d LEFT JOIN sustainability_indicator si ON d.dimension_id = si.dimension_id LEFT JOIN indicator_measurement im ON si.indicator_id = im.indicator_id GROUP BY d.dimension_id, d.name`,
      mongoEquivalent: `db.sustainability_dimension.find({}) + AlaSQL relational table projection`,
      latencyMs: Number(elapsed.toFixed(2)),
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to benchmark', details: String(err) });
  }
});
