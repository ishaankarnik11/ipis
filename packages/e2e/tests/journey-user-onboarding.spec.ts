import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getDb, closeDb } from '../helpers/index.js';

function hashSha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test.afterAll(async () => {
  await closeDb();
});

test.describe('User Onboarding Journey', () => {
  test('new user accepts invitation → completes profile → lands on dashboard', async ({ page }) => {
    const db = getDb();
    const email = `onboard-${Date.now()}@e2e.test`;

    // Create INVITED user + invitation token directly in DB
    const user = await db.user.create({
      data: { email, role: 'HR', status: 'INVITED' },
    });

    const plainToken = crypto.randomUUID();
    await db.invitationToken.create({
      data: {
        userId: user.id,
        hashedToken: hashSha256(plainToken),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    // Step 1: Visit invitation link
    await page.goto(`/accept-invitation/${plainToken}`);

    // Step 2: Profile setup page shows email and role
    await expect(page.getByText('Welcome to IPIS')).toBeVisible();
    await expect(page.getByText('HR Manager')).toBeVisible();
    await expect(page.locator(`input[value="${email}"]`)).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/onboarding-welcome.png' });

    // Step 3: Fill in name and submit
    await page.getByTestId('name-input').fill('Neha Verma');
    await page.getByTestId('complete-setup-btn').click();

    // Step 4: Success → redirect to HR landing page
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/dashboards\/employees/, { timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/onboarding-complete.png' });

    // Step 5: Verify user is ACTIVE in DB
    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated!.status).toBe('ACTIVE');
    expect(updated!.name).toBe('Neha Verma');
  });

  test('expired invitation shows error', async ({ page }) => {
    const db = getDb();
    const email = `expired-${Date.now()}@e2e.test`;

    const user = await db.user.create({
      data: { email, role: 'FINANCE', status: 'INVITED' },
    });

    const plainToken = crypto.randomUUID();
    await db.invitationToken.create({
      data: {
        userId: user.id,
        hashedToken: hashSha256(plainToken),
        expiresAt: new Date(Date.now() - 1000), // Already expired
      },
    });

    await page.goto(`/accept-invitation/${plainToken}`);

    await expect(page.getByText('Invitation Expired')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/onboarding-expired.png' });
  });

  test('invalid invitation token shows error', async ({ page }) => {
    await page.goto('/accept-invitation/not-a-real-token');

    await expect(page.getByText('Invalid Invitation')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/onboarding-invalid.png' });
  });
});
