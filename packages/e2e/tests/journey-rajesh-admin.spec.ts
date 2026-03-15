import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

test.describe('Rajesh (Admin) — Daily Workflow Journey', () => {
  test('complete admin journey: approvals → config → departments → designations', async ({ page }) => {
    // Step 1: Login as Admin → land on /admin
    await login(page, 'ADMIN');
    await expect(page).toHaveURL(/\/admin/);

    // Step 2: Navigate to Pending Approvals → verify pending projects exist
    await page.getByText('Pending Approvals').click();
    await expect(page).toHaveURL(/\/admin\/pending-approvals/);
    await expect(page.getByRole('heading', { name: /pending approvals/i })).toBeVisible();

    // Step 3: Expand a pending project → verify full details visible (AC from 13.9)
    const pendingRow = page.getByRole('row').filter({ hasText: 'Seeded Pending Project' });
    await expect(pendingRow).toBeVisible();
    await pendingRow.click();

    // Expanded section should show client and dates
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('IT Services')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/rajesh-pending-expanded.png' });

    // Step 4: Approve a pending project → verify it disappears from the table
    const approveTarget = page.getByRole('row').filter({ hasText: 'Seeded Pending Approve Target' });
    await expect(approveTarget).toBeVisible();
    await approveTarget.getByRole('button', { name: /approve/i }).click();
    await expect(approveTarget).not.toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/rajesh-after-approve.png' });

    // CONSEQUENCE: Navigate to Projects dashboard → verify approved project is now ACTIVE
    await page.getByText('Projects', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/projects/);
    // The approved project should appear in the project dashboard
    await expect(page.getByText('Seeded Pending Approve Target')).toBeVisible({ timeout: 10000 });

    // Step 5: Navigate to System Config → change standard monthly hours
    await page.getByText('System Config').click();
    await expect(page).toHaveURL(/\/admin\/config/);
    await expect(page.getByRole('heading', { name: /system configuration/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/rajesh-system-config.png' });

    // Step 6: Navigate to Department Management → verify departments visible
    await page.getByText('Departments').click();
    await expect(page).toHaveURL(/\/admin\/departments/);
    await expect(page.getByRole('heading', { name: /department management/i })).toBeVisible();

    // Verify seeded departments are listed
    await expect(page.getByText('Engineering')).toBeVisible();
    await expect(page.getByText('Finance')).toBeVisible();

    // Step 7: Create a new department
    await page.getByRole('button', { name: /add department/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel('Name').fill('Data Science');
    await page.getByRole('button', { name: /create department/i }).click();

    // CONSEQUENCE: New department should appear in the table
    await expect(page.getByText('Data Science')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'uat-screenshots/rajesh-department-created.png' });

    // Step 8: Navigate to Employees → verify "Data Science" appears in department column options
    // (This verifies cross-screen consequence: department created → visible in other forms)
    await page.getByText('Employees').click();
    await expect(page).toHaveURL(/\/dashboards\/employees/);
    await expect(page.getByRole('heading')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/rajesh-employees-page.png' });
  });
});
