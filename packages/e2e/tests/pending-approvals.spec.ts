import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

test.describe('Pending Approvals — Admin role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
  });

  // E2E-P1: Admin navigates to /admin/pending-approvals — table shows pending projects
  test('admin sees pending projects table with correct columns (AC: 1)', async ({ page }) => {
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('heading', { name: /pending approvals/i })).toBeVisible();

    // Verify table headers
    await expect(page.getByRole('columnheader', { name: 'Project Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Delivery Manager' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Engagement Model' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Contract Value' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Submission Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

    // Seeded pending projects should be visible (use exact to avoid ambiguity)
    await expect(page.getByRole('cell', { name: 'Seeded Pending Project', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Pending Approve Target' })).toBeVisible();

    // Verify action buttons exist
    await expect(page.getByRole('button', { name: /approve/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /reject/i }).first()).toBeVisible();
  });

  // E2E-P2: Admin approves a pending project
  test('admin approves a project — row removed, success notification (AC: 2)', async ({ page }) => {
    await page.goto('/admin/pending-approvals');

    // Wait for table to load
    const targetCell = page.getByRole('cell', { name: 'Seeded Pending Approve Target' });
    await expect(targetCell).toBeVisible();

    // Click Approve on the target project
    const row = page.getByRole('row').filter({ hasText: 'Seeded Pending Approve Target' });
    await row.getByRole('button', { name: /approve/i }).click();

    // Project should be removed from the table
    await expect(targetCell).not.toBeVisible({ timeout: 10000 });

    // Success notification should appear
    await expect(page.locator('.ant-notification-notice')).toContainText('approved', { timeout: 10000 });
  });

  // E2E-P3: Admin rejects a project with a comment
  test('admin rejects a project with comment — row removed, success notification (AC: 3)', async ({ page }) => {
    await page.goto('/admin/pending-approvals');

    // Wait for table to load
    const targetCell = page.getByRole('cell', { name: 'Seeded Pending Reject Target' });
    await expect(targetCell).toBeVisible();

    // Click Reject on the target project
    const row = page.getByRole('row').filter({ hasText: 'Seeded Pending Reject Target' });
    await row.getByRole('button', { name: /reject/i }).click();

    // Modal should open with rejection comment textarea
    await expect(page.getByText(/reject project/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter reason for rejection/i)).toBeVisible();

    // Enter rejection comment
    await page.getByPlaceholder(/enter reason for rejection/i).fill('Scope needs revision before approval');

    // Click Confirm Rejection
    await page.getByRole('button', { name: /confirm rejection/i }).click();

    // Row should disappear
    await expect(targetCell).not.toBeVisible({ timeout: 10000 });

    // Success notification
    await expect(page.locator('.ant-notification-notice')).toContainText('rejected', { timeout: 10000 });
  });

  // E2E-P4: Sidebar shows Pending Approvals with badge count
  test('sidebar shows Pending Approvals item with badge (AC: 5)', async ({ page }) => {
    await page.goto('/admin/pending-approvals');

    // Wait for data to load (table should have at least one project)
    await expect(page.getByRole('cell', { name: 'Seeded Pending Project', exact: true })).toBeVisible();

    // The sidebar should have a "Pending Approvals" menu item
    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    await expect(sidebar.getByText('Pending Approvals')).toBeVisible();

    // Badge should show count > 0 — antd Badge renders a sup.ant-badge-count
    await expect(sidebar.locator('.ant-scroll-number')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Pending Approvals — Negative Scenarios', () => {
  // E2E-N1: Empty rejection comment shows validation error
  test('empty rejection comment shows validation error (AC: 4)', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');

    // Wait for table to have at least one pending project
    // (the original "Seeded Pending Project" survives from seed even after P2/P3 tests)
    await expect(page.getByRole('button', { name: /reject/i }).first()).toBeVisible({ timeout: 10000 });

    // Click Reject
    await page.getByRole('button', { name: /reject/i }).first().click();

    // Modal opens
    await expect(page.getByText(/reject project/i)).toBeVisible();

    // Click Confirm Rejection with empty comment
    await page.getByRole('button', { name: /confirm rejection/i }).click();

    // Validation error should appear
    await expect(page.getByText('Rejection reason is required')).toBeVisible();

    // Modal should still be open
    await expect(page.getByText(/reject project/i)).toBeVisible();
  });

  // E2E-N2: DM user cannot access pending approvals
  test('DM user is redirected from /admin/pending-approvals', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/admin/pending-approvals');

    // Should be redirected away (DM landing page is /projects)
    await expect(page).not.toHaveURL(/\/admin\/pending-approvals/);
    await expect(page).toHaveURL(/\/projects/);
  });

  // E2E-N3: HR user cannot access pending approvals
  test('HR user is redirected from /admin/pending-approvals', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/admin/pending-approvals');

    // Should be redirected away (HR landing page is /employees)
    await expect(page).not.toHaveURL(/\/admin\/pending-approvals/);
    await expect(page).toHaveURL(/\/employees/);
  });
});
