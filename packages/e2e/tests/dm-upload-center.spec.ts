/**
 * Story 10.3 — DM Gets Upload Center Access E2E Tests
 *
 * Verifies that Delivery Managers can access the Upload Center with only the
 * Timesheet upload zone, and cannot upload billing or salary data.
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: DM sidebar shows Upload Center ──
test.describe('E2E-P1 — DM sidebar includes Upload Center', () => {
  test('DM sees Projects, Project Dashboard, Department Dashboard, and Upload Center in sidebar', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');

    const sidebar = page.locator('nav, [class*="sider"], aside').first();
    await expect(sidebar.getByText('Projects')).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText('Project Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Dept Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Upload Center')).toBeVisible();
  });
});

// ── E2E-P2: DM sees only Timesheet zone, no Billing or Salary ──
test.describe('E2E-P2 — DM Upload Center shows only Timesheet zone', () => {
  test('DM navigates to Upload Center and sees only Timesheet upload zone', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/uploads');

    // Timesheet zone should be visible
    await expect(page.getByTestId('upload-zone-timesheet')).toBeVisible({ timeout: 10000 });

    // Billing and Salary zones should NOT be in the DOM
    await expect(page.getByTestId('upload-zone-billing')).not.toBeVisible();
    await expect(page.getByTestId('upload-zone-salary')).not.toBeVisible();
  });
});

// ── E2E-N1: DM cannot upload billing data ──
test.describe('E2E-N1 — DM gets 403 on billing upload', () => {
  test('DM POST to billing upload endpoint returns 403', async ({ page, request }) => {
    await login(page, 'DELIVERY_MANAGER');

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.post('/api/v1/uploads/billing', {
      headers: { Cookie: cookieHeader },
      multipart: {
        file: {
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: Buffer.from('dummy'),
        },
      },
    });

    expect(response.status()).toBe(403);
  });
});

// ── E2E-N2: DM cannot upload salary data ──
test.describe('E2E-N2 — DM gets 403 on salary upload', () => {
  test('DM POST to salary upload endpoint returns 403', async ({ page, request }) => {
    await login(page, 'DELIVERY_MANAGER');

    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.post('/api/v1/uploads/salary', {
      headers: { Cookie: cookieHeader },
      multipart: {
        file: {
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: Buffer.from('dummy'),
        },
      },
    });

    expect(response.status()).toBe(403);
  });
});

// ── E2E-N3: DM Upload Center — Billing and Salary not in DOM ──
test.describe('E2E-N3 — Billing and Salary sections not rendered for DM', () => {
  test('Billing and Salary upload zones are not present in DOM for DM', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/uploads');

    await expect(page.getByTestId('upload-zone-timesheet')).toBeVisible({ timeout: 10000 });

    // These zones should not exist in the DOM at all (not just hidden)
    expect(await page.getByTestId('upload-zone-billing').count()).toBe(0);
    expect(await page.getByTestId('upload-zone-salary').count()).toBe(0);
  });
});
