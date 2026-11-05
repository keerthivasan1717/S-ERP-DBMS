import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { SustainabilityRepo } from './sustainability.repo.js';

export const sustainabilityRouter = Router();

sustainabilityRouter.use(authenticate);

// List indicators grouped by dimension
sustainabilityRouter.get('/indicators', async (req: Request, res: Response) => {
  const repo = new SustainabilityRepo(req.db!);
  const dimensions = await repo.listIndicatorsGrouped();
  res.json(dimensions);
});

// Indicator detail + measurement history
sustainabilityRouter.get('/indicators/:id', async (req: Request, res: Response) => {
  const repo = new SustainabilityRepo(req.db!);
  const detail = await repo.getIndicatorDetail(Number(req.params.id));
  if (!detail) {
    res.status(404).json({ error: 'Indicator not found' });
    return;
  }
  res.json(detail);
});

// Create indicator (Admin)
sustainabilityRouter.post('/indicators', requireRole('Administrator'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
    dimension_id: z.number(),
    department_id: z.number().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new SustainabilityRepo(req.db!);
  const indicatorId = await repo.createIndicator(data);
  res.status(201).json({ indicator_id: indicatorId, message: 'Indicator created' });
});

// Reports
sustainabilityRouter.get('/reports', async (req: Request, res: Response) => {
  const repo = new SustainabilityRepo(req.db!);
  const reports = await repo.listReports();
  res.json(reports);
});

sustainabilityRouter.post('/reports', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const schema = z.object({
    title: z.string().min(1),
    type: z.enum(['Sustainability', 'Performance']),
    file_path: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new SustainabilityRepo(req.db!);
  const generated_by = req.user!.empId || 1;
  const reportId = await repo.createReport({
    ...data,
    generated_by,
  });
  res.status(201).json({ report_id: reportId, message: 'Report created' });
});
