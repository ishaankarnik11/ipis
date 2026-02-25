import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

test.describe('System Configuration (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/admin/config');
    await expect(page.getByRole('heading', { name: 'System Configuration' })).toBeVisible();
  });

  test('displays current configuration values', async ({ page }) => {
    // Seeded values: standardMonthlyHours=176, healthyMargin=0.2, atRisk=0.05
    await expect(page.getByLabel('Standard Monthly Hours')).toHaveValue('176');
    await expect(page.getByLabel('Healthy Margin Threshold (%)')).toBeVisible();
    await expect(page.getByLabel('At-Risk Margin Threshold (%)')).toBeVisible();
  });

  test('modifies and saves configuration', async ({ page }) => {
    // Use ArrowDown key — natively handled by Ant Design InputNumber, triggers proper onChange
    const hoursInput = page.getByLabel('Standard Monthly Hours');
    await expect(hoursInput).toHaveValue('176');

    await hoursInput.focus();
    await page.keyboard.press('ArrowDown'); // 176 → 175
    await expect(hoursInput).toHaveValue('175');

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('System configuration updated')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel('Standard Monthly Hours')).toHaveValue('175');

    // Restore original: ArrowUp back to 176
    await page.getByLabel('Standard Monthly Hours').focus();
    await page.keyboard.press('ArrowUp');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('System configuration updated')).toBeVisible();
  });
});
