import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, AppError } from './errors';

// Extend Express Request to include requestId and user context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: string;
        email?: string | null;
        role: string;
        fullName?: string | null;
        agencyId?: string | null;
      };
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.length > 0 ? incomingId : uuidv4();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError('Request validation failed. Please check the submitted fields.', details));
      } else {
        next(error);
      }
    }
  };
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired buckets every 5 minutes.
  // Skip the interval in test runs so Jest can exit cleanly without leaving open handles behind.
  if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of store.entries()) {
        if (now > record.resetAt) {
          store.delete(key);
        }
      }
    }, 300000);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = store.get(clientIp);

    if (!record || now > record.resetAt) {
      store.set(clientIp, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      next(new AppError(429, 'RATE_LIMIT_EXCEEDED', options.message || 'Too many requests. Please slow down and try again later.'));
      return;
    }

    record.count++;
    next();
  };
}
