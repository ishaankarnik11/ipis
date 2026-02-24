import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@ipis/shared';
import { validate } from '../middleware/validate.middleware.js';
import { authMiddleware, getCookieName, getCookieOptions } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as authService from '../services/auth.service.js';
import { signToken } from '../lib/jwt.js';
import { config } from '../lib/config.js';

const router: RouterType = Router();

// Rate limiter for login endpoint only
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again later.',
    },
  },
});

// Rate limiter for forgot-password endpoint
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 attempts per IP
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many password reset requests. Try again later.',
    },
  },
});

// POST /api/v1/auth/login
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await authService.login(email, password);

    const token = await signToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    res.cookie(getCookieName(), token, getCookieOptions(config.nodeEnv));
    res.json({ data: { id: user.id, name: user.name, role: user.role, email: user.email } });
  }),
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json({ data: user });
  }),
);

// POST /api/v1/auth/logout
router.post('/logout', (_req, res) => {
  res.cookie(getCookieName(), '', { ...getCookieOptions(config.nodeEnv), maxAge: 0 });
  res.json({ success: true });
});

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    // Always return success regardless of whether email exists
    res.json({ success: true });
  }),
);

// GET /api/v1/auth/validate-reset-token
router.get(
  '/validate-reset-token',
  asyncHandler(async (req, res) => {
    const token = req.query['token'] as string;
    if (!token) {
      res.json({ data: { valid: false } });
      return;
    }
    const valid = await authService.validateResetToken(token);
    res.json({ data: { valid } });
  }),
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.json({ success: true });
  }),
);

// POST /api/v1/auth/change-password (protected)
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body.newPassword);
    res.json({ success: true });
  }),
);

export default router;
