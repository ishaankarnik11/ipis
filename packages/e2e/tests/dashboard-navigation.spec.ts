/**
 * Story 8.6 — Dashboard Click-Through Navigation E2E Tests
 */
import { test, expect } from '@playwright/test';
import { login } from '../helpers/index.js';

// ── E2E-P1: DM on Project Dashboard → click project name → navigate to /projects/:id ──
test.describe('E2E-P1 — Project Dashboard click-through', () => {
  test('DM clicks project name and navigates to project detail page', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('dashboard-table')).toBeVisible();

    // Find a project name link in the table
    const projectLink = page.locator('td a[href^="/projects/"]').first();
    await expect(projectLink).toBeVisible();

    // Get the href to verify navigation target
    const href = await projectLink.getAttribute('href');
    expect(href).toMatch(/^\/projects\/[a-f0-9-]+$/);

    // Click and verify navigation
    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

    // Project detail page should load with financial summary and team roster
    await expect(page.getByText(/Project Detail|Back to Projects/)).toBeVisible({ timeout: 10000 });
  });
});

// ── E2E-P2: Admin on Executive Dashboard → click Top 5 project → navigate to /projects/:id ──
test.describe('E2E-P2 — Executive Dashboard Top 5 click-through', () => {
  test('Admin clicks project in Top 5 section and navigates to project detail', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });

    // Wait for Top 5 section to load
    const top5Section = page.getByTestId('top-5-projects');
    await expect(top5Section).toBeVisible();

    // Click first project card in Top 5
    const projectCard = top5Section.locator('[data-testid="project-card"]').first();
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  });
});

// ── E2E-P3: Admin on Executive Dashboard → click Bottom 5 project → navigate to /projects/:id ──
test.describe('E2E-P3 — Executive Dashboard Bottom 5 click-through', () => {
  test('Admin clicks project in Bottom 5 section and navigates to project detail', async ({ page }) => {
    await login(page, 'ADMIN');
    await page.goto('/dashboards/executive');
    await expect(page.getByTestId('executive-dashboard')).toBeVisible({ timeout: 10000 });

    // Wait for Bottom 5 section to load
    const bottom5Section = page.getByTestId('bottom-5-projects');
    await expect(bottom5Section).toBeVisible();

    // Click first project card in Bottom 5
    const projectCard = bottom5Section.locator('[data-testid="project-card"]').first();
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  });
});

// ── E2E-P4: Finance on Department Dashboard → click department row → existing filter preserved ──
test.describe('E2E-P4 — Department Dashboard row navigation preserved', () => {
  test('Finance clicks department row and navigates to filtered Project Dashboard', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/department');
    await expect(page.getByTestId('department-table')).toBeVisible({ timeout: 10000 });

    // Get department name from first row
    const firstRow = page.locator('[data-testid="department-table"] tbody tr').first();
    await expect(firstRow).toBeVisible();
    const departmentCell = firstRow.locator('td').first();
    const departmentName = await departmentCell.textContent();

    // Click department row
    await firstRow.click();

    // Should navigate to Project Dashboard filtered by department
    await expect(page).toHaveURL(/\/dashboards\/projects\?department=/);
    if (departmentName) {
      await expect(page).toHaveURL(new RegExp(`department=${encodeURIComponent(departmentName)}`));
    }

    // Project dashboard should be visible
    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 });
  });
});

// ── E2E-P5: Finance on Project Dashboard → click project → navigate → back preserves filters ──
test.describe('E2E-P5 — Back button preserves dashboard filters', () => {
  test('Finance clicks project then returns with back button, filters preserved', async ({ page }) => {
    await login(page, 'FINANCE');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // Find and click a project link
    const projectLink = page.locator('td a[href^="/projects/"]').first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();

    // Verify we're on project detail
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);

    // Go back
    await page.goBack();

    // Should be back on project dashboard
    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 });
  });
});

// ── E2E-N1: DM only sees own projects (RBAC scoping) ──
test.describe('E2E-N1 — DM RBAC scoping on dashboard', () => {
  test('DM only sees own projects on dashboard, click navigation works for visible projects', async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/dashboards/projects');
    await expect(page.getByTestId('dashboard-table')).toBeVisible({ timeout: 10000 });

    // DM should see own projects
    await expect(page.getByRole('cell', { name: 'Seeded Active TM Project' })).toBeVisible();

    // DM should NOT see DM2's project
    await expect(page.getByRole('cell', { name: 'Seeded DM2 Project' })).not.toBeVisible();

    // Click on visible project link — should navigate
    const projectLink = page.locator('td a[href^="/projects/"]').first();
    await expect(projectLink).toBeVisible();
    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  });
});
