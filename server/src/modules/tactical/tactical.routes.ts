import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { TacticalRepo } from './tactical.repo.js';

export const tacticalRouter = Router();

tacticalRouter.use(authenticate);
tacticalRouter.use(requireRole('Tactical Manager', 'Administrator'));

// Projects
tacticalRouter.get('/projects', async (req: Request, res: Response) => {
  const repo = new TacticalRepo(req.db!);
  const projects = await repo.listProjects();
  res.json(projects);
});

tacticalRouter.get('/projects/:id', async (req: Request, res: Response) => {
  const repo = new TacticalRepo(req.db!);
  const project = await repo.getProject(Number(req.params.id));
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

tacticalRouter.post('/projects', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
    status: z.enum(['Planned', 'Active', 'On Hold', 'Completed']).default('Planned'),
    department_id: z.number(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const projId = await repo.createProject(data);
  res.status(201).json({ project_id: projId, message: 'Project created' });
});

tacticalRouter.put('/projects/:id', async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
    status: z.enum(['Planned', 'Active', 'On Hold', 'Completed']),
    department_id: z.number(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updateProject(projectId, data);
  res.json({ message: 'Project updated' });
});

tacticalRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  const projectId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deleteProject(projectId);
  res.json({ message: 'Project deleted' });
});

// Tasks
tacticalRouter.post('/projects/:projectId/tasks', async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(['Planned', 'Active', 'On Hold', 'Completed']).default('Planned'),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const taskId = await repo.createTask({ ...data, project_id: projectId });
  res.status(201).json({ task_id: taskId, message: 'Task created' });
});

tacticalRouter.put('/tasks/:id', async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    status: z.enum(['Planned', 'Active', 'On Hold', 'Completed']),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updateTask(taskId, data);
  res.json({ message: 'Task updated' });
});

tacticalRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const taskId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deleteTask(taskId);
  res.json({ message: 'Task deleted' });
});

// Phases
tacticalRouter.post('/projects/:projectId/phases', async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const phaseId = await repo.createPhase({ ...data, project_id: projectId });
  res.status(201).json({ phase_id: phaseId, message: 'Phase created' });
});

tacticalRouter.put('/phases/:id', async (req: Request, res: Response) => {
  const phaseId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updatePhase(phaseId, data);
  res.json({ message: 'Phase updated' });
});

tacticalRouter.delete('/phases/:id', async (req: Request, res: Response) => {
  const phaseId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deletePhase(phaseId);
  res.json({ message: 'Phase deleted' });
});

// Risks
tacticalRouter.post('/projects/:projectId/risks', async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    level: z.enum(['Low', 'Medium', 'High']),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const riskId = await repo.createRisk({ ...data, project_id: projectId });
  res.status(201).json({ risk_id: riskId, message: 'Risk created' });
});

tacticalRouter.put('/risks/:id', async (req: Request, res: Response) => {
  const riskId = Number(req.params.id);
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    level: z.enum(['Low', 'Medium', 'High']),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updateRisk(riskId, data);
  res.json({ message: 'Risk updated' });
});

tacticalRouter.delete('/risks/:id', async (req: Request, res: Response) => {
  const riskId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deleteRisk(riskId);
  res.json({ message: 'Risk deleted' });
});

// Members
tacticalRouter.post('/projects/:projectId/members', async (req: Request, res: Response) => {
  try {
    const projectId = Number(req.params.projectId);
    const schema = z.object({
      emp_id: z.number(),
      role: z.string().min(1),
      allocation_percentage: z.number().min(0).max(100).optional(),
    });
    const data = schema.parse(req.body);
    const repo = new TacticalRepo(req.db!);
    await repo.addMember(projectId, data);
    res.status(201).json({ message: 'Member added to project' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(400).json({ error: err.message || 'Failed to add member' });
  }
});

tacticalRouter.delete('/projects/:projectId/members/:empId', async (req: Request, res: Response) => {
  const projectId = Number(req.params.projectId);
  const empId = Number(req.params.empId);
  const repo = new TacticalRepo(req.db!);
  await repo.removeMember(projectId, empId);
  res.json({ message: 'Member removed from project' });
});

// Processes
tacticalRouter.get('/processes', async (req: Request, res: Response) => {
  const repo = new TacticalRepo(req.db!);
  const processes = await repo.listProcesses();
  res.json(processes);
});

tacticalRouter.post('/processes', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    department_id: z.number(),
    indicatorIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const processId = await repo.createProcess(data);
  res.status(201).json({ process_id: processId, message: 'Process created' });
});

tacticalRouter.put('/processes/:id', async (req: Request, res: Response) => {
  const processId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    department_id: z.number(),
    indicatorIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updateProcess(processId, data);
  res.json({ message: 'Process updated' });
});

tacticalRouter.delete('/processes/:id', async (req: Request, res: Response) => {
  const processId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deleteProcess(processId);
  res.json({ message: 'Process deleted' });
});

// Resources
tacticalRouter.get('/resources', async (req: Request, res: Response) => {
  const repo = new TacticalRepo(req.db!);
  const resources = await repo.listResources();
  res.json(resources);
});

tacticalRouter.post('/resources', async (req: Request, res: Response) => {
  const schema = z.object({
    type: z.enum(['Energy', 'Water', 'Material', 'Financial']),
    name: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  const resId = await repo.createResource(data);
  res.status(201).json({ resource_id: resId, message: 'Resource created' });
});

tacticalRouter.put('/resources/:id', async (req: Request, res: Response) => {
  const resourceId = Number(req.params.id);
  const schema = z.object({
    type: z.enum(['Energy', 'Water', 'Material', 'Financial']),
    name: z.string().min(1),
    description: z.string().optional(),
    unit: z.string().min(1),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.updateResource(resourceId, data);
  res.json({ message: 'Resource updated' });
});

tacticalRouter.delete('/resources/:id', async (req: Request, res: Response) => {
  const resourceId = Number(req.params.id);
  const repo = new TacticalRepo(req.db!);
  await repo.deleteResource(resourceId);
  res.json({ message: 'Resource deleted' });
});

// Process Resources
tacticalRouter.post('/processes/:processId/resources', async (req: Request, res: Response) => {
  const processId = Number(req.params.processId);
  const schema = z.object({
    resource_id: z.number(),
    quantity: z.number().positive(),
    unit: z.string().min(1),
  });
  const data = schema.parse(req.body);
  const repo = new TacticalRepo(req.db!);
  await repo.assignResourceToProcess(processId, data);
  res.status(201).json({ message: 'Resource linked to process' });
});

tacticalRouter.delete('/processes/:processId/resources/:resourceId', async (req: Request, res: Response) => {
  const processId = Number(req.params.processId);
  const resourceId = Number(req.params.resourceId);
  const repo = new TacticalRepo(req.db!);
  await repo.removeResourceFromProcess(processId, resourceId);
  res.json({ message: 'Resource removed from process' });
});
