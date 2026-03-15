import { sendMail } from '../lib/email.js';

/**
 * Sends a 6-digit OTP code to the user's email.
 */
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const subject = `Your IPIS login code: ${otp}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1677ff; margin: 0 0 8px 0; font-size: 20px;">IPIS</h2>
    <p style="color: #333; margin: 0 0 24px 0;">Here is your login verification code:</p>
    <div style="background: #f0f5ff; border: 1px solid #d6e4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1677ff;">${otp}</span>
    </div>
    <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;">This code is valid for <strong>5 minutes</strong>.</p>
    <p style="color: #999; font-size: 12px; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
  </div>
</body>
</html>`;

  const text = `Your IPIS login code: ${otp}\n\nThis code is valid for 5 minutes.\nIf you didn't request this code, you can safely ignore this email.`;

  await sendMail({ to: email, subject, html, text });
}

/**
 * Sends a welcome/invitation email with a link to complete profile setup.
 */
export async function sendWelcomeEmail(
  email: string,
  invitationUrl: string,
  role: string,
): Promise<void> {
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const subject = 'Welcome to IPIS — Complete your setup';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color: #1677ff; margin: 0 0 8px 0; font-size: 20px;">IPIS</h2>
    <p style="color: #333; margin: 0 0 16px 0;">You've been invited to join IPIS as <strong>${roleLabel}</strong>.</p>
    <p style="color: #333; margin: 0 0 24px 0;">Click the button below to set up your account:</p>
    <div style="text-align: center; margin: 0 0 24px 0;">
      <a href="${invitationUrl}" style="display: inline-block; background: #1677ff; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">Complete Setup</a>
    </div>
    <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;">This link is valid for <strong>48 hours</strong>.</p>
    <p style="color: #999; font-size: 12px; margin: 0 0 4px 0;">If the button doesn't work, copy and paste this URL into your browser:</p>
    <p style="color: #999; font-size: 12px; word-break: break-all; margin: 0;">${invitationUrl}</p>
  </div>
</body>
</html>`;

  const text = `Welcome to IPIS!\n\nYou've been invited to join as ${roleLabel}.\n\nComplete your setup: ${invitationUrl}\n\nThis link is valid for 48 hours.`;

  await sendMail({ to: email, subject, html, text });
}
