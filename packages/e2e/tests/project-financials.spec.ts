import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

// ── Positive Scenarios ──────────────────────────────────────────

test.describe('Project Financials — DM role (Vikram workflow)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
  });

  // E2E-P1: Vikram logs in → Projects page → sees revenue, cost, profit columns populated (AC: 1, 2)
  test('E2E-P1: DM sees financial columns populated on project list', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Verify financial column headers are present
    const headers = page.locator('.ant-table-thead th');
    await expect(headers.getByText('Revenue')).toBeVisible();
    await expect(headers.getByText('Cost')).toBeVisible();
    await expect(headers.getByText('Profit')).toBeVisible();
    await expect(headers.getByText('Margin')).toBeVisible();

    // Seeded Active TM Project has: revenue 5M paise (₹50,000), cost 3.5M paise (₹35,000)
    const tmRow = page.locator('.ant-table-tbody tr', { hasText: 'Seeded Active TM Project' });
    await expect(tmRow).toBeVisible();

    // Revenue = ₹50,000
    await expect(tmRow.getByText('₹50,000')).toBeVisible();
    // Cost = ₹35,000
    await expect(tmRow.getByText('₹35,000')).toBeVisible();
    // Profit = ₹15,000
    await expect(tmRow.getByText('₹15,000')).toBeVisible();
    // Margin = 30% with Healthy badge
    await expect(tmRow.getByText('30%')).toBeVisible();
    await expect(tmRow.locator('[data-testid="margin-health-badge"]').getByText('Healthy')).toBeVisible();
  });

  // E2E-P3: Vikram clicks a project → detail page shows financial summary (AC: 4)
  test('E2E-P3: DM clicks project and sees financial summary on detail', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    await page.getByText('Seeded Active TM Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // Financial summary section should be visible with correct values
    const financialSection = page.getByTestId('financial-summary');
    await expect(financialSection).toBeVisible();

    // Revenue = ₹50,000
    await expect(financialSection.getByText('₹50,000')).toBeVisible();
    // Cost = ₹35,000
    await expect(financialSection.getByText('₹35,000')).toBeVisible();
    // Profit = ₹15,000
    await expect(financialSection.getByText('₹15,000')).toBeVisible();
    // Margin = 30% with Healthy badge
    await expect(financialSection.getByText('30%')).toBeVisible();
    await expect(financialSection.locator('[data-testid="margin-health-badge"]').getByText('Healthy')).toBeVisible();
  });
});

test.describe('Project Financials — Finance role (Priya workflow)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'FINANCE');
  });

  // E2E-P2: Priya sees financial values on project list matching dashboard (AC: 5)
  test('E2E-P2: Finance sees financial data on project list', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // FC Project: revenue 8M paise (₹80,000), cost 6.8M paise (₹68,000), margin 15%
    const fcRow = page.locator('.ant-table-tbody tr', { hasText: 'Seeded Active FC Project' });
    await expect(fcRow).toBeVisible();
    await expect(fcRow.getByText('₹80,000')).toBeVisible();
    await expect(fcRow.getByText('₹68,000')).toBeVisible();
    await expect(fcRow.getByText('₹12,000')).toBeVisible();
    await expect(fcRow.getByText('15%')).toBeVisible();
    await expect(fcRow.locator('[data-testid="margin-health-badge"]').getByText('At Risk')).toBeVisible();
  });
});

test.describe('Project Financials — Admin role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
  });

  // E2E-P4: Newly created project with no uploads → shows '—' not blank (AC: 3)
  test('E2E-P4: Project with no snapshots shows dash placeholder', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Pending project has no snapshots
    const pendingRow = page.locator('.ant-table-tbody tr', { hasText: 'Seeded Pending Project' });
    await expect(pendingRow).toBeVisible();

    // Financial columns should show '—' (em dash)
    const cells = pendingRow.locator('td');
    const cellTexts = await cells.allTextContents();
    const joinedText = cellTexts.join('|');
    // Should contain dash placeholders for revenue/cost/profit/margin
    expect(joinedText).toContain('—');
  });
});

// ── Negative Scenarios ──────────────────────────────────────────

test.describe('Project Financials — Negative', () => {
  // E2E-N1: Project with no snapshots shows placeholder, not undefined/NaN/blank (AC: 3)
  test('E2E-N1: No-snapshot project shows dash, not undefined/NaN', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    const pendingRow = page.locator('.ant-table-tbody tr', { hasText: 'Seeded Pending Project' });
    await expect(pendingRow).toBeVisible();

    const rowText = await pendingRow.textContent();
    expect(rowText).not.toContain('undefined');
    expect(rowText).not.toContain('NaN');
    expect(rowText).not.toContain('null');
  });

  // E2E-N2: DM can only see financials for own projects (RBAC preserved) (AC: 1)
  test('E2E-N2: DM only sees own projects with financials', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // DM should see own projects
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();

    // DM should NOT see DM2's project
    await expect(page.getByText('Seeded DM2 Project')).not.toBeVisible();
  });
});
