/**
 * ADOBE EXPRESS - Auth Middleware
 * JWT verification + rate limiting
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// Rate limiter - 100 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for upload endpoints
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Upload limit reached. Max 50 uploads per hour.' },
});

// JWT auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Authorization check - user can only access their own resources
export function requireOwnership(userIdParam: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestedUserId = req.params[userIdParam];
    const authenticatedUserId = (req as any).user?.id;

    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}
