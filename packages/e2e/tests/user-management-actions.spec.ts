import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

test.describe('User Management — Active User Actions (Story 9.8)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    // Wait for table data to load
    await expect(page.getByRole('cell', { name: 'E2E Admin' })).toBeVisible({ timeout: 10000 });
  });

  // E2E-P1: Active users show Edit and Deactivate buttons
  test('active users show Edit and Deactivate buttons', async ({ page }) => {
    // HR Manager is an active user
    const hrRow = page.getByRole('row').filter({ hasText: 'E2E HR Manager' });
    await hrRow.hover();

    await expect(hrRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(hrRow.getByRole('button', { name: 'Deactivate' })).toBeVisible();
  });

  // E2E-P2: Admin clicks Edit → modal opens pre-populated → changes role → saves
  test('Edit modal opens with pre-populated data and saves changes', async ({ page }) => {
    const hrRow = page.getByRole('row').filter({ hasText: 'E2E HR Manager' });
    await hrRow.hover();
    await hrRow.getByRole('button', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Verify pre-populated fields
    await expect(modal.getByLabel('Name')).toHaveValue('E2E HR Manager');
    // Email should be read-only (disabled)
    await expect(modal.getByLabel('Email')).toBeDisabled();

    // Change the role
    await modal.getByRole('combobox', { name: 'Role' }).click();
    await page.getByTitle('Finance').click();

    // Save
    await modal.getByRole('button', { name: 'Save Changes' }).click();

    // Verify success
    await expect(page.getByText('User updated successfully')).toBeVisible({ timeout: 10000 });
  });

  // E2E-P3: Admin clicks Deactivate → Popconfirm → confirms → user deactivated
  test('Deactivate shows Popconfirm and deactivates user on confirm', async ({ page }) => {
    // Use DM2 so we don't break other tests that depend on E2E Delivery Manager
    const dmCell = page.getByRole('cell', { name: 'dm2@e2e.test', exact: true });
    const dmRow = page.getByRole('row').filter({ has: dmCell });
    await dmRow.hover();

    await dmRow.getByRole('button', { name: 'Deactivate' }).click();

    // Popconfirm should appear with warning text
    await expect(page.getByText(/are you sure you want to deactivate/i)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Yes' }).click();

    // Verify status changed to Inactive and Activate button appears
    await expect(dmRow.getByText('Inactive')).toBeVisible({ timeout: 10000 });
  });

  // E2E-P4 / E2E-N1: Admin's own row has Edit but NOT Deactivate
  test('logged-in admin row has Edit but no Deactivate button', async ({ page }) => {
    const adminRow = page.getByRole('row').filter({ hasText: 'E2E Admin' });
    await adminRow.hover();

    await expect(adminRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    // Deactivate button should NOT exist for the logged-in admin
    await expect(adminRow.getByRole('button', { name: 'Deactivate' })).not.toBeVisible();
  });

  // E2E-N2: Non-Admin cannot access User Management actions
  test('non-admin cannot access User Management', async ({ page }) => {
    // Login as Finance user
    await login(page, 'FINANCE');
    await page.goto('/admin/users');

    // Should be redirected or see access denied — Finance users don't have User Management in sidebar
    await expect(page.getByRole('heading', { name: 'User Management' })).not.toBeVisible({ timeout: 5000 });
  });

  // E2E-N3: Admin edits user with empty name → validation error
  test('Edit modal blocks save with empty name', async ({ page }) => {
    const hrRow = page.getByRole('row').filter({ hasText: 'E2E HR Manager' });
    await hrRow.hover();
    await hrRow.getByRole('button', { name: 'Edit' }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Clear the name
    await modal.getByLabel('Name').clear();
    // Trigger validation by clicking outside the name field
    await modal.getByLabel('Email').click();

    // Validation error should appear
    await expect(modal.getByText('Name is required')).toBeVisible({ timeout: 5000 });
  });
});
