/**
 * Story 6.1 — Project Dashboard & KPI Tiles E2E Tests
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: DM sees own projects only with currency formatting ──
test.describe('E2E-P1 — DM dashboard scoping', () => {
  test('DM sees only own projects on dashboard', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('dashboard-table')).toBeVisible();

    // DM should see own projects (TM and FC are both under dmUser)
    await expect(page.getByRole('cell', { name: 'Seeded Active TM Project' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Active FC Project' })).toBeVisible();

    // DM should NOT see dm2's project
    await expect(page.getByRole('cell', { name: 'Seeded DM2 Project' })).not.toBeVisible();

    // Currency formatting check — ₹ symbol should be present
    await expect(page.locator('td').filter({ hasText: /₹/ }).first()).toBeVisible();
  });
});

// ── E2E-P2: Admin sees all projects ──
test.describe('E2E-P2 — Admin sees all', () => {
  test('Admin sees all projects including DM2', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('cell', { name: 'Seeded Active TM Project' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Active FC Project' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded DM2 Project' })).toBeVisible();
  });
});

// ── E2E-P3: Badge colors — green, orange, red ──
test.describe('E2E-P3 — Margin health badges', () => {
  test('shows correct health badges per project', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // All three badge types should be visible
    const badges = page.locator('[data-testid="margin-health-badge"]');
    await expect(badges.first()).toBeVisible();

    // Check for Healthy (TM 30%), At Risk (FC 15%), Low (DM2 -5%)
    await expect(page.getByText('Healthy').first()).toBeVisible();
    await expect(page.getByText('At Risk').first()).toBeVisible();
    await expect(page.getByText('Low').first()).toBeVisible();
  });
});

// ── E2E-P4: Loss row styling and AtRiskKPITile ──
test.describe('E2E-P4 — Loss row and deficit tile', () => {
  test('loss row has loss-row class and at-risk-kpi-tile with ₹ deficit', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // The DM2 project has negative profit → should have loss-row class
    const lossRow = page.locator('tr.loss-row');
    await expect(lossRow.first()).toBeVisible();

    // AtRiskKPITile should be present with deficit formatted in ₹
    const tile = page.getByTestId('at-risk-kpi-tile');
    await expect(tile).toBeVisible();
    await expect(tile).toContainText('₹');
    await expect(tile).toContainText('Deficit');
  });
});

// ── E2E-P5: Department filter persists in URL ──
test.describe('E2E-P5 — Filter persistence', () => {
  test('department filter persists in URL on refresh', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Open the Department select by clicking on it
    const deptFilter = page.getByTestId('filter-department').locator('.ant-select');
    await deptFilter.click();
    // Wait for dropdown options and select Delivery
    const deliveryOption = page.locator('.ant-select-item-option').filter({ hasText: 'Delivery' });
    await expect(deliveryOption).toBeVisible({ timeout: 5000 });
    await deliveryOption.click();

    // URL should contain department param
    await expect(page).toHaveURL(/department=Delivery/);

    // Reload page and verify filter persists
    await page.reload();
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/department=Delivery/);
  });
});

// ── E2E-P6: Sort toggle on Margin % header ──
test.describe('E2E-P6 — Sort toggle', () => {
  test('Margin % column default sort descending, toggles on click', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Default sort is descending on Margin % — first row should have highest margin (30.0%)
    const firstRowMargin = page.locator('tbody tr').first().locator('td').last();
    await expect(firstRowMargin).toContainText('30.0%');

    // antd sort cycle: descend → cancel → ascend
    // Click 1: cancels sort (API default order is also DESC, so still 30%)
    const marginHeader = page.getByRole('columnheader', { name: /Margin/ });
    await marginHeader.click();

    // Click 2: ascending — lowest margin first (-5.0%)
    await marginHeader.click();
    await expect(page.locator('tbody tr').first().locator('td').last()).toContainText('-5.0%');
  });
});

// ── E2E-N1: HR cannot access dashboard ──
test.describe('E2E-N1 — HR access denied', () => {
  test('HR is redirected away from dashboard', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/projects');
    // Should be redirected (RoleGuard)
    await expect(page).not.toHaveURL('/dashboards/projects', { timeout: 5000 });
  });
});

// ── E2E-N2: DEPT_HEAD department scoping — sees only own department projects ──
test.describe('E2E-N2 — DEPT_HEAD department scoping', () => {
  test('DEPT_HEAD sees only own department projects, not other departments', async ({ page }) => {
    // DEPT_HEAD is in Engineering department; dm2 is also in Engineering.
    // True empty-state test would require a dept_head in a department with no projects,
    // which is not feasible with current seed data. This test validates department scoping instead.
    await login(page, 'DEPT_HEAD');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('dashboard-table')).toBeVisible();

    // DEPT_HEAD (Engineering) should see dm2's project (dm2 is in Engineering)
    await expect(page.getByRole('cell', { name: 'Seeded DM2 Project' })).toBeVisible();

    // Should NOT see dmUser's projects (dmUser is in Delivery dept)
    await expect(page.getByRole('cell', { name: 'Seeded Active TM Project' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Active FC Project' })).not.toBeVisible();
  });
});
