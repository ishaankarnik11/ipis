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

    // Verify imported count — check the Descriptions item for "Imported" shows a count
    await expect(card.getByText('Imported')).toBeVisible();
    // Total Rows and Imported may both be "3", use Descriptions structure
    const importedItem = card.locator('.ant-descriptions-item').filter({ hasText: 'Imported' });
    await expect(importedItem.locator('.ant-descriptions-item-content')).toHaveText('3');
  });

  test('uploads mixed valid/invalid — shows failed count and download button', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(fixturesDir, 'mixed-employees.xlsx'));

    const card = page.getByTestId('upload-confirmation-card');
    await expect(card).toBeVisible({ timeout: 15000 });

    // Should show failures — use exact match to avoid matching "Download Failed Rows"
    const failedItem = card.locator('.ant-descriptions-item').filter({ hasText: /^Failed/ });
    await expect(failedItem).toBeVisible();

    // Download Failed Rows button should be visible
    await expect(card.getByRole('button', { name: 'Download Failed Rows' })).toBeVisible();
  });

  test('downloads sample template', async ({ page }) => {
    // Listen for the download event
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download Sample Template').click();
    const download = await downloadPromise;

    // Verify the download started (file should have xlsx-like name)
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });
});
