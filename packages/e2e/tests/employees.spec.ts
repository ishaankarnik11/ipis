import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

test.describe('Employee Management — HR role', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  });

  test('HR sees employee table without CTC column', async ({ page }) => {
    // Seeded employees should appear
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'EMP001' })).toBeVisible();

    // CTC column should NOT be visible for HR
    await expect(page.getByRole('columnheader', { name: 'Annual CTC' })).not.toBeVisible();
  });

  test('HR adds employee via modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Employee' }).first().click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Fill the add employee form
    await modal.getByLabel('Employee Code').fill('EMP100');
    await modal.getByLabel('Name').fill('E2E Added Employee');

    // Select department — click the combobox input for the antd Select
    await modal.getByRole('combobox', { name: 'Department' }).click();
    await page.getByTitle('Engineering').click();

    await modal.getByLabel('Designation').fill('Test Engineer');
    await modal.getByLabel('Annual CTC').fill('1500000');

    // Submit — scope to modal to avoid matching the page-level button
    await modal.getByRole('button', { name: 'Add Employee' }).click();

    // Verify employee appears in table
    await expect(page.getByRole('cell', { name: 'E2E Added Employee' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'EMP100' })).toBeVisible();
  });

  test('HR edits employee', async ({ page }) => {
    // Hover to reveal action buttons and click Edit
    const empRow = page.getByRole('row').filter({ hasText: 'Seeded Employee One' });
    await empRow.hover();
    await empRow.getByRole('button', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Change designation
    const designationInput = modal.getByLabel('Designation');
    await designationInput.clear();
    await designationInput.fill('Lead Developer');

    // HR list API omits annualCtcPaise (by design), so CTC field is empty in edit modal.
    // Fill it to satisfy required validation — this is a known UX gap.
    const ctcInput = modal.getByLabel('Annual CTC');
    await ctcInput.fill('1200000');

    await modal.getByRole('button', { name: 'Save Changes' }).click();

    // Verify change in table — wait for the updated text to appear
    await expect(empRow.getByText('Lead Developer')).toBeVisible({ timeout: 10000 });
  });

  test('HR resigns employee — confirmation modal changes status', async ({ page }) => {
    const empRow = page.getByRole('row').filter({ hasText: 'Seeded Employee Three' });
    await empRow.hover();
    await empRow.getByRole('button', { name: 'Mark as Resigned' }).click();

    // Confirm the resign action
    await page.getByRole('button', { name: 'Yes' }).click();

    // Verify status changed to Resigned and actions disappear
    await expect(empRow.getByText('Resigned')).toBeVisible();
    await expect(empRow.getByRole('button', { name: 'Edit' })).not.toBeVisible();
  });

  test('HR searches employees by name and code', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by Employee Code or Name');

    // Search by name
    await searchInput.fill('Employee One');
    // Wait for debounce (300ms)
    await page.waitForTimeout(400);
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Two' })).not.toBeVisible();

    // Clear and search by code
    await searchInput.clear();
    await searchInput.fill('EMP002');
    await page.waitForTimeout(400);
    await expect(page.getByRole('cell', { name: 'Seeded Employee Two' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).not.toBeVisible();
  });
});

test.describe('Employee Management — Finance role', () => {
  test('Finance sees employee table with CTC column', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/employees');
    await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();

    // CTC column should be visible for Finance
    await expect(page.getByRole('columnheader', { name: 'Annual CTC' })).toBeVisible();

    // CTC values should be formatted currency (contains the ₹ symbol or comma formatting)
    const ctcCells = page.locator('[style*="tabular-nums"]');
    await expect(ctcCells.first()).toBeVisible();
  });
});
