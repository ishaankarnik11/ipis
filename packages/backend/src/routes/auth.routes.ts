import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddleware, getCookieName, getCookieOptions } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { asyncHandler } from '../middleware/async-handler.js';
import * as authService from '../services/auth.service.js';
import * as otpService from '../services/otp.service.js';
import * as invitationService from '../services/invitation.service.js';
import { config } from '../lib/config.js';

const router: RouterType = Router();

const requestOtpSchema = z.object({
  email: z.string().email(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

// Rate limiter for OTP requests
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10, // 10 attempts per IP (service-level per-user limit is 5)
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Try again later.' },
  },
});

// POST /api/v1/auth/request-otp
router.post(
  '/request-otp',
  otpRequestLimiter,
  validate(requestOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await otpService.requestOtp(req.body.email);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(result.error === 'RATE_LIMITED' ? 429 : 400).json({
        success: false,
        error: { code: result.error, message: result.message },
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }
  }),
);

// POST /api/v1/auth/verify-otp
router.post(
  '/verify-otp',
  otpRequestLimiter,
  validate(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await otpService.verifyOtp(req.body.email, req.body.otp, req.ip);
    if (result.success && result.token) {
      res.cookie(getCookieName(), result.token, getCookieOptions(config.nodeEnv));
      res.json({ data: result.data });
    } else {
      res.status(401).json({
        success: false,
        error: { code: result.error, message: result.message },
        attemptsRemaining: result.attemptsRemaining,
      });
    }
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

// GET /api/v1/auth/validate-invitation?token=xxx
router.get(
  '/validate-invitation',
  asyncHandler(async (req, res) => {
    const token = typeof req.query['token'] === 'string' ? req.query['token'] : '';
    const result = await invitationService.validateInvitation(token);
    res.json(result);
  }),
);

const completeProfileSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  departmentId: z.string().uuid().nullable().optional(),
});

// POST /api/v1/auth/complete-profile
router.post(
  '/complete-profile',
  validate(completeProfileSchema),
  asyncHandler(async (req, res) => {
    const result = await invitationService.completeProfile(req.body, req.ip);
    if (result.success && result.jwtToken) {
      res.cookie(getCookieName(), result.jwtToken, getCookieOptions(config.nodeEnv));
      res.json({ data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: { code: result.error, message: result.message },
      });
    }
  }),
);

export default router;
