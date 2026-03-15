import type { Page } from '@playwright/test';
import { credentials, type Role } from './constants.js';

const MASTER_OTP = '000000';

/**
 * Log in as a specific role via OTP flow.
 * Requires MASTER_OTP=000000 in the backend env.
 */
export async function login(page: Page, role: Role): Promise<void> {
  const { email } = credentials[role];
  await page.goto('/login');

  // Step 1: Enter email
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('send-otp-btn').click();

  // Step 2: Enter MASTER_OTP
  await page.getByText('Enter verification code').waitFor({ timeout: 10000 });
  for (let i = 0; i < 6; i++) {
    await page.getByTestId(`otp-digit-${i}`).fill(MASTER_OTP[i]);
  }

  // Step 3: Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}
