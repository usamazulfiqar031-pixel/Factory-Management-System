import { Router, Request, Response } from 'express';
import { getDb, queryOne, runQuery, saveDb, hashPassword, verifyPassword } from '../db.js';
import { createSessionToken } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = await getDb();
    const user = queryOne<{
      id: number;
      username: string;
      password_hash: string;
      salt: string;
      role: string;
      name: string;
    }>(db, 'SELECT * FROM users WHERE username = ?', [username.trim()]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = createSessionToken(user.id);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    runQuery(
      db,
      'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime("now"), ?)',
      [token, user.id, expiresAt]
    );
    saveDb();

    res.cookie('session_token', token, {
      httpOnly: true,
      secure: false, // development / iframe
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.session_token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : cookieToken;

  if (token) {
    try {
      const db = await getDb();
      runQuery(db, 'DELETE FROM sessions WHERE token = ?', [token]);
      saveDb();
    } catch (e) {}
  }

  res.clearCookie('session_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.session_token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const db = await getDb();
    const session = queryOne<{ user_id: number; expires_at: string }>(
      db,
      'SELECT user_id, expires_at FROM sessions WHERE token = ?',
      [token]
    );

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = queryOne<{ id: number; username: string; role: string; name: string }>(
      db,
      'SELECT id, username, role, name FROM users WHERE id = ?',
      [session.user_id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching user' });
  }
});

authRouter.post('/change-password', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.session_token;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : cookieToken;

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const db = await getDb();
    const session = queryOne<{ user_id: number }>(db, 'SELECT user_id FROM sessions WHERE token = ?', [token]);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const user = queryOne<{ id: number; password_hash: string; salt: string }>(
      db,
      'SELECT id, password_hash, salt FROM users WHERE id = ?',
      [session.user_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!verifyPassword(currentPassword, user.password_hash, user.salt)) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const { hash, salt } = hashPassword(newPassword);
    runQuery(db, 'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, user.id]);
    saveDb();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});
