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
