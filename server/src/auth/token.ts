import crypto from 'node:crypto';
import { EngineType } from '../db/adapter.js';

export interface SessionPayload {
  userId: number;
  username: string;
  role: string;
  engine: EngineType;
  empId: number | null;
  exp: number;
}

const SECRET = process.env.SESSION_SECRET || 'serp_session_secret_at_least_32_chars_long_dev_2026';

export function signToken(payload: Omit<SessionPayload, 'exp'>, expiresInSeconds: number = 86400): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
