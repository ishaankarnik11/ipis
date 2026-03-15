import { test, expect } from '@playwright/test';
import { login, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

test.describe('Vikram (Delivery Manager) — Daily Workflow Journey', () => {
  test('complete DM journey: dashboard → project detail → team management', async ({ page }) => {
    // Step 1: Login as DM → land on Project Dashboard (consolidated)
    await login(page, 'DELIVERY_MANAGER');
    await expect(page).toHaveURL(/\/dashboards\/projects/);
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/vikram-project-dashboard.png' });

    // Step 2: Verify DM sees the "Create Project" button
    await expect(page.getByRole('button', { name: /create project/i })).toBeVisible();

    // Step 3: Verify DM sees their projects in the dashboard table
    const tmProject = page.getByText('Seeded Active TM Project');
    await expect(tmProject).toBeVisible({ timeout: 10000 });

    // Step 4: Click on project name → navigate to project detail
    await page.getByRole('link', { name: 'Seeded Active TM Project' }).click();
    await expect(page).toHaveURL(/\/projects\//);

    // Verify project detail page shows key fields
    await expect(page.getByText('Gamma Solutions')).toBeVisible(); // client
    await expect(page.getByText('Time & Materials')).toBeVisible(); // engagement model
    await page.screenshot({ path: 'uat-screenshots/vikram-project-detail.png' });

    // Step 5: Verify team roster is visible with existing member
    await expect(page.getByText('Seeded Employee One')).toBeVisible();

    // Step 6: Verify DM can see "Add Team Member" button on their ACTIVE project
    const addBtn = page.getByRole('button', { name: /add team member/i });
    await expect(addBtn).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/vikram-team-roster.png' });

    // Step 7: Navigate to Upload Center → verify DM has access
    await page.getByText('Upload Center').click();
    await expect(page).toHaveURL(/\/uploads/);
    await expect(page.getByRole('heading', { name: /upload center/i })).toBeVisible();

    // Step 8: Verify upload history table is visible
    await expect(page.getByText('Upload History')).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/vikram-upload-center.png' });

    // Step 9: Navigate to Department Dashboard → verify DM has access
    await page.getByText('Dept Dashboard').click();
    await expect(page).toHaveURL(/\/dashboards\/department/);
    await expect(page.getByRole('heading', { name: /department dashboard/i })).toBeVisible();
    await page.screenshot({ path: 'uat-screenshots/vikram-dept-dashboard.png' });

    // CONSEQUENCE: Navigate back to Projects → verify project data still accessible
    await page.getByText('Projects', { exact: true }).click();
    await expect(page).toHaveURL(/\/dashboards\/projects/);
    await expect(page.getByText('Seeded Active TM Project')).toBeVisible();
  });
});
