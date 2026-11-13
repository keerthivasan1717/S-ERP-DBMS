import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { DecisionsRepo } from './decisions.repo.js';

export const decisionsRouter = Router();

decisionsRouter.use(authenticate);

// Decision Levels (Decisional Paradigm / Administration Levels)
decisionsRouter.get('/levels', async (req: Request, res: Response) => {
  const repo = new DecisionsRepo(req.db!);
  const levels = await repo.listDecisionLevels();
  res.json(levels);
});

decisionsRouter.post('/levels', requireRole('Administrator'), async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2, 'Administration level name must be at least 2 characters').max(50),
      description: z.string().trim().optional(),
    });
    const data = schema.parse(req.body);
    const repo = new DecisionsRepo(req.db!);
    const existing = await repo.getDecisionLevelByName(data.name);
    if (existing) {
      res.status(400).json({ error: `Administration level '${data.name}' already exists.` });
      return;
    }
    const levelId = await repo.createDecisionLevel(data);
    res.status(201).json({
      level_id: levelId,
      name: data.name,
      description: data.description,
      message: 'Administration level created successfully',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to create administration level' });
  }
});

decisionsRouter.delete('/levels/:id', requireRole('Administrator'), async (req: Request, res: Response) => {
  try {
    const levelId = Number(req.params.id);
    const repo = new DecisionsRepo(req.db!);
    const level = await repo.getDecisionLevelById(levelId);
    if (!level) {
      res.status(404).json({ error: 'Administration level not found.' });
      return;
    }
    if (['Strategic', 'Tactical', 'Operational'].includes(level.name)) {
      res.status(400).json({ error: `Cannot delete built-in system administration level '${level.name}'.` });
      return;
    }
    const decisionsCount = await req.db!.one<any>(
      'SELECT COUNT(*) AS c FROM decision WHERE decision_level = ?',
      [level.name]
    );
    if (Number(decisionsCount?.c || 0) > 0) {
      res.status(409).json({
        error: `Cannot delete administration level '${level.name}': ${decisionsCount.c} decision(s) are associated with it.`,
      });
      return;
    }
    await repo.deleteDecisionLevel(levelId);
    res.json({ message: `Administration level '${level.name}' deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete administration level' });
  }
});

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
    decision_level: z.string().min(1, 'Decision level is required'),
    date: z.string(),
    project_id: z.number().nullable().optional(),
    process_id: z.number().nullable().optional(),
    riskIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);

  const repo = new DecisionsRepo(req.db!);
  const levelExists = await repo.getDecisionLevelByName(data.decision_level);
  if (!levelExists) {
    res.status(400).json({ error: `Invalid decision level: '${data.decision_level}' does not exist.` });
    return;
  }

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
    decision_level: z.string().min(1, 'Decision level is required'),
    date: z.string(),
    project_id: z.number().nullable().optional(),
    process_id: z.number().nullable().optional(),
    riskIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);

  const repo = new DecisionsRepo(req.db!);
  const levelExists = await repo.getDecisionLevelByName(data.decision_level);
  if (!levelExists) {
    res.status(400).json({ error: `Invalid decision level: '${data.decision_level}' does not exist.` });
    return;
  }

  const userRole = req.user!.role;
  if (userRole === 'Tactical Manager' && data.decision_level !== 'Tactical') {
    res.status(403).json({ error: 'Forbidden: Tactical Managers may only record Tactical decisions.' });
    return;
  }
  if (userRole === 'Strategic Manager' && data.decision_level !== 'Strategic') {
    res.status(403).json({ error: 'Forbidden: Strategic Managers may only record Strategic decisions.' });
    return;
  }

  await repo.updateDecision(decisionId, data);
  res.json({ message: 'Decision updated successfully' });
});

decisionsRouter.delete('/:id', requireRole('Administrator', 'Strategic Manager', 'Tactical Manager'), async (req: Request, res: Response) => {
  const decisionId = Number(req.params.id);
  const repo = new DecisionsRepo(req.db!);
  await repo.deleteDecision(decisionId);
  res.json({ message: 'Decision deleted successfully' });
});
