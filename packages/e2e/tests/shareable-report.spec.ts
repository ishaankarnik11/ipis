/**
 * Story 9.2 — Shared Report Links E2E Tests
 *
 * Tests that shared report links render formatted dashboard views
 * instead of raw JSON. Share links are public (no auth required).
 */
import { test, expect, type Page } from '@playwright/test';
import { login } from '../helpers/index.js';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Creates a share link by logging in as FINANCE, calling the share API,
 * then returns the share URL path.
 */
async function createShareLink(
  page: Page,
  reportType: string,
): Promise<string> {
  // Log in as FINANCE to create the share link
  await login(page, 'FINANCE');

  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // Call the share API directly
  const response = await page.request.post('/api/v1/reports/share', {
    data: { reportType, entityId: NIL_UUID, period },
  });

  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data.shareUrl as string;
}

// ── E2E-P1: Executive Dashboard share link renders formatted view ──
test.describe('E2E-P1 — Executive Dashboard share link', () => {
  test('renders formatted KPI tiles and project sections, not JSON', async ({ page, context }) => {
    const shareUrl = await createShareLink(page, 'executive');

    // Open in a new page (simulates incognito — no auth cookies carried)
    const publicPage = await context.newPage();
    await publicPage.goto(shareUrl);

    // Wait for the shared report to load
    await expect(publicPage.getByTestId('shared-report')).toBeVisible({ timeout: 15000 });

    // Should show the banner
    await expect(publicPage.getByText(/shared snapshot/i)).toBeVisible();

    // Should show Executive Dashboard Report title
    await expect(publicPage.getByText('Executive Dashboard Report')).toBeVisible();

    // Should render KPI tiles
    await expect(publicPage.getByTestId('kpi-tiles')).toBeVisible();
    await expect(publicPage.getByText('Total Revenue')).toBeVisible();
    await expect(publicPage.getByText('Total Cost')).toBeVisible();
    await expect(publicPage.getByText('Gross Margin')).toBeVisible();
    await expect(publicPage.getByText('Billable Utilisation')).toBeVisible();

    // Currency values should use ₹ symbol
    await expect(publicPage.locator('[data-testid="kpi-tiles"]').filter({ hasText: /₹/ }).first()).toBeVisible();

    // Should render top/bottom project sections
    await expect(publicPage.getByText('Top 5 Projects by Margin')).toBeVisible();
    await expect(publicPage.getByText('Bottom 5 Projects by Margin')).toBeVisible();

    // Should NOT have raw JSON — no <pre> tags
    const preTags = await publicPage.locator('pre').count();
    expect(preTags).toBe(0);

    // Should NOT contain raw field names
    const bodyText = await publicPage.locator('body').textContent();
    expect(bodyText).not.toContain('revenuePaise');
    expect(bodyText).not.toContain('billableUtilisationPercent');
    expect(bodyText).not.toContain('top5Projects');

    await publicPage.close();
  });
});

// ── E2E-P2: Department Dashboard share link ──
test.describe('E2E-P2 — Department Dashboard share link', () => {
  test('renders formatted department report with KPI tiles and table', async ({ page, context }) => {
    const shareUrl = await createShareLink(page, 'department');

    const publicPage = await context.newPage();
    await publicPage.goto(shareUrl);

    await expect(publicPage.getByTestId('shared-report')).toBeVisible({ timeout: 15000 });
    await expect(publicPage.getByText('Department Dashboard Report')).toBeVisible();

    // Should render KPI tiles
    await expect(publicPage.getByTestId('kpi-tiles')).toBeVisible();

    // Should render department table
    await expect(publicPage.getByTestId('department-table')).toBeVisible();

    // Should NOT have raw JSON
    const preTags = await publicPage.locator('pre').count();
    expect(preTags).toBe(0);

    const bodyText = await publicPage.locator('body').textContent();
    expect(bodyText).not.toContain('departmentId');
    expect(bodyText).not.toContain('revenuePaise');

    await publicPage.close();
  });
});

// ── E2E-P3: Project Dashboard share link ──
test.describe('E2E-P3 — Project Dashboard share link', () => {
  test('renders formatted project table with financial columns', async ({ page, context }) => {
    const shareUrl = await createShareLink(page, 'project');

    const publicPage = await context.newPage();
    await publicPage.goto(shareUrl);

    await expect(publicPage.getByTestId('shared-report')).toBeVisible({ timeout: 15000 });
    await expect(publicPage.getByText('Project Dashboard Report')).toBeVisible();

    // Should render project table
    await expect(publicPage.getByTestId('project-table')).toBeVisible();

    // Should render summary KPIs
    await expect(publicPage.getByTestId('kpi-tiles')).toBeVisible();

    // Should NOT have raw JSON
    const preTags = await publicPage.locator('pre').count();
    expect(preTags).toBe(0);

    const bodyText = await publicPage.locator('body').textContent();
    expect(bodyText).not.toContain('revenuePaise');
    expect(bodyText).not.toContain('costPaise');

    await publicPage.close();
  });
});

// ── E2E-N1: Invalid token shows clean error page ──
test.describe('E2E-N1 — Invalid share token', () => {
  test('shows clean error page for invalid token', async ({ page }) => {
    await page.goto('/reports/shared/00000000-0000-0000-0000-000000000000');

    await expect(page.getByTestId('shared-report-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This report link has expired or is invalid')).toBeVisible();

    // Should NOT show a stack trace or blank page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Error:');
    expect(bodyText).not.toContain('at Object');
    expect(bodyText).not.toContain('TypeError');
  });
});

// ── E2E-N2: Malformed token shows clean error page ──
test.describe('E2E-N2 — Malformed share token', () => {
  test('shows clean error page for non-UUID token', async ({ page }) => {
    await page.goto('/reports/shared/not-a-valid-token');

    await expect(page.getByTestId('shared-report-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('This report link has expired or is invalid')).toBeVisible();
  });
});
