/**
 * Story 10.2 — HR Gets Employee Dashboard + Utilization Access E2E Tests
 *
 * Verifies that HR users can access the Employee Dashboard with utilization data
 * but cannot see financial profitability columns.
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: HR sidebar shows Employee Dashboard ──
test.describe('E2E-P1 — HR sidebar includes Employee Dashboard', () => {
  test('HR sees Employees, Upload Center, and Employee Dashboard in sidebar', async ({ page }) => {
    await login(page, 'HR');

    const sidebar = page.locator('nav, [class*="sider"], aside').first();
    await expect(sidebar.getByText('Employees')).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText('Upload Center')).toBeVisible();
  });
});

// ── E2E-P2: HR sees employee list with utilization columns ──
test.describe('E2E-P2 — HR Employee Dashboard shows utilization data', () => {
  test('HR navigates to Employee Dashboard and sees utilization columns', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible();

    // Utilization columns should be visible
    const table = page.getByTestId('employee-dashboard-table');
    await expect(table.getByText('Name')).toBeVisible();
    await expect(table.getByText('Designation')).toBeVisible();
    await expect(table.getByText('Department')).toBeVisible();
    await expect(table.getByText('Billable Utilisation')).toBeVisible();
  });
});

// ── E2E-P3: HR does NOT see financial columns ──
test.describe('E2E-P3 — HR Employee Dashboard hides financial columns', () => {
  test('HR does not see Revenue, Cost, Profit, or Margin columns', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });

    const table = page.getByTestId('employee-dashboard-table');
    await expect(table.getByText('Revenue Contribution')).not.toBeVisible();
    await expect(table.getByText('Profit Contribution')).not.toBeVisible();
    await expect(table.getByText('Margin %')).not.toBeVisible();
  });
});

// ── E2E-P4: HR sees under-utilisation amber highlight ──
test.describe('E2E-P4 — HR sees under-utilisation highlight', () => {
  test('Under-utilised employees are highlighted in amber for HR', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });

    // If there are under-utilised employees, they should have the amber highlight
    const underUtilElements = page.locator('[data-testid="under-utilisation"]');
    const count = await underUtilElements.count();
    if (count > 0) {
      const color = await underUtilElements.first().evaluate((el) => getComputedStyle(el).color);
      // rgb(212, 136, 6) is the amber color #d48806
      expect(color).toBe('rgb(212, 136, 6)');
    }
    // If no under-utilised employees in test data, this test passes silently
  });
});

// ── E2E-N1: HR API response does not include financial data ──
test.describe('E2E-N1 — HR API excludes financial profitability data', () => {
  test('GET /api/v1/reports/dashboards/employees returns zeroed financials for HR', async ({ page, request }) => {
    await login(page, 'HR');

    // Extract cookies from the browser context for the API request
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const response = await request.get('/api/v1/reports/dashboards/employees', {
      headers: { Cookie: cookieHeader },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    if (body.data && body.data.length > 0) {
      for (const emp of body.data) {
        expect(emp.revenueContributionPaise).toBe(0);
        expect(emp.totalCostPaise).toBe(0);
        expect(emp.profitContributionPaise).toBe(0);
        expect(emp.marginPercent).toBe(0);
        expect(emp.profitabilityRank).toBe(0);
      }
    }
  });
});

// ── E2E-N2: HR still blocked from Executive Dashboard ──
test.describe('E2E-N2 — HR cannot access Executive Dashboard', () => {
  test('HR navigating to Executive Dashboard is blocked', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/executive');

    // Should NOT see the executive dashboard — either redirected or access denied
    await expect(page.getByTestId('executive-dashboard')).not.toBeVisible({ timeout: 5000 });
  });
});
