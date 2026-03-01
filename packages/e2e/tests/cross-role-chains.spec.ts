/**
 * Story 4.0b — Tier 3 Cross-Role E2E Test Chains (Epics 1–3)
 * Chain 8 added for Epic 5 (FR18.5 — Timesheet Upload Validation)
 *
 * These tests exercise multi-role user journeys that span role boundaries.
 * Each chain uses role switching via switchRole() (clear cookies + login)
 * and DB verification via the Persist-and-Verify pattern with getDb().
 */
import { test, expect, type Page } from '@playwright/test';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { login, getDb, closeDb, credentials, roleSidebarItems, roleLandingPage, DEFAULT_PASSWORD, TEMP_PASSWORD } from '../helpers/index.js';
import type { Role } from '../helpers/index.js';

/** Clear session and log in as a different role within the same test. */
async function switchRole(page: Page, role: Role): Promise<void> {
  // Use the UI Logout button for a clean session tear-down
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 10000 });
  // Now log in as the new role
  const { email, password } = credentials[role];
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

test.afterAll(async () => {
  await closeDb();
});

// ── Chain 1: T&M Full Lifecycle ───────────────────────────────────
test.describe('Chain 1 — T&M Full Lifecycle', () => {
  const projectName = 'Chain1 T&M Lifecycle Project';

  test('DM creates T&M project → Admin approves → DM adds 2 team members → DB verified', async ({ page }) => {
    test.setTimeout(120_000);
    const db = getDb();

    // ── Step 1: DM creates T&M project ──
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects/new');
    await expect(page.getByRole('heading', { name: /create new project/i })).toBeVisible();

    await page.getByLabel('Project Name').fill(projectName);
    await page.getByLabel('Client').fill('Chain1 Client');
    await page.getByLabel('Vertical').fill('Technology');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-08-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-07-31');
    await page.keyboard.press('Enter');

    // T&M team member section
    await page.locator('input[id="teamMembers.0.role"]').fill('Developer');
    await page.locator('input[id="teamMembers.0.billingRatePaise"]').fill('5000');

    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.locator('.ant-tag').getByText('Pending Approval').first()).toBeVisible();

    // Extract project ID
    const projectId = page.url().split('/projects/')[1];

    // DB verify: project created with PENDING_APPROVAL
    const createdProject = await db.project.findUnique({ where: { id: projectId } });
    expect(createdProject).toBeTruthy();
    expect(createdProject!.status).toBe('PENDING_APPROVAL');
    expect(createdProject!.engagementModel).toBe('TIME_AND_MATERIALS');

    // ── Step 2: Admin approves ──
    await switchRole(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 10000 });

    const row = page.getByRole('row').filter({ hasText: projectName });
    await row.getByRole('button', { name: /approve/i }).click();
    await expect(page.getByRole('cell', { name: projectName })).not.toBeVisible({ timeout: 10000 });

    // DB verify: status = ACTIVE
    const approvedProject = await db.project.findUnique({ where: { id: projectId } });
    expect(approvedProject!.status).toBe('ACTIVE');

    // ── Step 3: DM navigates to detail and adds 2 team members ──
    await switchRole(page, 'DELIVERY_MANAGER');
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await expect(page.locator('.ant-tag').getByText('Active').first()).toBeVisible();

    // Add Employee A (EMP001 — Seeded Employee One)
    await page.getByRole('button', { name: /add team member/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('combobox', { name: /employee/i }).click();
    await page.getByText('Seeded Employee One (EMP001)').click();
    await page.getByLabel('Role on Project').fill('Developer');
    await page.getByLabel('Billing Rate').fill('6000');
    await page.getByRole('button', { name: /add member/i }).click();

    // Wait for member to appear in roster
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible({ timeout: 10000 });

    // Add Employee B (EMP004 — Seeded Employee Four)
    await page.getByRole('button', { name: /add team member/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('combobox', { name: /employee/i }).click();
    await page.getByText('Seeded Employee Four (EMP004)').click();
    await page.getByLabel('Role on Project').fill('QA Lead');
    await page.getByLabel('Billing Rate').fill('5500');
    await page.getByRole('button', { name: /add member/i }).click();

    // Verify both appear in roster
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();

    // DB verify: 2 EmployeeProject rows
    const assignments = await db.employeeProject.findMany({ where: { projectId } });
    expect(assignments.length).toBe(2);

    const emp1 = await db.employee.findFirst({ where: { employeeCode: 'EMP001' } });
    const emp4 = await db.employee.findFirst({ where: { employeeCode: 'EMP004' } });

    const assignA = assignments.find((a) => a.employeeId === emp1!.id);
    const assignB = assignments.find((a) => a.employeeId === emp4!.id);
    expect(assignA).toBeTruthy();
    expect(assignB).toBeTruthy();
    expect(Number(assignA!.billingRatePaise)).toBe(600000); // 6000 * 100
    expect(Number(assignB!.billingRatePaise)).toBe(550000); // 5500 * 100
  });
});

// ── Chain 2: Fixed Cost Full Lifecycle ────────────────────────────
test.describe('Chain 2 — Fixed Cost Full Lifecycle', () => {
  const projectName = 'Chain2 FC Lifecycle Project';

  test('DM creates FC project → Admin approves → Finance sets completion → DB verified', async ({ page }) => {
    test.setTimeout(120_000);
    const db = getDb();

    // ── Step 1: DM creates Fixed Cost project ──
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill(projectName);
    await page.getByLabel('Client').fill('Chain2 Client');
    await page.getByLabel('Vertical').fill('Healthcare');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-09-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-08-31');
    await page.keyboard.press('Enter');

    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Switch to Fixed Cost
    await page.locator('#engagementModel').click();
    await page.locator('.ant-select-item[title="Fixed Cost"]').click();
    await expect(page.getByTestId('fixed-cost-section')).toBeVisible();

    await page.getByLabel('Contract Value').click();
    await page.getByLabel('Contract Value').fill('2000000');

    await page.locator('body').click({ position: { x: 10, y: 10 } });

    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 15000 });

    const projectId = page.url().split('/projects/')[1];

    // DB verify: PENDING_APPROVAL, FIXED_COST
    const created = await db.project.findUnique({ where: { id: projectId } });
    expect(created!.status).toBe('PENDING_APPROVAL');
    expect(created!.engagementModel).toBe('FIXED_COST');

    // ── Step 2: Admin approves ──
    await switchRole(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 10000 });

    const row = page.getByRole('row').filter({ hasText: projectName });
    await row.getByRole('button', { name: /approve/i }).click();
    await expect(page.getByRole('cell', { name: projectName })).not.toBeVisible({ timeout: 10000 });

    // DB verify: ACTIVE
    const approved = await db.project.findUnique({ where: { id: projectId } });
    expect(approved!.status).toBe('ACTIVE');

    // ── Step 3: Finance sets completion to 35% ──
    await switchRole(page, 'FINANCE');
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    const completionSection = page.getByTestId('completion-section');
    await expect(completionSection).toBeVisible();

    const input = completionSection.getByRole('spinbutton');
    await input.fill('35');
    await completionSection.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/completion.*updated/i)).toBeVisible({ timeout: 5000 });

    // DB verify: completionPercent = 0.35
    const updated = await db.project.findUnique({ where: { id: projectId }, select: { completionPercent: true } });
    expect(Number(updated?.completionPercent)).toBeCloseTo(0.35, 2);
  });
});

// ── Chain 3: Rejection-Resubmission ──────────────────────────────
test.describe('Chain 3 — Rejection-Resubmission Chain', () => {
  const projectName = 'Chain3 Reject-Resubmit Project';

  test('DM creates → Admin rejects → DM edits + resubmits → Admin approves → DM assigns member → DB verified at each state', async ({ page }) => {
    test.setTimeout(240_000);
    const db = getDb();

    // ── Step 1: DM creates project ──
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects/new');

    await page.getByLabel('Project Name').fill(projectName);
    await page.getByLabel('Client').fill('Chain3 Client');
    await page.getByLabel('Vertical').fill('Consulting');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-10-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-09-30');
    await page.keyboard.press('Enter');

    await page.locator('input[id="teamMembers.0.role"]').fill('Consultant');
    await page.locator('input[id="teamMembers.0.billingRatePaise"]').fill('7000');

    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 15000 });

    const projectId = page.url().split('/projects/')[1];

    // DB verify: PENDING_APPROVAL
    const created = await db.project.findUnique({ where: { id: projectId } });
    expect(created!.status).toBe('PENDING_APPROVAL');

    // ── Step 2: Admin rejects with comment ──
    await switchRole(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 10000 });

    const row = page.getByRole('row').filter({ hasText: projectName });
    await row.getByRole('button', { name: /reject/i }).click();
    await expect(page.getByText(/reject project/i)).toBeVisible();
    await page.getByPlaceholder(/enter reason for rejection/i).fill('Contract value incorrect');
    await page.getByRole('button', { name: /confirm rejection/i }).click();
    await expect(page.getByRole('cell', { name: projectName })).not.toBeVisible({ timeout: 10000 });

    // DB verify: REJECTED
    const rejected = await db.project.findUnique({ where: { id: projectId } });
    expect(rejected!.status).toBe('REJECTED');
    expect(rejected!.rejectionComment).toBe('Contract value incorrect');

    // ── Step 3: DM sees rejection reason, edits and resubmits ──
    await switchRole(page, 'DELIVERY_MANAGER');
    await page.goto(`/projects/${projectId}`);
    await expect(page.locator('.ant-tag').getByText('Rejected').first()).toBeVisible();
    await expect(page.getByText(/contract value incorrect/i)).toBeVisible();

    await page.getByRole('button', { name: /edit & resubmit/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}/edit`));

    // Modify and resubmit — T&M form requires team member role + billing rate
    const nameInput = page.getByLabel('Project Name');
    await nameInput.clear();
    await nameInput.fill(projectName + ' Revised');
    await page.locator('input[id="teamMembers.0.role"]').fill('Consultant');
    await page.locator('input[id="teamMembers.0.billingRatePaise"]').fill('7000');
    await page.getByRole('button', { name: /resubmit project/i }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}$`), { timeout: 15000 });
    await expect(page.locator('.ant-tag').getByText('Pending Approval').first()).toBeVisible();

    // DB verify: PENDING_APPROVAL again
    const resubmitted = await db.project.findUnique({ where: { id: projectId } });
    expect(resubmitted!.status).toBe('PENDING_APPROVAL');

    // ── Step 4: Admin approves the resubmission ──
    await switchRole(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('cell', { name: projectName + ' Revised' })).toBeVisible({ timeout: 10000 });

    const revisedRow = page.getByRole('row').filter({ hasText: projectName + ' Revised' });
    await revisedRow.getByRole('button', { name: /approve/i }).click();
    await expect(page.getByRole('cell', { name: projectName + ' Revised' })).not.toBeVisible({ timeout: 10000 });

    // DB verify: ACTIVE
    const approved = await db.project.findUnique({ where: { id: projectId } });
    expect(approved!.status).toBe('ACTIVE');

    // ── Step 5: DM assigns a team member ──
    await switchRole(page, 'DELIVERY_MANAGER');
    await page.goto(`/projects/${projectId}`);
    await expect(page.locator('.ant-tag').getByText('Active').first()).toBeVisible();

    await page.getByRole('button', { name: /add team member/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('combobox', { name: /employee/i }).click();
    await page.getByText('Seeded Employee Five (EMP005)').click();
    await page.getByLabel('Role on Project').fill('Project Manager');
    await page.getByLabel('Billing Rate').fill('8000');
    await page.getByRole('button', { name: /add member/i }).click();

    await expect(page.getByRole('cell', { name: 'Seeded Employee Five' })).toBeVisible({ timeout: 10000 });

    // DB verify: EmployeeProject row created
    const emp5 = await db.employee.findFirst({ where: { employeeCode: 'EMP005' } });
    const assignment = await db.employeeProject.findUnique({
      where: { projectId_employeeId: { projectId, employeeId: emp5!.id } },
    });
    expect(assignment).toBeTruthy();
    expect(Number(assignment!.billingRatePaise)).toBe(800000); // 8000 * 100
  });
});

// ── Chain 4: Multi-Member Roster Management ──────────────────────
test.describe('Chain 4 — Multi-Member Roster Management', () => {
  test('Add 3 members → remove 1 → verify 2 → duplicate check → DB verified at each step', async ({ page }) => {
    test.setTimeout(120_000);
    const db = getDb();

    // Use the seeded active T&M project (which already has EMP001 assigned)
    const activeTm = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(activeTm).toBeTruthy();
    const projectId = activeTm!.id;

    // Clean up any existing extra assignments (keep just the seeded EMP001)
    const emp1 = await db.employee.findFirst({ where: { employeeCode: 'EMP001' } });
    await db.employeeProject.deleteMany({
      where: { projectId, NOT: { employeeId: emp1!.id } },
    });

    await login(page, 'DELIVERY_MANAGER');
    await page.goto(`/projects/${projectId}`);
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible({ timeout: 10000 });

    // ── Add Employee B (EMP004) ──
    await page.getByRole('button', { name: /add team member/i }).click();
    await page.getByRole('combobox', { name: /employee/i }).click();
    await page.getByText('Seeded Employee Four (EMP004)').click();
    await page.getByLabel('Role on Project').fill('QA Engineer');
    await page.getByLabel('Billing Rate').fill('4000');
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).toBeVisible({ timeout: 10000 });

    // ── Add Employee C (EMP005) ──
    await page.getByRole('button', { name: /add team member/i }).click();
    await page.getByRole('combobox', { name: /employee/i }).click();
    await page.getByText('Seeded Employee Five (EMP005)').click();
    await page.getByLabel('Role on Project').fill('PM');
    await page.getByLabel('Billing Rate').fill('6000');
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Five' })).toBeVisible({ timeout: 10000 });

    // DB verify: 3 members (EMP001 + EMP004 + EMP005)
    let memberCount = await db.employeeProject.count({ where: { projectId } });
    expect(memberCount).toBe(3);

    // ── Remove Employee B (EMP004) ──
    const emp4Row = page.getByRole('row').filter({ hasText: 'Seeded Employee Four' });
    await emp4Row.getByRole('button', { name: /remove/i }).click();
    // Confirm in the Popconfirm — wait for it to appear, then click the dangerous button within it
    const popconfirm = page.locator('.ant-popconfirm');
    await expect(popconfirm).toBeVisible({ timeout: 5000 });
    await popconfirm.locator('.ant-btn-dangerous, .ant-btn-primary').click();

    // Wait for removal
    await expect(page.getByRole('cell', { name: 'Seeded Employee Four' })).not.toBeVisible({ timeout: 10000 });

    // Verify 2 remain (EMP001 and EMP005)
    await expect(page.getByRole('cell', { name: 'Seeded Employee One' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Seeded Employee Five' })).toBeVisible();

    // DB verify: 2 members
    memberCount = await db.employeeProject.count({ where: { projectId } });
    expect(memberCount).toBe(2);

    // ── Attempt duplicate add of EMP001 (already assigned) ──
    // EMP001 should NOT appear in the dropdown since it's already assigned
    await page.getByRole('button', { name: /add team member/i }).click();
    await page.getByRole('combobox', { name: /employee/i }).click();

    // EMP001 should be filtered out of the dropdown since it's already assigned
    await expect(page.getByText('Seeded Employee One (EMP001)')).not.toBeVisible();

    // Close the dropdown first (it intercepts pointer events on the Cancel button)
    await page.keyboard.press('Escape');
    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();

    // DB verify: still 2 members
    memberCount = await db.employeeProject.count({ where: { projectId } });
    expect(memberCount).toBe(2);
  });
});

// ── Chain 5: Resigned Employee Guard ─────────────────────────────
test.describe('Chain 5 — Resigned Employee Guard', () => {
  test('HR resigns employee → DM tries to add resigned employee → rejected → DB confirms no assignment', async ({ page }) => {
    test.setTimeout(60_000);
    const db = getDb();

    // EMP006 is already seeded as resigned. Verify in DB.
    const resignedEmp = await db.employee.findFirst({ where: { employeeCode: 'EMP006' } });
    expect(resignedEmp).toBeTruthy();
    expect(resignedEmp!.isResigned).toBe(true);

    // Use the seeded active T&M project
    const activeTm = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(activeTm).toBeTruthy();

    // ── DM navigates to project and tries to add resigned employee ──
    await login(page, 'DELIVERY_MANAGER');
    await page.goto(`/projects/${activeTm!.id}`);
    await expect(page.getByText('Team Roster')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /add team member/i }).click();
    await page.getByRole('combobox', { name: /employee/i }).click();

    // Resigned employee should be filtered out of the assignable list
    await expect(page.getByText('Seeded Resigned Employee (EMP006)')).not.toBeVisible();

    // Close the dropdown first (it intercepts pointer events on the Cancel button)
    await page.keyboard.press('Escape');
    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();

    // DB verify: no EmployeeProject row for resigned employee
    const assignment = await db.employeeProject.findUnique({
      where: {
        projectId_employeeId: {
          projectId: activeTm!.id,
          employeeId: resignedEmp!.id,
        },
      },
    });
    expect(assignment).toBeNull();
  });
});

// ── Chain 6: User Lifecycle ──────────────────────────────────────
test.describe('Chain 6 — User Lifecycle', () => {
  test('Admin creates new DM user → first login → forced password change → second login → correct landing page', async ({ page }) => {
    test.setTimeout(120_000);
    const db = getDb();

    const newEmail = 'chain6-newdm@e2e.test';
    const newPassword = 'Chain6Secure1!';

    // ── Step 1: Admin creates new user with mustChangePassword ──
    await login(page, 'ADMIN');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

    await page.getByRole('button', { name: 'Add User' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.getByLabel('Name').fill('Chain6 New DM');
    await modal.getByLabel('Email').fill(newEmail);

    // Select DM role
    await modal.getByRole('combobox', { name: 'Role' }).click();
    await page.getByTitle('Delivery Manager').click();

    await modal.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByRole('cell', { name: 'Chain6 New DM' })).toBeVisible({ timeout: 10000 });

    // DB verify: user created with mustChangePassword = true
    const newUser = await db.user.findUnique({ where: { email: newEmail } });
    expect(newUser).toBeTruthy();
    expect(newUser!.mustChangePassword).toBe(true);
    expect(newUser!.role).toBe('DELIVERY_MANAGER');

    // Set a known password via DB so we can log in (the real temp password was random)
    // NOTE: In production, the password is randomly generated and sent via email.
    // For E2E testing, we set a known password to test the login flow.
    const knownTempPassword = TEMP_PASSWORD;
    const hash = await bcrypt.hash(knownTempPassword, 10);
    await db.user.update({ where: { email: newEmail }, data: { passwordHash: hash } });

    // ── Step 2: New user logs in → forced to change password ──
    // Use UI Logout for clean session tear-down (clearCookies is unreliable with SPA in-memory auth)
    await page.getByRole('button', { name: /log out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await page.getByLabel('Email').fill(newEmail);
    await page.getByLabel('Password').fill(knownTempPassword);
    await page.getByRole('button', { name: 'Log In' }).click();

    // Should be redirected to change password
    await expect(page).toHaveURL(/\/change-password/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Set Your Password' })).toBeVisible();

    // ── Step 3: Set new password ──
    await page.getByLabel('New Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm Password').fill(newPassword);
    await page.getByRole('button', { name: 'Set Password' }).click();

    // Should land on DM landing page (/projects)
    await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });

    // DB verify: mustChangePassword = false now
    const updatedUser = await db.user.findUnique({ where: { email: newEmail } });
    expect(updatedUser!.mustChangePassword).toBe(false);

    // ── Step 4: Log in again with new password → lands on DM page ──
    // Use UI Logout for clean session tear-down
    await page.getByRole('button', { name: /log out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await page.getByLabel('Email').fill(newEmail);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Log In' }).click();

    await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });

    // Verify correct sidebar items for DM role
    const sidebar = page.locator('nav[aria-label="Main navigation"]');
    for (const label of roleSidebarItems['DELIVERY_MANAGER']) {
      await expect(sidebar.getByText(label)).toBeVisible();
    }
  });
});

// ── Chain 7: RBAC Full Traverse ──────────────────────────────────
test.describe('Chain 7 — RBAC Full Traverse', () => {
  // Maps from role to pages they CAN access
  const roleAccessiblePages: Record<Role, { label: string; path: string }[]> = {
    ADMIN: [
      { label: 'User Management', path: '/admin/users' },
      { label: 'System Config', path: '/admin/config' },
      { label: 'Pending Approvals', path: '/admin/pending-approvals' },
      { label: 'Employees', path: '/employees' },
      { label: 'Projects', path: '/projects' },
      { label: 'Upload Center', path: '/uploads' },
      { label: 'Executive Dashboard', path: '/dashboards/executive' },
      { label: 'Department Dashboard', path: '/dashboards/department' },
    ],
    FINANCE: [
      { label: 'Employees', path: '/employees' },
      { label: 'Projects', path: '/projects' },
      { label: 'Upload Center', path: '/uploads' },
      { label: 'Executive Dashboard', path: '/dashboards/executive' },
      { label: 'Department Dashboard', path: '/dashboards/department' },
    ],
    HR: [
      { label: 'Employees', path: '/employees' },
      { label: 'Upload Center', path: '/uploads' },
    ],
    DELIVERY_MANAGER: [
      { label: 'Projects', path: '/projects' },
      { label: 'Department Dashboard', path: '/dashboards/department' },
    ],
    DEPT_HEAD: [
      { label: 'Projects', path: '/projects' },
      { label: 'Department Dashboard', path: '/dashboards/department' },
    ],
  };

  // Maps from role to pages they should be BLOCKED from
  const roleBlockedPages: Record<Role, string[]> = {
    ADMIN: [], // Admin can access everything
    FINANCE: ['/admin/users', '/admin/config', '/admin/pending-approvals'],
    HR: ['/projects', '/admin/users', '/admin/config', '/admin/pending-approvals'],
    DELIVERY_MANAGER: ['/admin/users', '/admin/config', '/admin/pending-approvals', '/employees', '/uploads'],
    DEPT_HEAD: ['/admin/users', '/admin/config', '/admin/pending-approvals', '/employees', '/uploads'],
  };

  for (const role of ['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'] as Role[]) {
    test(`${role} — sidebar shows correct items and accessible pages load`, async ({ page }) => {
      test.setTimeout(120_000);
      await login(page, role);

      // Verify sidebar items match expected
      const sidebar = page.locator('nav[aria-label="Main navigation"]');
      for (const label of roleSidebarItems[role]) {
        await expect(sidebar.getByText(label)).toBeVisible();
      }

      // Verify accessible pages load (navigate to each)
      for (const { path } of roleAccessiblePages[role]) {
        await page.goto(path);
        // Should stay on the page (not be redirected away)
        await expect(page).toHaveURL(new RegExp(path.replace(/\//g, '\\/')), { timeout: 10000 });
      }
    });

    test(`${role} — blocked pages redirect away`, async ({ page }) => {
      test.setTimeout(60_000);
      if (roleBlockedPages[role].length === 0) {
        // Admin has no blocked pages
        return;
      }

      await login(page, role);

      for (const blockedPath of roleBlockedPages[role]) {
        await page.goto(blockedPath);
        // Should be redirected away (not stay on blocked page)
        await expect(page).not.toHaveURL(new RegExp(blockedPath.replace(/\//g, '\\/')), { timeout: 10000 });
      }
    });
  }
});

// ── Chain 8: Timesheet Upload Validation (FR18.5) ─────────────────
test.describe('Chain 8 — Timesheet Upload Validation', () => {
  const projectName = 'Chain8 Upload Validation Project';

  test('DM creates T&M → Admin approves → Finance uploads valid timesheet referencing employee + project → accepted → DB verified', async ({ page }) => {
    test.setTimeout(180_000);
    const db = getDb();

    // Get seeded employee UUID (EMP001 — known to exist in employee master)
    const emp1 = await db.employee.findFirst({ where: { employeeCode: 'EMP001' } });
    expect(emp1).toBeTruthy();

    // ── Step 1: DM creates T&M project ──
    await login(page, 'DELIVERY_MANAGER');
    await page.goto('/projects/new');
    await expect(page.getByRole('heading', { name: /create new project/i })).toBeVisible();

    await page.getByLabel('Project Name').fill(projectName);
    await page.getByLabel('Client').fill('Chain8 Client');
    await page.getByLabel('Vertical').fill('Technology');

    await page.getByLabel('Start Date').click();
    await page.getByLabel('Start Date').fill('2026-07-01');
    await page.keyboard.press('Enter');

    await page.getByLabel('End Date').click();
    await page.getByLabel('End Date').fill('2027-06-30');
    await page.keyboard.press('Enter');

    await page.locator('input[id="teamMembers.0.role"]').fill('Developer');
    await page.locator('input[id="teamMembers.0.billingRatePaise"]').fill('5000');

    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/, { timeout: 15000 });

    const projectId = page.url().split('/projects/')[1];

    // DB verify: PENDING_APPROVAL
    const created = await db.project.findUnique({ where: { id: projectId } });
    expect(created!.status).toBe('PENDING_APPROVAL');

    // ── Step 2: Admin approves ──
    await switchRole(page, 'ADMIN');
    await page.goto('/admin/pending-approvals');
    await expect(page.getByRole('cell', { name: projectName })).toBeVisible({ timeout: 10000 });

    const row = page.getByRole('row').filter({ hasText: projectName });
    await row.getByRole('button', { name: /approve/i }).click();
    await expect(page.getByRole('cell', { name: projectName })).not.toBeVisible({ timeout: 10000 });

    // DB verify: ACTIVE
    const approved = await db.project.findUnique({ where: { id: projectId } });
    expect(approved!.status).toBe('ACTIVE');

    // ── Step 3: Finance uploads valid timesheet ──
    await switchRole(page, 'FINANCE');
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { name: 'Upload Center' })).toBeVisible();

    // Create dynamic XLSX referencing the seeded employee UUID and the new project name
    const timesheetData = [
      { employee_id: emp1!.id, project_name: projectName, hours: 40, period_month: 7, period_year: 2026 },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(timesheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheets');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    // Upload via the timesheet zone
    const timesheetZone = page.getByTestId('upload-zone-timesheet');
    const fileInput = timesheetZone.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'chain8-valid-timesheets.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: xlsxBuffer,
    });

    // Confirmation modal appears (replacement warning)
    const confirmButton = page.getByRole('button', { name: 'Upload & Replace' });
    await expect(confirmButton).toBeVisible({ timeout: 5000 });
    await confirmButton.click();

    // Wait for success alert
    await expect(page.getByText(/timesheet upload successful/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/1 rows imported/i)).toBeVisible();

    // ── DB verify: timesheet entries created ──
    const entries = await db.timesheetEntry.findMany({
      where: {
        employeeId: emp1!.id,
        projectId,
        periodMonth: 7,
        periodYear: 2026,
      },
    });
    expect(entries.length).toBe(1);
    expect(entries[0]!.hours).toBe(40);

    // Verify upload event recorded
    const uploadEvent = await db.uploadEvent.findFirst({
      where: {
        type: 'TIMESHEET',
        status: 'SUCCESS',
        periodMonth: 7,
        periodYear: 2026,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(uploadEvent).toBeTruthy();
    expect(uploadEvent!.rowCount).toBe(1);
  });
});
