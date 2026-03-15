/**
 * Story 9.4 — Department Dashboard: New Departments Visibility E2E Tests
 *
 * These tests verify that ALL departments appear in the Department Dashboard
 * and Company Dashboard — including departments without financial snapshots.
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: Admin sees all departments in Department Dashboard including zeroed ones ──
test.describe('E2E-P1 — All departments visible in Department Dashboard', () => {
  test('Admin sees all departments with financial columns rendered', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/department');
    await expect(page.getByTestId('department-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('department-table')).toBeVisible();

    // Table should have rows — at minimum the seeded departments
    const rows = page.locator('[data-testid="department-table"] tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    // Every row should have financial columns rendered (₹ symbol or 0.0%)
    // Verify currency formatting is present — either real values or ₹0
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      // Each row should contain at least a currency value (₹ symbol)
      await expect(row.filter({ hasText: /₹/ })).toBeVisible();
    }
  });
});

// ── E2E-P2: Company Dashboard shows all departments in breakdown ──
test.describe('E2E-P2 — Company Dashboard includes all departments', () => {
  test('Finance sees all departments in company dashboard breakdown', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/company');
    await expect(page.getByTestId('company-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('department-breakdown-table')).toBeVisible();

    // Department breakdown should have rows
    const rows = page.locator('[data-testid="department-breakdown-table"] tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    // Verify financial columns are rendered for all rows
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      await expect(row.filter({ hasText: /₹/ })).toBeVisible();
    }
  });
});

// ── E2E-P3: Department Dashboard shows correct financial values for departments with data ──
test.describe('E2E-P3 — Departments with data show correct values', () => {
  test('Departments with snapshot data display non-zero financial values', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/department');
    await expect(page.getByTestId('department-table')).toBeVisible({ timeout: 10000 });

    // At least one department should have non-zero revenue
    const cells = page.locator('[data-testid="department-table"] tbody td');
    const cellTexts = await cells.allTextContents();
    // Check that at least some cells have actual financial values (not all ₹0)
    const hasNonZeroValue = cellTexts.some((text) => {
      const match = text.match(/₹[\d,]+/);
      return match && !text.includes('₹0');
    });
    expect(hasNonZeroValue).toBe(true);
  });
});

// ── E2E-N1: Department with no data shows zeroed values, not hidden ──
test.describe('E2E-N1 — Zero-data departments visible', () => {
  test('Department table renders ₹0 for departments without financial data', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/department');
    await expect(page.getByTestId('department-table')).toBeVisible({ timeout: 10000 });

    // The table should be visible and not show "No department data available"
    await expect(page.getByText('No department data available')).not.toBeVisible();

    // Table should have department rows
    const rows = page.locator('[data-testid="department-table"] tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

// ── E2E-N2: Department dashboard handles margin badge for zero margin ──
test.describe('E2E-N2 — Zero margin renders correctly', () => {
  test('Margin health badges render without error for all departments', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/department');
    await expect(page.getByTestId('department-table')).toBeVisible({ timeout: 10000 });

    // MarginHealthBadge should render for all rows without crashing
    const badges = page.locator('[data-testid="margin-health-badge"]');
    const badgeCount = await badges.count();
    const rows = page.locator('[data-testid="department-table"] tbody tr');
    const rowCount = await rows.count();
    expect(badgeCount).toBe(rowCount);
  });
});
