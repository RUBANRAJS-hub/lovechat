import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (limit: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipRequestCounts.get(ip);
    if (!record || record.resetTime < now) {
      ipRequestCounts.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    record.count += 1;

    if (record.count > limit) {
      res.status(429).json({
        message: 'Too many requests from this IP. Please try again later.',
      });
      return;
    }

    next();
  };
};

// Custom simple XSS protection middleware that sanitizes body values of type string
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (val: any): any => {
    if (typeof val === 'string') {
      // Basic strip HTML tags
      return val.replace(/<[^>]*>/g, '');
    }
    if (val && typeof val === 'object') {
      const keys = Object.keys(val).filter(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype');
      for (const key of keys) {
        const value = Reflect.get(val, key);
        Reflect.set(val, key, sanitize(value));
      }
    }
    return val;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  next();
};

// Security headers (like helmet)
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};
