import { test, expect } from '@playwright/test';
import path from 'path';
import { login } from '../helpers/index.js';

const fixturesDir = path.resolve('fixtures');

test.describe('Bulk Upload (HR)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'HR');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();
  });

  test('uploads valid .xlsx — shows imported count', async ({ page }) => {
    // Upload the valid employees file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'valid-employees.xlsx'));

    // Wait for upload to complete and confirmation card to appear
    const card = page.getByTestId('upload-confirmation-card');
    await expect(card).toBeVisible({ timeout: 15000 });

    // Verify imported count — Descriptions renders label+value in one cell, so match exact value text
    const importedRow = card.getByRole('row').filter({ hasText: 'Imported' });
    await expect(importedRow.getByText('3', { exact: true })).toBeVisible();
  });

  test('uploads mixed valid/invalid — shows failed count and download button', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'mixed-employees.xlsx'));

    const card = page.getByTestId('upload-confirmation-card');
    await expect(card).toBeVisible({ timeout: 15000 });

    // Should show failures — table row filter only matches Descriptions rows, not button text
    const failedRow = card.getByRole('row').filter({ hasText: 'Failed' });
    await expect(failedRow).toBeVisible();

    // Download Failed Rows button should be visible
    await expect(card.getByRole('button', { name: 'Download Error Report' })).toBeVisible();
  });

  test('downloads sample template', async ({ page }) => {
    // Listen for the download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download Template').click();
    const download = await downloadPromise;

    // Verify the download started (file should have xlsx-like name)
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('rejects non-xlsx file with error message', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'invalid-file.txt'));

    // Should show error and no confirmation card
    await expect(page.getByText('Please upload an .xlsx file only')).toBeVisible();
    await expect(page.getByTestId('upload-confirmation-card')).not.toBeVisible();
  });
});
