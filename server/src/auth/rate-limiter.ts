import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many login attempts. Please try again later.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment or if client is localhost test, extract ip or body username
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const username = req.body?.username ? String(req.body.username).toLowerCase() : '';
    const key = `${ip}:${username}`;

    const now = Date.now();
    const record = attempts.get(key);

    if (record) {
      if (now > record.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        record.count += 1;
        if (record.count > max) {
          const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
          res.setHeader('Retry-After', retryAfterSeconds);
          res.status(429).json({
            error: message,
            retryAfter: retryAfterSeconds,
          });
          return;
        }
      }
    } else {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
    }

    next();
  };
}

export function resetRateLimits(): void {
  attempts.clear();
}
