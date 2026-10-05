import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { getDb, queryOne, runQuery } from './db.js';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  name: string;
}

export function createSessionToken(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return token;
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.session_token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) 
    ? authHeader.substring(7) 
    : cookieToken;

  if (!token) {
    // If no token, check if any users exist; if not, bypass or return 401
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const db = await getDb();
    const session = queryOne<{ user_id: number; expires_at: string }>(
      db,
      'SELECT user_id, expires_at FROM sessions WHERE token = ?',
      [token]
    );

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = queryOne<AuthUser>(
      db,
      'SELECT id, username, role, name FROM users WHERE id = ?',
      [session.user_id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}
