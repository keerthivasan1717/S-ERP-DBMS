import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { DecisionsRepo } from './decisions.repo.js';

export const decisionsRouter = Router();

decisionsRouter.use(authenticate);

// View decisions (Admin, Strategic Manager, Tactical Manager)
decisionsRouter.get('/', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const repo = new DecisionsRepo(req.db!);
  const levelFilter = typeof req.query.level === 'string' ? req.query.level : undefined;
  const decisions = await repo.listDecisions(levelFilter);
  res.json(decisions);
});

decisionsRouter.get('/:id', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const repo = new DecisionsRepo(req.db!);
  const decision = await repo.getDecision(Number(req.params.id));
  if (!decision) {
    res.status(404).json({ error: 'Decision not found' });
    return;
  }
  res.json(decision);
});

// Create decision (Admin, Strategic Manager, Tactical Manager)
decisionsRouter.post('/', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    decision_level: z.enum(['Strategic', 'Tactical', 'Operational']),
    date: z.string(),
    project_id: z.number().nullable().optional(),
    process_id: z.number().nullable().optional(),
    riskIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);

  // Decisional paradigm enforcement per role
  const userRole = req.user!.role;
  if (userRole === 'Tactical Manager' && data.decision_level !== 'Tactical') {
    res.status(403).json({ error: 'Forbidden: Tactical Managers may only record Tactical decisions.' });
    return;
  }
  if (userRole === 'Strategic Manager' && data.decision_level !== 'Strategic') {
    res.status(403).json({ error: 'Forbidden: Strategic Managers may only record Strategic decisions.' });
    return;
  }

  // Fallback to empId from user or first employee if admin has no empId
  const created_by = req.user!.empId || 1;

  const repo = new DecisionsRepo(req.db!);
  const decisionId = await repo.createDecision({
    ...data,
    created_by,
  });

  res.status(201).json({ decision_id: decisionId, message: 'Decision created successfully' });
});

decisionsRouter.put('/:id', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const decisionId = Number(req.params.id);
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    decision_level: z.enum(['Strategic', 'Tactical', 'Operational']),
    date: z.string(),
    project_id: z.number().nullable().optional(),
    process_id: z.number().nullable().optional(),
    riskIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);

  const userRole = req.user!.role;
  if (userRole === 'Tactical Manager' && data.decision_level !== 'Tactical') {
    res.status(403).json({ error: 'Forbidden: Tactical Managers may only record Tactical decisions.' });
    return;
  }
  if (userRole === 'Strategic Manager' && data.decision_level !== 'Strategic') {
    res.status(403).json({ error: 'Forbidden: Strategic Managers may only record Strategic decisions.' });
    return;
  }

  const repo = new DecisionsRepo(req.db!);
  await repo.updateDecision(decisionId, data);
  res.json({ message: 'Decision updated successfully' });
});

decisionsRouter.delete('/:id', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const decisionId = Number(req.params.id);
  const repo = new DecisionsRepo(req.db!);
  await repo.deleteDecision(decisionId);
  res.json({ message: 'Decision deleted successfully' });
});
