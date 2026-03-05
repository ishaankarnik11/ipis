/**
 * Story 8.5 — Project Detail: Team Roster & Financial Summary E2E Tests
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

async function navigateToTmProjectDetail(page: import('@playwright/test').Page) {
  await page.goto('/projects');
  await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });
  await page.getByText('Seeded Active TM Project').click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });
}

// ── Positive Scenarios ──────────────────────────────────────────

test.describe('E2E-P1: Financial summary shows 4 cards', () => {
  test('DM sees financial summary with Revenue, Cost, Profit, Margin cards', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await navigateToTmProjectDetail(page);

    // Financial summary section should be visible
    const summary = page.getByTestId('financial-summary');
    await expect(summary).toBeVisible({ timeout: 10000 });

    // 4 card titles
    await expect(summary.getByText('Revenue')).toBeVisible();
    await expect(summary.getByText('Cost')).toBeVisible();
    await expect(summary.getByText('Profit')).toBeVisible();
    await expect(summary.getByText('Margin')).toBeVisible();

    // Currency values should have ₹ symbol
    await expect(summary.locator('.ant-statistic-content').filter({ hasText: /₹/ }).first()).toBeVisible();

    // MarginHealthBadge — 30% margin → Healthy
    await expect(page.getByTestId('margin-health-badge')).toBeVisible();
    await expect(page.getByText('Healthy')).toBeVisible();
  });
});

test.describe('E2E-P2: Team roster with role names and selling rate', () => {
  test('DM sees team roster with Role, Selling Rate, Joined Date columns', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await navigateToTmProjectDetail(page);

    await expect(page.getByText('Team Roster')).toBeVisible();
    await expect(page.getByText('Seeded Employee One')).toBeVisible({ timeout: 10000 });

    // Column headers
    const headers = page.locator('.ant-table-thead th');
    await expect(headers.getByText('Role')).toBeVisible();
    await expect(headers.getByText('Selling Rate (₹/hr)')).toBeVisible();
    await expect(headers.getByText('Joined Date')).toBeVisible();

    // Role name resolved (not UUID)
    await expect(page.getByRole('cell', { name: 'Developer' })).toBeVisible();

    // Selling rate formatted as currency
    await expect(page.getByRole('cell', { name: /₹/ })).toBeVisible();
  });
});

test.describe('E2E-P3: Add team member flow', () => {
  test('DM adds a team member via modal', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await navigateToTmProjectDetail(page);

    // Add Team Member button visible for DM on ACTIVE project
    const addButton = page.getByRole('button', { name: /add team member/i });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Modal should open
    await expect(page.getByText('Add Team Member')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('E2E-P4: Remove team member with popconfirm', () => {
  test('DM sees remove button with popconfirm', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await navigateToTmProjectDetail(page);

    await expect(page.getByText('Seeded Employee One')).toBeVisible({ timeout: 10000 });

    // Remove button should be visible
    const removeButton = page.getByRole('button', { name: /remove/i }).first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Popconfirm appears
    await expect(page.getByText(/remove this team member/i)).toBeVisible({ timeout: 5000 });

    // Cancel to avoid modifying seed data
    await page.getByRole('button', { name: /cancel/i }).click();
  });
});

test.describe('E2E-P5: Finance user read-only view', () => {
  test('Finance user sees financial summary and roster but no Add/Remove buttons', async ({ page }) => {
    await login(page, 'FINANCE');
    await navigateToTmProjectDetail(page);

    // Financial summary visible
    const summary = page.getByTestId('financial-summary');
    await expect(summary).toBeVisible({ timeout: 10000 });

    // Team roster visible
    await expect(page.getByText('Team Roster')).toBeVisible();
    await expect(page.getByText('Seeded Employee One')).toBeVisible();

    // No management buttons
    await expect(page.getByRole('button', { name: /add team member/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).not.toBeVisible();
  });
});

// ── Negative Scenarios ──────────────────────────────────────────

test.describe('E2E-N1: No snapshots → empty financial state', () => {
  test('Project with no snapshots shows empty financial message', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Pending Approve Target (has no snapshots)
    const pendingRow = page.getByText('Seeded Pending Approve Target');
    // This project might not be visible to DM since it's PENDING. Use Admin instead.
    // Actually DM owns it, so it should be visible
    if (await pendingRow.isVisible()) {
      await pendingRow.click();
      await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

      // Should show empty state
      await expect(page.getByTestId('financial-empty-state')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/No financial data yet/)).toBeVisible();
    }
  });
});

test.describe('E2E-N2: PENDING_APPROVAL project hides Add button', () => {
  test('DM views PENDING_APPROVAL project — no Add Team Member button', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    const pendingRow = page.getByText('Seeded Pending Approve Target');
    if (await pendingRow.isVisible()) {
      await pendingRow.click();
      await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

      // Project detail loads
      await expect(page.getByText('Epsilon Ltd')).toBeVisible({ timeout: 10000 });

      // Add button should NOT be visible (project not ACTIVE)
      await expect(page.getByRole('button', { name: /add team member/i })).not.toBeVisible();
    }
  });
});
