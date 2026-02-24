import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

test.describe('User Management (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/admin/users');
    // Wait for user table to load
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  });

  test('lists existing users', async ({ page }) => {
    // Seeded users should appear in the table
    await expect(page.getByRole('cell', { name: 'E2E Admin' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'E2E HR Manager' })).toBeVisible();
  });

  test('adds a new user', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Fill the user form — no password field in this form
    await modal.getByLabel('Name').fill('New Test User');
    await modal.getByLabel('Email').fill('newadded@e2e.test');

    // Select role via combobox
    await modal.getByRole('combobox', { name: 'Role' }).click();
    await page.getByTitle('HR').click();

    // Submit
    await modal.getByRole('button', { name: 'Create User' }).click();

    // Verify user appears in the table
    await expect(page.getByRole('cell', { name: 'New Test User' })).toBeVisible({ timeout: 10000 });
  });

  test('edits user role', async ({ page }) => {
    // Hover over the HR Manager row to reveal action buttons
    const hrRow = page.getByRole('row').filter({ hasText: 'E2E HR Manager' });
    await hrRow.hover();

    // Click Edit
    await hrRow.getByRole('button', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Change the role
    await modal.getByRole('combobox', { name: 'Role' }).click();
    await page.getByTitle('Finance').click();

    // Save
    await modal.getByRole('button', { name: 'Save Changes' }).click();

    // Verify role changed — wait for success message then check table
    await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
  });

  test('deactivates a user', async ({ page }) => {
    // Find the E2E Delivery Manager row
    const dmRow = page.getByRole('row').filter({ hasText: 'E2E Delivery Manager' });
    await dmRow.hover();

    // Click Deactivate
    await dmRow.getByRole('button', { name: 'Deactivate' }).click();

    // Confirm in the modal
    await page.getByRole('button', { name: 'Yes' }).click();

    // Verify status changed to Inactive
    await expect(dmRow.getByText('Inactive')).toBeVisible({ timeout: 10000 });
  });
});
