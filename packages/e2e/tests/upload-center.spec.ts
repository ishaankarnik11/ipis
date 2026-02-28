import { test, expect } from '@playwright/test';
import path from 'path';
import { login } from '../helpers/index.js';

const fixturesDir = path.resolve('fixtures');

test.describe('Upload Center — Zone Visibility', () => {
  // E2E-P1: HR sees salary zone, not timesheet/billing
  test('HR user sees salary zone only', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();

    await expect(page.getByTestId('upload-zone-salary')).toBeVisible();
    await expect(page.getByTestId('upload-zone-timesheet')).not.toBeVisible();
    await expect(page.getByTestId('upload-zone-billing')).not.toBeVisible();
  });

  // E2E-P2: Finance sees timesheet + billing, not salary
  test('Finance user sees timesheet and billing zones, not salary', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();

    await expect(page.getByTestId('upload-zone-timesheet')).toBeVisible();
    await expect(page.getByTestId('upload-zone-billing')).toBeVisible();
    await expect(page.getByTestId('upload-zone-salary')).not.toBeVisible();
  });

  // Admin sees all
  test('Admin user sees all three zones', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();

    await expect(page.getByTestId('upload-zone-timesheet')).toBeVisible();
    await expect(page.getByTestId('upload-zone-billing')).toBeVisible();
    await expect(page.getByTestId('upload-zone-salary')).toBeVisible();
  });

  // E2E-N1: DM redirected away
  test('DM user is redirected away from /uploads', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/uploads');
    await expect(page).not.toHaveURL('/uploads', { timeout: 10000 });
  });
});

test.describe('Upload Center — Salary Upload (HR)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();
  });

  // E2E-P3: HR uploads valid salary xlsx — success state
  test('uploads valid salary .xlsx — shows imported count', async ({ page }) => {
    const salaryZone = page.getByTestId('upload-zone-salary');
    const fileInput = salaryZone.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'uc-valid-employees.xlsx'));

    // Wait for upload confirmation card
    const card = page.getByTestId('upload-confirmation-card');
    await expect(card).toBeVisible({ timeout: 15000 });

    // Verify imported count
    const importedRow = card.getByRole('row').filter({ hasText: 'Imported' });
    await expect(importedRow.getByText('3', { exact: true })).toBeVisible();
  });

  // E2E-P4: HR uploads salary with partial errors — error report button
  test('uploads salary with mixed valid/invalid — shows Download Error Report', async ({ page }) => {
    const salaryZone = page.getByTestId('upload-zone-salary');
    const fileInput = salaryZone.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'uc-mixed-employees.xlsx'));

    // Wait for confirmation card
    const card = page.getByTestId('upload-confirmation-card');
    await expect(card).toBeVisible({ timeout: 15000 });

    // Download Error Report button should be visible
    await expect(page.getByTestId('download-error-report-btn')).toBeVisible();
  });
});

test.describe('Upload Center — Upload History', () => {
  // E2E-P5: Upload history shows seeded records
  test('shows upload history with status tags', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/uploads');
    await expect(page.getByText('Upload History')).toBeVisible();

    // Wait for history data to load (seeded records)
    await expect(page.locator('.ant-tag').first()).toBeVisible({ timeout: 10000 });

    // Should see at least one row with Salary type
    await expect(page.getByRole('cell', { name: 'Salary' }).first()).toBeVisible();
  });
});

test.describe('Upload Center — DataPeriodIndicator', () => {
  // E2E-P6: Data period indicator
  test('shows "Data as of" text', async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/uploads');
    await expect(page.getByTestId('data-period-indicator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('data-period-indicator')).toContainText('Data as of');
  });
});

test.describe('Upload Center — Validation Errors (Finance)', () => {
  // E2E-N2: Invalid timesheet upload — structured error panel
  test('invalid timesheet upload shows validation error panel', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/uploads');

    const timesheetZone = page.getByTestId('upload-zone-timesheet');
    const fileInput = timesheetZone.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'invalid-timesheets.xlsx'));

    // Confirmation modal should appear first
    const confirmButton = page.getByRole('button', { name: 'Upload & Replace' });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Validation error panel should appear
    const errorPanel = page.getByTestId('validation-error-panel');
    await expect(errorPanel).toBeVisible({ timeout: 15000 });
  });
});
