import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getAdapter, EngineType } from '../db/adapter.js';
import { signToken } from './token.js';
import { authenticate } from './middleware.js';

export const authRouter = Router();

const loginSchema = z.object({
  engine: z.enum(['mysql', 'mongodb']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid login payload', details: parseResult.error.format() });
    return;
  }

  const { engine, username, password } = parseResult.data;

  try {
    const db = getAdapter(engine as EngineType);
    const user = await db.one<any>(
      `SELECT u.user_id, u.username, u.password_hash, u.app_role, u.emp_id, u.is_active, e.name AS employee_name
       FROM app_user u
       LEFT JOIN employee e ON u.emp_id = e.emp_id
       WHERE u.username = ?`,
      [username]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ error: 'This user account is deactivated.' });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = signToken({
      userId: user.user_id,
      username: user.username,
      role: user.app_role,
      engine: engine as EngineType,
      empId: user.emp_id,
    });

    res.cookie('serp_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400 * 1000, // 24 hours
    });

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.app_role,
        engine,
        empId: user.emp_id,
        employeeName: user.employee_name,
      },
    });
  } catch (err: unknown) {
    res.status(500).json({
      error: `Database connection error with ${engine}`,
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('serp_session', {
    httpOnly: true,
    sameSite: 'lax',
  });
  res.json({ message: 'Signed out successfully.' });
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({
    user: req.user,
  });
});
