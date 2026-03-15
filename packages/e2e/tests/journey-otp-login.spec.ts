import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getDb, closeDb } from '../helpers/index.js';

const MASTER_OTP = '000000';

test.afterAll(async () => {
  await closeDb();
});

test.describe('OTP Login Journey', () => {
  let testEmail: string;

  test.beforeAll(async () => {
    const db = getDb();
    testEmail = `otp-login-${Date.now()}@e2e.test`;

    // Create an ACTIVE user directly (simulates completed onboarding)
    await db.user.create({
      data: {
        email: testEmail,
        name: 'OTP Test User',
        role: 'FINANCE',
        status: 'ACTIVE',
      },
    });
  });

  test('complete OTP login: email → OTP → redirect to landing page', async ({ page }) => {
    await page.goto('/login');

    // Step 1: Email entry screen
    await expect(page.getByText('Sign in to IPIS')).toBeVisible();
    const emailInput = page.getByTestId('email-input');
    await emailInput.fill(testEmail);

    // Step 2: Send OTP
    const sendBtn = page.getByTestId('send-otp-btn');
    await expect(sendBtn).not.toBeDisabled();
    await sendBtn.click();

    // Step 3: OTP screen appears
    await expect(page.getByText('Enter verification code')).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();

    // Step 4: Enter MASTER_OTP (000000) — one digit at a time
    for (let i = 0; i < 6; i++) {
      await page.getByTestId(`otp-digit-${i}`).fill(MASTER_OTP[i]);
    }

    // Step 5: Should redirect to Finance landing page
    await expect(page).toHaveURL(/\/dashboards\/executive/, { timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/otp-login-success.png' });
  });

  test('wrong OTP shows error with attempts remaining', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByTestId('email-input');
    await emailInput.fill(testEmail);
    await page.getByTestId('send-otp-btn').click();

    await expect(page.getByText('Enter verification code')).toBeVisible();

    // Enter wrong OTP
    for (let i = 0; i < 6; i++) {
      await page.getByTestId(`otp-digit-${i}`).fill('9');
    }

    // Should show error
    await expect(page.getByText(/incorrect code/i)).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'uat-screenshots/otp-login-wrong-code.png' });
  });

  test('"Use a different email" navigates back', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill(testEmail);
    await page.getByTestId('send-otp-btn').click();
    await expect(page.getByText('Enter verification code')).toBeVisible();

    // Click back
    await page.getByTestId('back-btn').click();

    // Should be back on email screen with email preserved
    await expect(page.getByText('Sign in to IPIS')).toBeVisible();
  });
});
