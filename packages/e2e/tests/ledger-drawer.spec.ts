/**
 * Story 6.4 — Ledger Drawer UI Component E2E Tests
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// Pin the data period to Feb 2026 regardless of upload events created by other tests.
// The LedgerDrawer derives its period from the latest upload event; prior test suites
// (bulk-upload, cross-role-chains) may create upload events with later periods that lack
// matching calculation snapshots, causing these tests to fail.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/uploads/latest-by-type', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { type: 'BILLING', periodMonth: 2, periodYear: 2026, createdAt: '2026-02-15T10:00:00Z' },
        ],
      }),
    });
  });
});

// ── E2E-P1: Finance user clicks project row → drawer opens ──
test.describe('E2E-P1 — Drawer opens on row click', () => {
  test('Finance clicks project row, drawer opens with project name and period', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Click the T&M project row
    const tmRow = page.getByRole('cell', { name: 'Seeded Active TM Project' });
    await expect(tmRow).toBeVisible();
    await tmRow.click();

    // Drawer should open with project name and period in title
    const drawer = page.locator('.ant-drawer-open');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ant-drawer-title')).toContainText('Seeded Active TM Project');
    await expect(page.locator('.ant-drawer-title')).toContainText('Feb 2026');
  });
});

// ── E2E-P2: T&M project shows KPI tiles + employee table ──
test.describe('E2E-P2 — T&M project ledger content', () => {
  test('T&M project drawer shows KPI tiles and employee breakdown table', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // KPI tiles should be present (scoped to drawer to avoid column header collisions)
    const kpiTiles = page.getByTestId('ledger-kpi-tiles');
    await expect(kpiTiles).toBeVisible();
    await expect(kpiTiles.getByText('Revenue')).toBeVisible();
    await expect(kpiTiles.getByText('Cost')).toBeVisible();
    await expect(kpiTiles.getByText('Profit')).toBeVisible();
    await expect(kpiTiles.getByText('Margin %')).toBeVisible();

    // Employee table should be present with correct columns
    await expect(page.getByTestId('employee-breakdown-table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Employee Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Designation' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Hours' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Cost\/Hour/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Contribution/ })).toBeVisible();

    // Should show seeded employee names
    await expect(page.locator('.ant-drawer').getByText('Seeded Employee One')).toBeVisible();
    await expect(page.locator('.ant-drawer').getByText('Seeded Employee Two')).toBeVisible();
  });
});

// ── E2E-P2a: Infra SIMPLE project shows cost summary card ──
test.describe('E2E-P2a — Infra SIMPLE ledger content', () => {
  test('Infra SIMPLE drawer shows cost summary card, no employee table', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await page.getByRole('cell', { name: 'Seeded Infra Simple Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // KPI tiles should be present
    await expect(page.getByTestId('ledger-kpi-tiles')).toBeVisible();

    // Cost summary card should be present
    await expect(page.getByTestId('cost-summary-card')).toBeVisible();
    await expect(page.locator('.ant-drawer').getByText('Vendor Cost')).toBeVisible();
    await expect(page.locator('.ant-drawer').getByText('Manpower Cost')).toBeVisible();

    // Employee table should NOT be present
    await expect(page.getByTestId('employee-breakdown-table')).not.toBeVisible();
  });
});

// ── E2E-P2b: Infra DETAILED project shows vendor cost + employee table ──
test.describe('E2E-P2b — Infra DETAILED ledger content', () => {
  test('Infra DETAILED drawer shows vendor cost line and employee table', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await page.getByRole('cell', { name: 'Seeded Infra Detailed Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // KPI tiles should be present
    await expect(page.getByTestId('ledger-kpi-tiles')).toBeVisible();

    // Vendor cost line should be present
    await expect(page.getByTestId('vendor-cost-line')).toBeVisible();

    // Employee table should be present with infra employee
    await expect(page.getByTestId('employee-breakdown-table')).toBeVisible();
    await expect(page.locator('.ant-drawer').getByText('Infra Ops Lead')).toBeVisible();
  });
});

// ── E2E-P3: Derived figures have dotted underline and formula tooltip ──
test.describe('E2E-P3 — Derived figure tooltips', () => {
  test('derived figures have dotted underline; hovering shows formula', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // Find derived figures (should have dotted border-bottom)
    const derivedFigures = page.locator('[data-testid="derived-figure"]');
    await expect(derivedFigures.first()).toBeVisible();

    // Check dotted underline style
    const style = await derivedFigures.first().getAttribute('style');
    expect(style).toContain('dotted');

    // Hover on a Cost/Hour derived figure to show tooltip
    const costHourFigure = page.getByTestId('employee-breakdown-table').locator('[data-testid="derived-figure"]').first();
    await costHourFigure.hover();

    // Tooltip should appear with formula
    await expect(page.locator('.ant-tooltip')).toBeVisible({ timeout: 3000 });
  });
});

// ── E2E-P4: Loss project — largest contributor has #FFF2F0 background ──
test.describe('E2E-P4 — Loss row highlighting', () => {
  test('loss project ledger highlights largest contributor row', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // DM2 project is the loss project
    await page.getByRole('cell', { name: 'Seeded DM2 Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // Employee table should have a loss-row
    await expect(page.getByTestId('employee-breakdown-table')).toBeVisible();
    const lossRow = page.locator('.ant-drawer tr.loss-row');
    await expect(lossRow).toBeVisible();

    // Largest contributor (emp-seed-4, contributionPaise: 1200000) should be in the loss row
    await expect(lossRow).toContainText('Seeded Employee Four');
  });
});

// ── E2E-P5: Metadata footer shows calculated time + engine version ──
test.describe('E2E-P5 — Metadata footer', () => {
  test('metadata footer shows calculated time and engine version', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    const footer = page.getByTestId('ledger-metadata-footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Calculated:');
    await expect(footer).toContainText('Engine v1.0.0');
  });
});

// ── E2E-P6: Escape closes drawer; reopen uses cache ──
test.describe('E2E-P6 — Close and cache', () => {
  test('Escape closes drawer; reopening same project does not trigger new API call', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Open the drawer
    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('ledger-kpi-tiles')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('.ant-drawer-open')).not.toBeVisible({ timeout: 3000 });

    // Count API calls for the ledger before reopening
    let ledgerApiCalls = 0;
    page.on('request', (request) => {
      if (request.url().includes('/ledger')) {
        ledgerApiCalls++;
      }
    });

    // Reopen the same project
    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('ledger-kpi-tiles')).toBeVisible();

    // TanStack Query cache should serve stale data — no new ledger API call
    expect(ledgerApiCalls).toBe(0);
  });
});

// ── E2E-N1: HR user cannot access dashboard ──
test.describe('E2E-N1 — HR access denied', () => {
  test('HR user cannot access project dashboard (no ledger drawer)', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/dashboards/projects');
    // HR is redirected away (RoleGuard)
    await expect(page).not.toHaveURL('/dashboards/projects', { timeout: 5000 });
  });
});

// ── E2E-N2: API error shows inline error message ──
test.describe('E2E-N2 — API error handling', () => {
  test('ledger API error shows inline error, no crash', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Intercept ledger API to return error
    await page.route('**/api/v1/reports/projects/*/ledger*', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SNAPSHOT_NOT_FOUND', message: 'No calculation data available for this period' } }),
      });
    });

    // Click a project row
    await page.getByRole('cell', { name: 'Seeded Active TM Project' }).click();
    await expect(page.locator('.ant-drawer-open')).toBeVisible({ timeout: 5000 });

    // Error alert should be shown
    await expect(page.getByTestId('ledger-error')).toBeVisible({ timeout: 5000 });
    // Dashboard should not crash — table still visible after closing drawer
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dashboard-table')).toBeVisible();
  });
});
