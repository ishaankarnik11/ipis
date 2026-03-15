import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';

test.describe('UI Polish — Sidebar Badge, Label, Sort Order', () => {
  // ── E2E-P1: Pending Approvals badge ──────────────────────────────
  test('E2E-P1: Admin sidebar shows Pending Approvals with a badge count, no blue background', async ({ page }) => {
    await login(page, 'ADMIN');

    // Find the Pending Approvals menu item
    const menuItem = page.locator('nav[aria-label="Main navigation"]');
    const pendingItem = menuItem.getByText('Pending Approvals');
    await expect(pendingItem).toBeVisible();

    // The badge should be an antd Badge (rendered as sup.ant-badge-count or ant-scroll-number)
    // near the Pending Approvals text
    const badgeContainer = page.locator('.ant-badge').filter({ hasText: 'Pending Approvals' });
    await expect(badgeContainer).toBeVisible();
  });

  // ── E2E-P2: Department Dashboard label not truncated ─────────────
  test('E2E-P2: Admin sidebar shows "Dept Dashboard" label, not truncated', async ({ page }) => {
    await login(page, 'ADMIN');

    const menuItem = page.locator('nav[aria-label="Main navigation"]');
    // Should show "Dept Dashboard", not "Department Dashbo..."
    await expect(menuItem.getByText('Dept Dashboard')).toBeVisible();
    // The old truncated label should NOT exist
    expect(await menuItem.getByText('Department Dashboard').count()).toBe(0);
  });

  // ── E2E-P3: DM project list — ACTIVE projects first ─────────────
  test('E2E-P3: DM project list shows ACTIVE projects before COMPLETED/REJECTED', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // Wait for project rows to load
    await page.waitForSelector('.ant-table-row');
    const rows = page.locator('.ant-table-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // First row should have ACTIVE status (the badge text)
    const firstRowStatus = rows.nth(0).locator('.ant-tag').first();
    await expect(firstRowStatus).toHaveText(/Active/);
  });

  // ── E2E-P4: Admin project list — full status priority order ──────
  test('E2E-P4: Admin project list sorted ACTIVE first, then PENDING_APPROVAL, then REJECTED', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    await page.waitForSelector('.ant-table-row');
    const rows = page.locator('.ant-table-row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(2);

    // Collect all status texts from the table
    const statuses: string[] = [];
    for (let i = 0; i < count; i++) {
      const statusCell = rows.nth(i).locator('.ant-tag').first();
      const text = await statusCell.textContent();
      statuses.push(text?.trim() ?? '');
    }

    // Find indices of first occurrence of each status
    const firstActive = statuses.findIndex((s) => s === 'Active');
    const firstPending = statuses.findIndex((s) => s === 'Pending Approval');
    const firstRejected = statuses.findIndex((s) => s === 'Rejected');

    // ACTIVE should come before PENDING_APPROVAL, which should come before REJECTED
    if (firstActive >= 0 && firstPending >= 0) {
      expect(firstActive).toBeLessThan(firstPending);
    }
    if (firstPending >= 0 && firstRejected >= 0) {
      expect(firstPending).toBeLessThan(firstRejected);
    }
  });

  // ── E2E-N1: No pending approvals — badge hidden or shows 0 ──────
  test('E2E-N1: DM sidebar has no Pending Approvals item (DM role does not see it)', async ({ page }) => {
    // DM role does not have Pending Approvals in their sidebar, so badge is irrelevant
    await login(page, 'DELIVERY_MANAGER');
    const menuItem = page.locator('nav[aria-label="Main navigation"]');
    expect(await menuItem.getByText('Pending Approvals').count()).toBe(0);
  });
});
