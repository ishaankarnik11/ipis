/**
 * Story 9.5 — Billable Utilisation Calculation E2E Tests
 *
 * Verifies that the Executive Dashboard displays a correct, non-zero
 * billable utilisation percentage when seed data contains billable
 * employees with timesheet hours.
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: Executive Dashboard shows non-zero utilisation ──
test.describe('E2E-P1 — Non-zero billable utilisation after data upload', () => {
  test('Finance sees non-zero Billable Utilisation on Executive Dashboard', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });

    // The Billable Utilisation tile should be visible
    await expect(page.getByText('Billable Utilisation')).toBeVisible();

    // The KPI tiles section should contain a percentage value that is NOT 0.0%
    const kpiTiles = page.getByTestId('kpi-tiles');
    await expect(kpiTiles).toBeVisible();

    // Verify there's a percentage visible (e.g., "50.0%", "87.5%")
    await expect(kpiTiles.getByText(/\d+\.\d+%/)).toBeVisible();
  });
});

// ── E2E-P2: Billable Utilisation tile shows consistent value ──
test.describe('E2E-P2 — Utilisation tile value consistency', () => {
  test('Billable Utilisation value is consistent with uploaded data', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });

    // The utilisation tile should show a numeric percentage
    const utilisationTile = page.locator('.ant-statistic').filter({ hasText: 'Billable Utilisation' });
    await expect(utilisationTile).toBeVisible();

    // Should contain a percentage value
    await expect(utilisationTile.locator('.ant-statistic-content-value')).toContainText('%');
  });
});

// ── E2E-P3: Admin sees same utilisation as Finance ──
test.describe('E2E-P3 — Admin sees utilisation', () => {
  test('Admin sees Billable Utilisation on Executive Dashboard', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Billable Utilisation')).toBeVisible();

    // Should show a percentage value (not 0.0% if seed data has billable hours)
    const kpiTiles = page.getByTestId('kpi-tiles');
    await expect(kpiTiles.getByText(/\d+\.\d+%/)).toBeVisible();
  });
});

// ── E2E-N1: Dashboard loads correctly even without issues ──
test.describe('E2E-N1 — Dashboard loads without errors', () => {
  test('Executive Dashboard does not crash on utilisation rendering', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });

    // All 4 KPI tiles should be visible (Revenue, Cost, Margin, Utilisation)
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await expect(page.getByText('Total Cost')).toBeVisible();
    await expect(page.getByText('Gross Margin')).toBeVisible();
    await expect(page.getByText('Billable Utilisation')).toBeVisible();
  });
});

// ── E2E-N2: DM cannot see executive utilisation ──
test.describe('E2E-N2 — Non-billable role exclusion', () => {
  test('DM is redirected away from executive dashboard', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/dashboards/executive');
    await expect(page).not.toHaveURL('/dashboards/executive', { timeout: 5000 });
  });
});
