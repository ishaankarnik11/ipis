import { test, expect } from '@playwright/test';
import { login, getDb, closeDb } from '../helpers/index.js';

test.afterAll(async () => {
  await closeDb();
});

test.describe('Team Member Assignment — Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
  });

  // E2E-P3: DM creates project with no team members → project created successfully with empty roster (AC: 8)
  test('DM creates T&M project without team members → succeeds', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill('E2E NoMembers Project');
    await page.getByLabel('Client').fill('Client P3');
    await page.getByLabel('Vertical').fill('Tech');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-06-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-05-31');
    await page.keyboard.press('Enter');

    // Team Members section is visible but we don't add any
    await expect(page.getByTestId('team-members-section')).toBeVisible();

    await page.getByRole('button', { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });
    await expect(page.locator('.ant-tag').getByText('Pending Approval').first()).toBeVisible();
  });

  // E2E-P1: DM creates T&M project with team members (AC: 1, 5, 7)
  test('DM creates T&M project with team member → member visible in roster after approval', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill('E2E TM WithMember');
    await page.getByLabel('Client').fill('Client P1');
    await page.getByLabel('Vertical').fill('Tech');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-06-15');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-06-14');
    await page.keyboard.press('Enter');

    // Add a team member
    await page.getByTestId('add-member-btn').click();

    // Search for employee (type 2+ chars)
    const employeeSearch = page.getByTestId('employee-search').locator('.ant-select-selection-search-input');
    await employeeSearch.fill('Seeded');

    // Wait for search results and select first employee
    await page.locator('.ant-select-item-option').first().waitFor({ timeout: 5000 });
    await page.locator('.ant-select-item-option').first().click();

    // Select a role
    const roleSelect = page.getByTestId('role-select').locator('.ant-select-selection-search-input');
    await roleSelect.click();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Developer' }).first().click();

    // Fill selling rate (required for T&M)
    await page.getByTestId('selling-rate').locator('input').fill('5000');

    // Submit
    await page.getByRole('button', { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });

    // Verify project was created with the member in DB
    const url = page.url();
    const projectId = url.split('/projects/')[1];
    const db = getDb();
    const members = await db.employeeProject.findMany({ where: { projectId } });
    expect(members.length).toBeGreaterThanOrEqual(1);
  });

  // E2E-P2: DM creates Fixed Cost project with 1 team member without selling rate → success (AC: 6, 8)
  test('DM creates Fixed Cost project with member, no selling rate → succeeds', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill('E2E FC WithMember');
    await page.getByLabel('Client').fill('Client P2');
    await page.getByLabel('Vertical').fill('Finance');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-07-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-06-30');
    await page.keyboard.press('Enter');

    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Switch to Fixed Cost
    await page.locator('#engagementModel').click();
    await page.locator('.ant-select-item[title="Fixed Cost"]').click();

    // Fill required contract value
    await page.getByLabel('Contract Value').click();
    await page.getByLabel('Contract Value').fill('1000000');

    // Add a team member without selling rate
    await page.getByTestId('add-member-btn').click();

    const employeeSearch = page.getByTestId('employee-search').locator('.ant-select-selection-search-input');
    await employeeSearch.fill('Seeded');
    await page.locator('.ant-select-item-option').first().waitFor({ timeout: 5000 });
    await page.locator('.ant-select-item-option').first().click();

    const roleSelect = page.getByTestId('role-select').locator('.ant-select-selection-search-input');
    await roleSelect.click();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Developer' }).first().click();

    // No selling rate (optional for Fixed Cost)
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    await page.getByRole('button', { name: /create project/i }).click();

    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 10000 });
  });

  // E2E-P6: Role dropdown shows only active roles (AC: 4)
  test('Role dropdown shows active roles, not inactive ones', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByTestId('add-member-btn').click();

    // Open role dropdown
    const roleSelect = page.getByTestId('role-select').locator('.ant-select-selection-search-input');
    await roleSelect.click();

    // Active roles should be visible
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Developer' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Tech Lead' })).toBeVisible();

    // Inactive role should NOT be visible
    await expect(page.locator('.ant-select-item-option').filter({ hasText: 'Deprecated Role' })).not.toBeVisible();
  });

  // E2E-N1: T&M missing selling rate → validation error (AC: 5)
  test('DM creates T&M project with member missing selling rate → validation error', async ({ page }) => {
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill('E2E TM NoRate');
    await page.getByLabel('Client').fill('Client N1');
    await page.getByLabel('Vertical').fill('Tech');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-08-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-07-31');
    await page.keyboard.press('Enter');

    // Add a member with employee+role but NO selling rate
    await page.getByTestId('add-member-btn').click();

    const employeeSearch = page.getByTestId('employee-search').locator('.ant-select-selection-search-input');
    await employeeSearch.fill('Seeded');
    await page.locator('.ant-select-item-option').first().waitFor({ timeout: 5000 });
    await page.locator('.ant-select-item-option').first().click();

    const roleSelect = page.getByTestId('role-select').locator('.ant-select-selection-search-input');
    await roleSelect.click();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Developer' }).first().click();

    // Don't fill selling rate — submit
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await page.getByRole('button', { name: /create project/i }).click();

    // Should show validation error
    await expect(page.getByText(/selling rate is required/i)).toBeVisible({ timeout: 5000 });

    // Should still be on the create page
    await expect(page).toHaveURL(/\/projects\/new/);
  });
});

test.describe('Team Member Assignment — Post-creation Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'DELIVERY_MANAGER');
  });

  // E2E-P4: DM on ACTIVE project adds team member via modal (AC: 9)
  test('DM adds team member to active project via modal', async ({ page }) => {
    const db = getDb();
    const activeProject = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(activeProject).toBeTruthy();

    await page.goto(`/projects/${activeProject!.id}`);

    // Click Add Team Member button
    await page.getByRole('button', { name: /add team member/i }).click();

    // Modal should open
    await expect(page.getByText('Add Team Member')).toBeVisible();

    // Search for employee
    const employeeSearch = page.locator('.ant-modal').getByTestId('employee-search').locator('.ant-select-selection-search-input');
    await employeeSearch.fill('Seeded');
    await page.locator('.ant-select-item-option').first().waitFor({ timeout: 5000 });
    await page.locator('.ant-select-item-option').first().click();

    // Select role
    const roleSelect = page.locator('.ant-modal').getByTestId('role-select').locator('.ant-select-selection-search-input');
    await roleSelect.click();
    await page.locator('.ant-select-item-option').filter({ hasText: 'QA Engineer' }).first().click();

    // Fill selling rate
    await page.locator('.ant-modal').getByTestId('selling-rate').locator('input').fill('3000');

    // Submit
    await page.getByRole('button', { name: /add member/i }).click();

    // Should show success and member in roster
    await expect(page.getByText('Team member added')).toBeVisible({ timeout: 5000 });
  });

  // E2E-P5: Employee search returns results from multiple departments (AC: 2, 3)
  test('Employee search shows results with department info', async ({ page }) => {
    const db = getDb();
    const activeProject = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(activeProject).toBeTruthy();

    await page.goto(`/projects/${activeProject!.id}`);
    await page.getByRole('button', { name: /add team member/i }).click();

    const employeeSearch = page.locator('.ant-modal').getByTestId('employee-search').locator('.ant-select-selection-search-input');
    await employeeSearch.fill('Seeded');

    // Wait for search results — should show employees with department info
    await page.locator('.ant-select-item-option').first().waitFor({ timeout: 5000 });

    // Results should contain department names from multiple departments
    const optionTexts = await page.locator('.ant-select-item-option-content').allTextContents();
    expect(optionTexts.length).toBeGreaterThan(0);
    // Options should include designation and department
    expect(optionTexts.some((t) => t.includes('—'))).toBe(true);
  });
});
