import type { Page } from '@playwright/test';
import { credentials, type Role } from './constants.js';

/**
 * Log in as a specific role. Navigates to /login, fills credentials,
 * submits, and waits for navigation away from the login page.
 */
export async function login(page: Page, role: Role): Promise<void> {
  const { email, password } = credentials[role];
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}
