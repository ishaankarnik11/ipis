import { test, expect } from '@playwright/test';
import { login, getDb, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

// ── Positive Scenarios ──────────────────────────────────────────

test.describe('Project List & Detail — DM role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
  });

  // E2E-P1: DM sees own projects with correct columns (AC: 1)
  test('E2E-P1: DM sees own projects in list with correct columns', async ({ page }) => {
    await page.goto('/projects');

    // Wait for table to load
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Verify column headers: Name, Client, Engagement Model, Status, Start Date, End Date
    const headers = page.locator('.ant-table-thead th');
    await expect(headers.getByText('Name')).toBeVisible();
    await expect(headers.getByText('Client')).toBeVisible();
    await expect(headers.getByText('Engagement Model')).toBeVisible();
    await expect(headers.getByText('Status')).toBeVisible();
    await expect(headers.getByText('Start Date')).toBeVisible();
    await expect(headers.getByText('End Date')).toBeVisible();

    // DM should NOT see Delivery Manager column
    await expect(headers.getByText('Delivery Manager')).not.toBeVisible();

    // Verify seeded active project appears
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();
  });

  // E2E-P3: DM clicks row → navigates to detail page (AC: 3, 5)
  test('E2E-P3: DM clicks project row and sees detail with breadcrumb', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click on the active TM project row
    await page.getByText('Seeded Active TM Project').click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // AC 5: Breadcrumb shows "Projects / [Project Name]"
    const breadcrumb = page.locator('.ant-breadcrumb');
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole('link', { name: /projects/i })).toBeVisible();
    await expect(breadcrumb.getByText('Seeded Active TM Project')).toBeVisible();

    // AC 3: Project fields displayed
    await expect(page.getByText('Gamma Solutions')).toBeVisible(); // Client
    await expect(page.getByText('FinTech')).toBeVisible(); // Vertical
    await expect(page.getByText('Time & Materials')).toBeVisible(); // Engagement Model
    await expect(page.locator('.ant-tag').getByText('Active').first()).toBeVisible(); // Status badge

    // Team roster section with seeded team member
    // NOTE: depends on employees.spec.ts resetting EMP001 designation after its edit test
    await expect(page.getByText('Team Roster')).toBeVisible();
    await expect(page.getByText('Seeded Employee One')).toBeVisible();
    await expect(page.getByText('Senior Developer')).toBeVisible();
  });
});

test.describe('Project List & Detail — Admin role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
  });

  // E2E-P2: Admin sees all projects with DM column (AC: 2)
  test('E2E-P2: Admin sees all projects with Delivery Manager column', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Admin should see Delivery Manager column
    const headers = page.locator('.ant-table-thead th');
    await expect(headers.getByText('Delivery Manager')).toBeVisible();

    // Verify DM name is shown
    await expect(page.getByText('E2E Delivery Manager').first()).toBeVisible();

    // Pending approval projects should be visible to Admin
    await expect(page.getByText('Seeded Pending Project')).toBeVisible();
    await expect(page.locator('.ant-tag').getByText('Pending Approval').first()).toBeVisible();
  });
});

test.describe('Project Detail — Finance role, % Completion', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'FINANCE');
  });

  // E2E-P4: Finance user views Fixed Cost project → % Completion editable (AC: 4)
  test('E2E-P4: Finance sees and edits % Completion on Fixed Cost project', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click on the Fixed Cost project
    await page.getByText('Seeded Active FC Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // Completion section should be visible for Fixed Cost
    const completionSection = page.getByTestId('completion-section');
    await expect(completionSection).toBeVisible();
    await expect(page.getByText('% Completion')).toBeVisible();

    // Pre-populated with 35 (0.35 * 100)
    const input = completionSection.getByRole('spinbutton');
    await expect(input).toHaveValue('35');

    // Update to 60%
    await input.fill('60');
    await completionSection.getByRole('button', { name: /save/i }).click();

    // Success message
    await expect(page.getByText(/completion.*updated/i)).toBeVisible({ timeout: 5000 });

    // Verify persisted in DB
    const db = getDb();
    const project = await db.project.findFirst({
      where: { name: 'Seeded Active FC Project' },
      select: { completionPercent: true },
    });
    expect(Number(project?.completionPercent)).toBeCloseTo(0.6, 2);

    // Reset to original value for other tests
    await db.project.updateMany({
      where: { name: 'Seeded Active FC Project' },
      data: { completionPercent: 0.35 },
    });
  });
});

// ── Negative Scenarios ──────────────────────────────────────────

test.describe('Project List & Detail — Negative', () => {
  // E2E-N1: HR user redirected from /projects (AC: unauthorized)
  test('E2E-N1: HR user redirected from /projects', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/projects');

    // HR should be redirected to their landing page (/employees)
    await expect(page).toHaveURL('/employees', { timeout: 10000 });
  });

  // E2E-N2: DM views T&M project detail → no % Completion input (AC: 4)
  test('E2E-N2: DM views T&M project detail — no completion input', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click on T&M project
    await page.getByText('Seeded Active TM Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // Completion section should NOT be visible for T&M
    await expect(page.getByText('Gamma Solutions')).toBeVisible(); // confirm page loaded
    await expect(page.getByTestId('completion-section')).not.toBeVisible();
  });

  // E2E-N3: Finance enters out-of-range % completion — antd clamps to valid range
  test('E2E-N3: Finance enters out-of-range % completion — value clamped by InputNumber', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/projects');
    await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Fixed Cost project
    await page.getByText('Seeded Active FC Project').click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    const completionSection = page.getByTestId('completion-section');
    await expect(completionSection).toBeVisible();

    const input = completionSection.getByRole('spinbutton');
    const saveBtn = completionSection.getByRole('button', { name: /save/i });

    // Clear the input → Save button should be disabled (null value)
    await input.fill('');
    await input.blur();
    await expect(saveBtn).toBeDisabled();

    // Type value above 100, blur to trigger clamp → antd clamps to max=100
    await input.fill('150');
    await input.blur();
    await expect(input).toHaveValue('100');

    // Save button should be enabled (100 is valid)
    await expect(saveBtn).toBeEnabled();
  });
});
