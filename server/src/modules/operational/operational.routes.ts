import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { OperationalRepo } from './operational.repo.js';

export const operationalRouter = Router();

operationalRouter.use(authenticate);

// View assigned tasks
operationalRouter.get('/my-tasks', async (req: Request, res: Response) => {
  const repo = new OperationalRepo(req.db!);
  const tasks = await repo.getMyTasks(req.user!.empId);
  res.json(tasks);
});

// View recent measurements
operationalRouter.get('/measurements', async (req: Request, res: Response) => {
  const repo = new OperationalRepo(req.db!);
  const measurements = await repo.getRecentMeasurements();
  res.json(measurements);
});

// Enter measurement
operationalRouter.post('/measurements', requireRole('Operational User', 'Administrator'), async (req: Request, res: Response) => {
  const schema = z.object({
    indicator_id: z.number(),
    value: z.number({ invalid_type_error: 'Measurement value must be a valid number' }),
    measurement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
    source: z.string().min(1, 'Source description is required'),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
    return;
  }

  const data = parseResult.data;

  // Validate date is not in future
  const today = new Date().toISOString().slice(0, 10);
  if (data.measurement_date > today) {
    res.status(400).json({ error: `Measurement date (${data.measurement_date}) cannot be in the future (today is ${today}).` });
    return;
  }

  const repo = new OperationalRepo(req.db!);
  try {
    const measurementId = await repo.enterMeasurement({
      indicator_id: data.indicator_id,
      value: data.value,
      measurement_date: data.measurement_date,
      source: data.source,
      recorded_by: req.user!.userId,
    });

    res.status(201).json({
      measurement_id: measurementId,
      message: 'Measurement entered successfully',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record measurement' });
  }
});
