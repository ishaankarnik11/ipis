import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { rbacMiddleware } from './rbac.middleware.js';
import { ForbiddenError } from '../lib/errors.js';

function createMockReq(user?: { id: string; role: string; email: string }): Partial<Request> {
  return { user } as Partial<Request>;
}

describe('rbacMiddleware', () => {
  it('should call next when user role is allowed', () => {
    const middleware = rbacMiddleware(['ADMIN', 'FINANCE']);
    const req = createMockReq({ id: '1', role: 'ADMIN', email: 'a@b.com' }) as Request;
    const next = vi.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user role is not allowed', () => {
    const middleware = rbacMiddleware(['ADMIN']);
    const req = createMockReq({ id: '1', role: 'FINANCE', email: 'a@b.com' }) as Request;

    expect(() => middleware(req, {} as Response, vi.fn())).toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when no user is attached', () => {
    const middleware = rbacMiddleware(['ADMIN']);
    const req = createMockReq(undefined) as Request;

    expect(() => middleware(req, {} as Response, vi.fn())).toThrow(ForbiddenError);
  });

  it('should reject all non-admin roles for admin-only middleware', () => {
    const middleware = rbacMiddleware(['ADMIN']);
    const nonAdminRoles = ['FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];

    for (const role of nonAdminRoles) {
      const req = createMockReq({ id: '1', role, email: 'a@b.com' }) as Request;
      expect(() => middleware(req, {} as Response, vi.fn())).toThrow(ForbiddenError);
    }
  });
});
