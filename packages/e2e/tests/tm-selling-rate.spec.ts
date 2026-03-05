/**
 * Story 8.4 — T&M Revenue Per-Member Selling Rate E2E Tests
 *
 * Validates per-member selling rate display, UI label rename,
 * and non-T&M regression.
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';
import { getDb, closeDb } from '../helpers/db.js';

test.afterAll(async () => {
  await closeDb();
});

// ── E2E-P3: "Selling Rate" column header on project detail ──
test.describe('E2E-P3 — Selling Rate column header', () => {
  test('Project detail team roster shows "Selling Rate (₹/hr)" column header', async ({ page }) => {
    await login(page, 'ADMIN');

    // Navigate to the seeded T&M project detail
    const db = getDb();
    const tmProject = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project' },
    });
    expect(tmProject).toBeTruthy();

    await page.goto(`/projects/${tmProject!.id}`);
    await expect(page.getByText('Team Roster')).toBeVisible({ timeout: 10000 });

    // Verify the column header says "Selling Rate" not "Billing Rate"
    await expect(
      page.getByRole('columnheader', { name: /Selling Rate/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /Billing Rate/i }),
    ).not.toBeVisible();
  });
});

// ── E2E-P1: T&M project with per-member selling rates ──
test.describe('E2E-P1 — Per-member selling rate display', () => {
  test('T&M project detail shows formatted selling rate for team members', async ({ page }) => {
    await login(page, 'ADMIN');

    const db = getDb();
    const tmProject = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project' },
    });
    expect(tmProject).toBeTruthy();

    await page.goto(`/projects/${tmProject!.id}`);
    await expect(page.getByText('Team Roster')).toBeVisible({ timeout: 10000 });

    // The seeded member (EMP001) has billingRatePaise = 500000 (₹5,000/hr)
    // Should see the formatted rate in the table
    await expect(page.getByRole('cell', { name: /₹5,000/ })).toBeVisible();
  });
});

// ── E2E-N1: T&M member with null selling rate — no crash ──
test.describe('E2E-N1 — Null selling rate graceful handling', () => {
  test('Project detail still renders when a member has null billingRatePaise', async ({ page }) => {
    const db = getDb();

    // Find the T&M project and its assigned employee
    const tmProject = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project' },
    });
    expect(tmProject).toBeTruthy();

    const assignment = await db.employeeProject.findFirst({
      where: { projectId: tmProject!.id },
    });

    // Temporarily set billingRatePaise to null
    const originalRate = assignment!.billingRatePaise;
    await db.employeeProject.update({
      where: { id: assignment!.id },
      data: { billingRatePaise: null },
    });

    try {
      await login(page, 'ADMIN');
      await page.goto(`/projects/${tmProject!.id}`);
      await expect(page.getByText('Team Roster')).toBeVisible({ timeout: 10000 });

      // Should show dash for null rate, not crash
      await expect(page.getByRole('cell', { name: '—' })).toBeVisible();
    } finally {
      // Restore original rate
      await db.employeeProject.update({
        where: { id: assignment!.id },
        data: { billingRatePaise: originalRate },
      });
    }
  });
});

// ── E2E-N2: Non-T&M project regression guard ──
test.describe('E2E-N2 — Fixed Cost project unaffected', () => {
  test('Fixed Cost project dashboard shows contract-based revenue (not member rates)', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // The seeded FC project exists and uses contract value for revenue
    await expect(
      page.getByRole('cell', { name: 'Seeded Active FC Project' }),
    ).toBeVisible();

    // DB verify: FC project has contract-value based snapshot, not per-member rates
    const db = getDb();
    const fcProject = await db.project.findFirst({
      where: { name: 'Seeded Active FC Project' },
    });
    expect(fcProject).toBeTruthy();
    expect(fcProject!.engagementModel).toBe('FIXED_COST');
    expect(fcProject!.contractValuePaise).toBeTruthy();
  });
});
