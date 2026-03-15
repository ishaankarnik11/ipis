import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getDb, closeDb } from '../helpers/index.js';
import { signToken } from '../../backend/src/lib/jwt.js';

const MASTER_OTP = '000000';

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test.afterAll(async () => {
  await closeDb();
});

test.describe('Admin User Management Journey', () => {
  let adminUser: { id: string; email: string };

  test.beforeAll(async () => {
    const db = getDb();

    // Create an active admin to manage users
    adminUser = await db.user.create({
      data: {
        email: `admin-mgmt-${Date.now()}@e2e.test`,
        name: 'Admin Manager',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  });

  test('admin login via OTP → navigate to user management', async ({ page }) => {
    // Login with MASTER_OTP
    await page.goto('/login');
    await page.getByTestId('email-input').fill(adminUser.email);
    await page.getByTestId('send-otp-btn').click();

    await expect(page.getByText('Enter verification code')).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await page.getByTestId(`otp-digit-${i}`).fill(MASTER_OTP[i]);
    }

    // Should land on admin page
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Navigate to User Management
    await page.getByText('User Management').click();
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/admin-user-management.png' });
  });

  test('admin invites new user → user appears in list', async ({ page, context }) => {
    // Set auth cookie directly for speed
    const token = await signToken({ sub: adminUser.id, role: 'ADMIN', email: adminUser.email });
    await context.addCookies([{
      name: 'ipis_token',
      value: token,
      domain: 'localhost',
      path: '/',
    }]);

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();

    // Click Invite User
    await page.getByRole('button', { name: /invite user/i }).click();

    // Fill in email + role
    const newEmail = `invited-${Date.now()}@e2e.test`;
    await page.getByLabel('Email').fill(newEmail);
    await page.getByLabel('Role').click();
    await page.getByTitle('Finance').click();

    await page.getByRole('button', { name: /send invitation/i }).click();

    // User should appear in the table
    await expect(page.getByText(newEmail)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Invited')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/admin-user-invited.png' });
  });
});
