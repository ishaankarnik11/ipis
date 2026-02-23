import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to catch rejected promises
 * and forward them to the Express error middleware.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
