import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getEnginesStatus } from './db/status.js';
import { authRouter } from './auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { tacticalRouter } from './modules/tactical/tactical.routes.js';
import { decisionsRouter } from './modules/decisions/decisions.routes.js';
import { sustainabilityRouter } from './modules/sustainability/sustainability.routes.js';
import { operationalRouter } from './modules/operational/operational.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/tactical', tacticalRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/sustainability', sustainabilityRouter);
app.use('/api/operational', operationalRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 's-erp-backend',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/engines/status', async (_req: Request, res: Response) => {
  try {
    const status = await getEnginesStatus();
    const reachable = status.mysql.reachable && status.postgres.reachable;
    res.status(reachable ? 200 : 503).json(status);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'Failed to retrieve database engine status',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

import path from 'node:path';
import fs from 'node:fs';

const webDist = path.resolve(process.cwd(), 'dist/web');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err?.name === 'ZodError' || err?.issues) {
    return res.status(400).json({ error: err.issues?.[0]?.message || 'Validation error' });
  }
  console.error('[Unhandled Express Error]:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

