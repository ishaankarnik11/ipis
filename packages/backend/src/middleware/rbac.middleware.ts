import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@ipis/shared';
import { ForbiddenError } from '../lib/errors.js';

export function rbacMiddleware(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Access denied');
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
}
