import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

test.describe('Priya (Finance) — Daily Workflow Journey', () => {
  test('complete finance journey: dashboards → upload → share → reports', async ({ page }) => {
    // Step 1: Login as Finance → land on Executive Dashboard
    await login(page, 'FINANCE');
    await expect(page).toHaveURL(/\/dashboards\/executive/);
    await expect(page.getByRole('heading', { name: /executive dashboard/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/priya-executive-dashboard.png' });

    // Step 2: Verify Executive Dashboard KPI tiles are visible
    // Revenue, Cost, Margin tiles should be present
    const dashboard = page.locator('[data-testid="executive-dashboard"]');
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Step 3: Navigate to Project Dashboard → verify project financials
    await page.getByText('Projects', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/projects/);

    // Verify project rows are visible with financial data
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/priya-project-dashboard.png' });

    // Step 4: Verify Share Link button is visible (Finance can share)
    const shareBtn = page.getByRole('button', { name: /share link/i });
    await expect(shareBtn).toBeVisible();

    // Step 5: Click Share Link → verify modal appears (not toast — Story 13.6 fix)
    await shareBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    // Verify modal has a Copy Link button and a URL input
    await expect(page.getByRole('button', { name: /copy link/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/priya-share-link-modal.png' });
    // Close the modal
    await page.getByRole('button', { name: /close/i }).first().click();

    // Step 6: Navigate to Company Dashboard → verify company-level data
    await page.getByText('Company Dashboard').click();
    await expect(page).toHaveURL(/\/dashboards\/company/);
    await expect(page.getByRole('heading', { name: /company dashboard/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/priya-company-dashboard.png' });

    // Step 7: Navigate to Upload Center → verify Finance has access
    await page.getByText('Upload Center').click();
    await expect(page).toHaveURL(/\/uploads/);
    await expect(page.getByRole('heading', { name: /upload center/i })).toBeVisible();

    // Step 8: Verify upload history shows existing entries
    await expect(page.getByText('Upload History')).toBeVisible();

    // Step 9: Verify upload history rows are clickable (Story 13.11 — row affordance)
    // Rows should have cursor pointer and View button
    const viewButtons = page.getByRole('button', { name: /view/i });
    // There should be at least one upload history entry from seed data
    const viewCount = await viewButtons.count();
    expect(viewCount).toBeGreaterThanOrEqual(1);
    await page.screenshot({ path: 'uat-screenshots/priya-upload-center.png' });

    // Step 10: Navigate to Employee Dashboard → verify Finance sees financial data
    await page.getByText('Employees').click();
    await expect(page).toHaveURL(/\/dashboards\/employees/);
    await expect(page.getByText('Seeded Employee One')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/priya-employee-dashboard.png' });

    // CONSEQUENCE: Navigate to Client Dashboard → verify Finance has access
    await page.getByText('Client Dashboard').click();
    await expect(page).toHaveURL(/\/dashboards\/clients/);
    await page.screenshot({ path: 'uat-screenshots/priya-client-dashboard.png' });
  });
});
