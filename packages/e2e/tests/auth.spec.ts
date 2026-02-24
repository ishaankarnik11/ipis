import { test, expect } from '@playwright/test';
import { login, roleSidebarItems, roleLandingPage, type Role } from '../helpers/index.js';

test.describe('Login flow', () => {
  test('valid credentials redirect to role landing page', async ({ page }) => {
    await login(page, 'ADMIN');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@e2e.test');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Session & Logout', () => {
  test('authenticated user sees AppLayout with sidebar', async ({ page }) => {
    await login(page, 'HR');
    // AppLayout renders sidebar with role-specific nav items
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByText('E2E HR Manager')).toBeVisible();
  });

  test('logout redirects to login and blocks protected access', async ({ page }) => {
    await login(page, 'ADMIN');
    await expect(page).toHaveURL(/\/admin/);

    // Click logout
    await page.getByRole('button', { name: 'Log Out' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Navigating to a protected route should redirect to login
    await page.goto('/employees');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Role-based sidebar', () => {
  const rolesToTest: Role[] = ['ADMIN', 'HR', 'FINANCE'];

  for (const role of rolesToTest) {
    test(`${role} sees correct sidebar items`, async ({ page }) => {
      await login(page, role);
      const expectedItems = roleSidebarItems[role];

      for (const label of expectedItems) {
        await expect(
          page.getByRole('navigation', { name: 'Main navigation' }).getByText(label),
        ).toBeVisible();
      }
    });
  }
});
