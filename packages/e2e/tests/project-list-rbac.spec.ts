import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

// ── DEPT_HEAD Project List RBAC ─────────────────────────────────────

test.describe('Project List RBAC — DEPT_HEAD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DEPT_HEAD');
  });

  // E2E-P1: DEPT_HEAD sees projects with Engineering employees assigned (AC: 1, 2)
  test('E2E-P1: DEPT_HEAD sees projects with department employees', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // EMP001 (Engineering) is assigned to "Seeded Active TM Project"
    // DEPT_HEAD should see it
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible({ timeout: 10000 });

    // Standard columns should be visible
    const headers = page.locator('.ant-table-thead th');
    await expect(headers.getByText('Name')).toBeVisible();
    await expect(headers.getByText('Client')).toBeVisible();
    await expect(headers.getByText('Status')).toBeVisible();

    // DEPT_HEAD should see the Delivery Manager column
    await expect(headers.getByText('Delivery Manager')).toBeVisible();
  });

  // E2E-P2: DEPT_HEAD clicks project → detail page loads (AC: 5)
  test('E2E-P2: DEPT_HEAD clicks project row and sees detail page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible({ timeout: 10000 });

    await page.getByText('Seeded Active TM Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // Project name should appear on the detail page
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();
  });

  // E2E-N2: DEPT_HEAD does not see projects without department employees (AC: 1)
  test('E2E-N2: DEPT_HEAD does not see projects without department employees', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // Wait for table to settle — if there are results, wait for the first row
    // "Seeded Active TM Project" should be visible (has EMP001 from Engineering)
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible({ timeout: 10000 });

    // DM2 project should NOT be visible (no Engineering employees assigned)
    await expect(page.getByText('Seeded DM2 Project')).not.toBeVisible();
  });
});

// ── Admin Project List (unchanged) ──────────────────────────────────

test.describe('Project List RBAC — Admin (regression)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
  });

  // E2E-P3: Admin sees all projects (AC: 4)
  test('E2E-P3: Admin sees all projects', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Admin should see projects from both DMs
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();
    await expect(page.getByText('Seeded DM2 Project')).toBeVisible();
  });
});

// ── DM Project List (unchanged) ─────────────────────────────────────

test.describe('Project List RBAC — DM (regression)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
  });

  // E2E-P4: DM sees only own managed projects (AC: 4)
  test('E2E-P4: DM sees only own projects', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // DM should see own projects
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();

    // DM should NOT see DM2's project
    await expect(page.getByText('Seeded DM2 Project')).not.toBeVisible();
  });
});
