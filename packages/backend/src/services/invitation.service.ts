import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { signToken } from '../lib/jwt.js';
import { ValidationError } from '../lib/errors.js';
import { AUDIT_ACTIONS } from '@ipis/shared';
import { sendWelcomeEmail } from './email.service.js';
import { logAuditEvent } from './audit.service.js';

const INVITATION_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Creates an invitation for a user and sends the welcome email.
 * Invalidates any previous unused invitations for this user.
 */
export async function createInvitation(userId: string, email: string, role: string): Promise<void> {
  // Invalidate previous unused invitations
  await prisma.invitationToken.updateMany({
    where: { userId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const token = crypto.randomUUID();
  const hashedToken = hashSha256(token);

  await prisma.invitationToken.create({
    data: {
      userId,
      hashedToken,
      expiresAt: new Date(Date.now() + INVITATION_EXPIRY_MS),
    },
  });

  const invitationUrl = `${config.frontendUrl}/accept-invitation/${token}`;

  try {
    await sendWelcomeEmail(email, invitationUrl, role);
    logger.info({ email }, 'Invitation email sent');
  } catch (err) {
    logger.warn({ email, err }, 'Invitation created but email failed');
    logger.info({ invitationUrl }, 'Invitation URL (email delivery failed)');
  }
}

export interface ValidateInvitationResult {
  valid: boolean;
  error?: string;
  message?: string;
  data?: { email: string; role: string; departments: { id: string; name: string }[] };
}

/**
 * Validates an invitation token. Returns user info if valid.
 */
export async function validateInvitation(token: string): Promise<ValidateInvitationResult> {
  if (!token) {
    return { valid: false, error: 'INVITATION_INVALID', message: 'Invalid invitation link' };
  }

  const hashedToken = hashSha256(token);

  const invitation = await prisma.invitationToken.findFirst({
    where: { hashedToken },
    include: { user: { select: { email: true, role: true, status: true } } },
  });

  if (!invitation) {
    return { valid: false, error: 'INVITATION_INVALID', message: 'Invalid invitation link' };
  }

  if (invitation.usedAt) {
    return { valid: false, error: 'INVITATION_USED', message: 'This invitation has already been used. You can log in with your email.' };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: 'INVITATION_EXPIRED', message: 'This invitation has expired. Please ask your administrator to resend it.' };
  }

  // Include active departments for the profile setup form
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return {
    valid: true,
    data: { email: invitation.user.email, role: invitation.user.role, departments },
  };
}

export interface CompleteProfileInput {
  token: string;
  name: string;
  departmentId?: string | null;
}

export interface CompleteProfileResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: { id: string; name: string; email: string; role: string };
  jwtToken?: string;
}

/**
 * Completes a user's profile setup via invitation token.
 * Sets user status to ACTIVE, sets name, and logs them in.
 */
export async function completeProfile(input: CompleteProfileInput, ipAddress?: string): Promise<CompleteProfileResult> {
  if (!input.name || input.name.trim().length < 2) {
    throw new ValidationError('Name is required (minimum 2 characters)');
  }

  const hashedToken = hashSha256(input.token);

  return prisma.$transaction(async (tx) => {
    const invitation = await tx.invitationToken.findFirst({
      where: { hashedToken },
      include: { user: true },
    });

    if (!invitation) {
      return { success: false, error: 'INVITATION_INVALID', message: 'Invalid invitation link' };
    }

    if (invitation.usedAt) {
      return { success: false, error: 'INVITATION_USED', message: 'This invitation has already been used.' };
    }

    if (invitation.expiresAt < new Date()) {
      return { success: false, error: 'INVITATION_EXPIRED', message: 'This invitation has expired. Please ask your administrator to resend it.' };
    }

    // Update user profile
    const user = await tx.user.update({
      where: { id: invitation.userId },
      data: {
        name: input.name.trim(),
        departmentId: input.departmentId ?? null,
        status: 'ACTIVE',
      },
    });

    // Mark invitation as used
    await tx.invitationToken.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT for auto-login
    const jwtToken = await signToken({ sub: user.id, role: user.role, email: user.email });

    logAuditEvent({
      actorId: user.id,
      action: AUDIT_ACTIONS.USER_ONBOARD,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
      metadata: { name: user.name, role: user.role },
    }).catch((err) => logger.warn({ err }, 'Failed to log onboarding audit'));

    return {
      success: true,
      data: { id: user.id, name: user.name!, email: user.email, role: user.role },
      jwtToken,
    };
  });
}
