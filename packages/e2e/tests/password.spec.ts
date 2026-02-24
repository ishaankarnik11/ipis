import { test, expect } from '@playwright/test';
import { createHash } from 'crypto';
import { getDb, closeDb, TEMP_PASSWORD } from '../helpers/index.js';

test.describe('First-login forced password change', () => {
  test('user with mustChangePassword is forced to change password', async ({ page }) => {
    // Log in as the new user who must change password
    await page.goto('/login');
    await page.getByLabel('Email').fill('newuser@e2e.test');
    await page.getByLabel('Password').fill(TEMP_PASSWORD);
    await page.getByRole('button', { name: 'Log In' }).click();

    // Should be redirected to /change-password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.getByRole('heading', { name: 'Set Your Password' })).toBeVisible();

    // Enter new password
    const newPassword = 'NewSecure1234!';
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm Password').fill(newPassword);
    await page.getByRole('button', { name: 'Set Password' }).click();

    // Should be redirected to the role landing page (HR → /employees)
    await expect(page).toHaveURL(/\/employees/);
  });
});

test.describe('Forgot password → reset flow', () => {
  const RAW_TOKEN = 'e2e-test-reset-token-abc123';
  let userId: string;

  test.beforeAll(async () => {
    const db = getDb();

    // Use a dedicated reset user so we don't break other tests' credentials
    const user = await db.user.findUnique({ where: { email: 'resetuser@e2e.test' } });
    if (!user) throw new Error('Reset user not found in test DB');
    userId = user.id;

    // Insert a known password reset token into the DB
    const tokenHash = createHash('sha256').update(RAW_TOKEN).digest('hex');
    await db.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      },
    });
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('forgot-password form submits successfully', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();

    await page.getByLabel('Email').fill('resetuser@e2e.test');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    // Success message (always shows regardless of email existence for security)
    await expect(page.getByRole('alert')).toContainText('reset link has been sent');
  });

  test('reset password with valid token', async ({ page }) => {
    // Navigate directly to the reset page with the known token
    await page.goto(`/reset-password?token=${RAW_TOKEN}`);

    // Should show the reset form (token is valid)
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
    await expect(page.getByLabel('New Password', { exact: true })).toBeVisible();

    // Fill and submit
    const newPassword = 'ResetSecure1234!';
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm Password').fill(newPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();

    // Should redirect to login with success message
    await expect(page).toHaveURL(/\/login\?reset=success/);
    await expect(page.getByRole('alert')).toContainText('Password updated');
  });
});
