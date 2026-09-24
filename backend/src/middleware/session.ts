import { Request, Response, NextFunction } from 'express';
import { SESSION_COOKIE_NAME } from '../config/constants.js';
import { verifySessionToken } from '../services/auth.service.js';
import { UserSession } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

export function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      req.user = session;
    }
  }
  next();
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Session missing or expired'
    });
  }
  next();
}
