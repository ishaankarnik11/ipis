import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';

test.describe('Upload Templates — Download (E2E-P1 through E2E-P3)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();
  });

  test('E2E-P1: Finance downloads Revenue/Billing template', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-template-billing').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('revenue');
    expect(download.suggestedFilename()).toEndWith('.xlsx');
  });

  test('E2E-P3: Finance downloads Timesheet template', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-template-timesheet').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('timesheet');
    expect(download.suggestedFilename()).toEndWith('.xlsx');
  });
});

test.describe('Upload Templates — HR downloads Employee Master (E2E-P2)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();
  });

  test('E2E-P2: HR downloads Employee Master template', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-template-salary').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('employee');
    expect(download.suggestedFilename()).toEndWith('.xlsx');
  });
});

test.describe('Upload Templates — Negative scenarios', () => {
  test('E2E-N1: Unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/uploads/templates/employee-master');
    expect(res.status()).toBe(401);
  });

  test('E2E-N2: Non-existent template type returns 404', async ({ page, request }) => {
    await login(page, 'ADMIN');

    // Extract cookies from browser context for API request
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await request.get('/api/v1/uploads/templates/nonexistent', {
      headers: { Cookie: cookieHeader },
    });
    expect(res.status()).toBe(404);
  });
});
