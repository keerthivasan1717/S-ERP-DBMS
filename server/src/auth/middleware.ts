import { Request, Response, NextFunction } from 'express';
import { verifyToken, SessionPayload } from './token.js';
import { DbAdapter, getAdapter } from '../db/adapter.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: SessionPayload;
      db?: DbAdapter;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check httpOnly cookie
  if (req.cookies && req.cookies.serp_session) {
    token = req.cookies.serp_session;
  }

  // 2. Fallback to Authorization: Bearer <token>
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No session found.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  req.user = payload;
  req.db = getAdapter(payload.engine);
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: role '${req.user.role}' lacks permission for this resource. Required: ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
