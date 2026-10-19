import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@accident-alarm/api-contracts';
import { authService } from './auth.service';
import { UnauthorizedError, ForbiddenError } from '../common/errors';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication token is required.'));
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = authService.verifyToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      agencyId: payload.agencyId
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required.'));
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError(`Access restricted to roles: [${roles.join(', ')}]. Your role is ${req.user.role}.`));
      return;
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const payload = authService.verifyToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        agencyId: payload.agencyId
      };
    } catch {
      // Ignore invalid token for optional auth, treat as guest
    }
  }
  next();
}
