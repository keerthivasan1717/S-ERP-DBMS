import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole } from '../../auth/middleware.js';
import { AdminRepo } from './admin.repo.js';

export const adminRouter = Router();

adminRouter.use(authenticate);

// Organization
adminRouter.get('/organization', async (req: Request, res: Response) => {
  const repo = new AdminRepo(req.db!);
  const org = await repo.getOrganization();
  res.json(org);
});

adminRouter.put('/organization', requireRole('Administrator'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    address: z.string().optional(),
    dimensionIds: z.array(z.number()).optional(),
  });
  const data = schema.parse(req.body);
  const repo = new AdminRepo(req.db!);
  const org = await repo.getOrganization();
  if (!org) {
    res.status(404).json({ error: 'Organization not found' });
    return;
  }
  const updated = await repo.updateOrganization(org.org_id, data);
  res.json(updated);
});

// Departments
adminRouter.get('/departments', async (req: Request, res: Response) => {
  const repo = new AdminRepo(req.db!);
  const depts = await repo.listDepartments();
  res.json(depts);
});

adminRouter.post('/departments', requireRole('Administrator'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parent_dept_id: z.number().nullable().optional(),
    org_id: z.number().default(1),
  });
  const data = schema.parse(req.body);
  const repo = new AdminRepo(req.db!);
  const deptId = await repo.createDepartment(data);
  res.status(201).json({ dept_id: deptId, message: 'Department created' });
});

adminRouter.put('/departments/:id', requireRole('Administrator'), async (req: Request, res: Response) => {
  const deptId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    parent_dept_id: z.number().nullable().optional(),
  });
  const data = schema.parse(req.body);
  const repo = new AdminRepo(req.db!);
  await repo.updateDepartment(deptId, data);
  res.json({ message: 'Department updated' });
});

adminRouter.delete('/departments/:id', requireRole('Administrator'), async (req: Request, res: Response) => {
  const deptId = Number(req.params.id);
  const repo = new AdminRepo(req.db!);
  try {
    await repo.deleteDepartment(deptId);
    res.json({ message: 'Department deleted' });
  } catch (err: any) {
    if (err.message?.includes('CONFLICT:')) {
      res.status(409).json({ error: err.message.replace('CONFLICT: ', '') });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Employees
adminRouter.get('/employees', async (req: Request, res: Response) => {
  const repo = new AdminRepo(req.db!);
  const emps = await repo.listEmployees();
  res.json(emps);
});

adminRouter.post('/employees', requireRole('Administrator'), async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    department_id: z.number(),
  });
  const data = schema.parse(req.body);
  const repo = new AdminRepo(req.db!);
  const empId = await repo.createEmployee(data);
  res.status(201).json({ emp_id: empId, message: 'Employee created' });
});

adminRouter.put('/employees/:id', requireRole('Administrator'), async (req: Request, res: Response) => {
  const empId = Number(req.params.id);
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    department_id: z.number(),
  });
  const data = schema.parse(req.body);
  const repo = new AdminRepo(req.db!);
  await repo.updateEmployee(empId, data);
  res.json({ message: 'Employee updated' });
});

adminRouter.delete('/employees/:id', requireRole('Administrator'), async (req: Request, res: Response) => {
  const empId = Number(req.params.id);
  const repo = new AdminRepo(req.db!);
  try {
    await repo.deleteEmployee(empId);
    res.json({ message: 'Employee deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Users (Administrator only)
adminRouter.use('/users', requireRole('Administrator'));

adminRouter.get('/users', async (req: Request, res: Response) => {
  const repo = new AdminRepo(req.db!);
  const users = await repo.listUsers();
  res.json(users);
});

adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      username: z.string().min(3),
      password: z.string().min(4, 'Password must be at least 4 characters'),
      app_role: z.enum(['Administrator', 'Strategic Manager', 'Tactical Manager', 'Operational User']),
      emp_id: z.number().nullable().optional(),
      is_active: z.boolean().default(true),
    });
    const data = schema.parse(req.body);
    const password_hash = bcrypt.hashSync(data.password, 12);
    const repo = new AdminRepo(req.db!);
    const userId = await repo.createUser({
      username: data.username,
      password_hash,
      app_role: data.app_role,
      emp_id: data.emp_id,
      is_active: data.is_active,
    });
    res.status(201).json({ user_id: userId, message: 'User created' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

adminRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const schema = z.object({
      password: z
        .string()
        .min(4, 'Password must be at least 4 characters')
        .optional()
        .or(z.literal(''))
        .transform((v) => (v === '' ? undefined : v)),
      app_role: z.enum(['Administrator', 'Strategic Manager', 'Tactical Manager', 'Operational User']).optional(),
      emp_id: z.number().nullable().optional(),
      is_active: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const repo = new AdminRepo(req.db!);
    const updatePayload: any = {
      app_role: data.app_role,
      emp_id: data.emp_id,
      is_active: data.is_active,
    };
    if (data.password) {
      updatePayload.password_hash = bcrypt.hashSync(data.password, 12);
    }
    await repo.updateUser(userId, updatePayload);
    res.json({ message: 'User updated' });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message || 'Validation error' });
    }
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  const userId = Number(req.params.id);
  const repo = new AdminRepo(req.db!);
  await repo.deleteUser(userId);
  res.json({ message: 'User deleted' });
});
