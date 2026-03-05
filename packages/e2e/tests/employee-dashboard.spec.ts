/**
 * Story 6.5 — Employee Dashboard E2E Tests
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: Admin sees all employees with expected columns ──
test.describe('E2E-P1 — Admin full visibility', () => {
  test('Admin sees all employees with all columns', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible();

    // All 5 active employees visible
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Two' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Three' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Five' })).toBeVisible();

    // Resigned employee should NOT appear
    await expect(page.getByRole('cell', { name: 'Seeded Resigned Employee' })).not.toBeVisible();

    // Column headers present
    await expect(page.getByRole('columnheader', { name: '#' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Designation' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Department' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Billable Utilisation/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Revenue/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Cost/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Profit/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Margin/ })).toBeVisible();

    // Currency formatting — ₹ symbol present
    await expect(page.locator('td').filter({ hasText: /₹/ }).first()).toBeVisible();
  });
});

// ── E2E-P2: Department Head sees only own department ──
test.describe('E2E-P2 — DEPT_HEAD department scoping', () => {
  test('DEPT_HEAD sees only Engineering department employees', async ({ page }) => {
    await login(page, 'DEPT_HEAD');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible();

    // DEPT_HEAD is in Engineering — should see EMP001 and EMP004
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).toBeVisible();

    // Should NOT see employees from other departments
    await expect(page.getByRole('cell', { name: 'Seeded Employee Two' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Three' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Five' })).not.toBeVisible();
  });
});

// ── E2E-P3: Under-utilisation amber highlight ──
test.describe('E2E-P3 — Under-utilisation highlight', () => {
  test('employees with < 50% utilisation show amber highlight', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // EMP003 and EMP005 have utilisation < 50% — should have under-utilisation testid
    const underUtilMarkers = page.locator('[data-testid="under-utilisation"]');
    await expect(underUtilMarkers.first()).toBeVisible();

    // Should be at least 2 under-utilised employees
    expect(await underUtilMarkers.count()).toBeGreaterThanOrEqual(2);
  });
});

// ── E2E-P4: Loss row styling ──
test.describe('E2E-P4 — Loss row background', () => {
  test('employees with negative profit have loss-row class', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // EMP003 and EMP005 have negative profit → loss-row
    const lossRows = page.locator('tr.loss-row');
    await expect(lossRows.first()).toBeVisible();
    expect(await lossRows.count()).toBeGreaterThanOrEqual(2);
  });
});

// ── E2E-P5: Department filter with URL persistence ──
test.describe('E2E-P5 — Department filter', () => {
  test('department filter updates URL and shows matching employees', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // Open department select
    const deptFilter = page.getByTestId('filter-department').locator('.ant-select');
    await deptFilter.click();

    // Select Engineering
    const engOption = page.locator('.ant-select-item-option').filter({ hasText: 'Engineering' });
    await expect(engOption).toBeVisible({ timeout: 5000 });
    await engOption.click();

    // URL should contain department param
    await expect(page).toHaveURL(/department=Engineering/);

    // Only Engineering employees should be visible after re-query
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Two' })).not.toBeVisible();
  });
});

// ── E2E-P5b: Designation filter [M1 review fix] ──
test.describe('E2E-P5b — Designation filter', () => {
  test('designation filter updates URL and shows matching employees', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // Open designation select
    const desigFilter = page.getByTestId('filter-designation').locator('.ant-select');
    await desigFilter.click();

    // Select "Senior Developer" (EMP001 has this designation per seed)
    const desigOption = page.locator('.ant-select-item-option').filter({ hasText: 'Senior Developer' });
    await expect(desigOption).toBeVisible({ timeout: 5000 });
    await desigOption.click();

    // URL should contain designation param
    await expect(page).toHaveURL(/designation=Senior/);

    // Only Senior Developer employees visible
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
  });
});

// ── E2E-P6: Default rank sort ascending ──
test.describe('E2E-P6 — Rank sort default', () => {
  test('table sorted by rank ascending — highest revenue first', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // First row should have rank 1 (highest revenue = EMP001 "Seeded Employee One")
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').first()).toHaveText('1');
    await expect(firstRow).toContainText('Seeded Employee One');
  });
});

// ── E2E-P7: Click-through to employee detail ──
test.describe('E2E-P7 — Employee detail navigation', () => {
  test('clicking employee name navigates to detail view', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard-table')).toBeVisible({ timeout: 10000 });

    // Click on employee name (rendered as <a> tag)
    await page.getByText('Seeded Employee One').click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/dashboards\/employees\/.+/, { timeout: 5000 });
    await expect(page.getByTestId('employee-detail')).toBeVisible({ timeout: 10000 });

    // Should show employee name and detail tables
    await expect(page.getByText('Seeded Employee One')).toBeVisible();
    await expect(page.getByTestId('monthly-history-table')).toBeVisible();
    await expect(page.getByTestId('project-assignments-table')).toBeVisible();

    // Back button should return to dashboard
    await page.getByRole('button', { name: 'Back to Employee Dashboard' }).click();
    await expect(page).toHaveURL('/dashboards/employees', { timeout: 5000 });
  });
});

// ── E2E-N1: HR redirect ──
test.describe('E2E-N1 — HR access denied', () => {
  test('HR is redirected away from employee dashboard', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/employees');
    // RoleGuard should redirect HR to their landing page
    await expect(page).not.toHaveURL('/dashboards/employees', { timeout: 5000 });
  });
});

// ── E2E-N2: DM redirect ──
test.describe('E2E-N2 — DM access denied', () => {
  test('DM is redirected away from employee dashboard', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/dashboards/employees');
    // RoleGuard should redirect DM to their landing page
    await expect(page).not.toHaveURL('/dashboards/employees', { timeout: 5000 });
  });
});

// ── E2E-N3: Empty state handling ──
test.describe('E2E-N3 — Empty state', () => {
  test('empty API response shows empty state message without crash', async ({ page }) => {
    await login(page, 'FINANCE');

    // Mock API to return empty data
    await page.route('**/api/v1/reports/dashboards/employees', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0 } }),
      });
    });

    await page.goto('/dashboards/employees');
    await expect(page.getByTestId('employee-dashboard')).toBeVisible({ timeout: 10000 });

    // Empty state message should be visible
    await expect(page.getByText('No employee data available')).toBeVisible();
  });
});
