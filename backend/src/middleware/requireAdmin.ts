import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const providedPassword = req.headers['x-admin-password'];
  if (providedPassword === env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin password.' });
  }
}
