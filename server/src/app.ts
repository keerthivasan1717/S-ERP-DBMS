import express, { Request, Response } from 'express';
import cors from 'cors';
import { getEnginesStatus } from './db/status.js';

export const app = express();

app.use(cors());
app.use(express.json());

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
    const bothReachable = status.mysql.reachable && status.postgres.reachable;
    res.status(bothReachable ? 200 : 503).json(status);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'Failed to retrieve database engine status',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
