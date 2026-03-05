/**
 * Story 8.1 — Project Role Management: Schema & Admin API
 *
 * E2E tests for the /api/v1/project-roles endpoints and the roleId
 * integration in team member assignment. Uses API-level requests
 * (Playwright APIRequestContext) + DB verification.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { getDb, closeDb, credentials } from '../helpers/index.js';

const BASE = 'http://localhost:3000/api/v1';

/** Log in via API and return the JWT token. */
async function getToken(request: APIRequestContext, role: 'ADMIN' | 'FINANCE' | 'DELIVERY_MANAGER'): Promise<string> {
  const creds = credentials[role];
  const res = await request.post(`${BASE}/auth/login`, { data: creds });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return body.data.token;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test.afterAll(async () => {
  await closeDb();
});

test.describe('Project Roles — CRUD API (Admin)', () => {
  // E2E-P1 (API-level): List seeded roles
  test('GET /project-roles returns seeded roles sorted by name', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');
    const res = await request.get(`${BASE}/project-roles`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(5);

    // Should be alphabetically sorted
    const names: string[] = body.data.map((r: { name: string }) => r.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  // E2E-P1 (API-level): active-only filter
  test('GET /project-roles?active=true excludes inactive roles', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');

    const all = await request.get(`${BASE}/project-roles`, {
      headers: authHeaders(token),
    });
    const allBody = await all.json();

    const activeOnly = await request.get(`${BASE}/project-roles?active=true`, {
      headers: authHeaders(token),
    });
    const activeBody = await activeOnly.json();

    const allNames: string[] = allBody.data.map((r: { name: string }) => r.name);
    const activeNames: string[] = activeBody.data.map((r: { name: string }) => r.name);
    expect(allNames).toContain('Deprecated Role');
    expect(activeNames).not.toContain('Deprecated Role');
  });

  // E2E-P2: Create a new role
  test('POST /project-roles creates a new role', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');
    const res = await request.post(`${BASE}/project-roles`, {
      headers: authHeaders(token),
      data: { name: 'Data Engineer' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe('Data Engineer');
    expect(body.data.isActive).toBe(true);

    // Verify via GET
    const listRes = await request.get(`${BASE}/project-roles`, {
      headers: authHeaders(token),
    });
    const list = await listRes.json();
    const names: string[] = list.data.map((r: { name: string }) => r.name);
    expect(names).toContain('Data Engineer');
  });

  // E2E-N1: Duplicate role name
  test('POST /project-roles with duplicate name returns 409', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');
    const res = await request.post(`${BASE}/project-roles`, {
      headers: authHeaders(token),
      data: { name: 'Developer' }, // already seeded
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error.message).toContain('already exists');
  });

  // E2E-N1 (case-insensitive)
  test('POST /project-roles with case-insensitive duplicate returns 409', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');
    const res = await request.post(`${BASE}/project-roles`, {
      headers: authHeaders(token),
      data: { name: 'developer' },
    });
    expect(res.status()).toBe(409);
  });

  // E2E-P3: Deactivate a role
  test('PATCH /project-roles/:id deactivates a role', async ({ request }) => {
    const token = await getToken(request, 'ADMIN');
    const db = getDb();

    const role = await db.projectRole.findFirst({ where: { name: 'Scrum Master' } });
    expect(role).toBeTruthy();

    const res = await request.patch(`${BASE}/project-roles/${role!.id}`, {
      headers: authHeaders(token),
      data: { isActive: false },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.isActive).toBe(false);

    // Verify active-only filter excludes it
    const activeRes = await request.get(`${BASE}/project-roles?active=true`, {
      headers: authHeaders(token),
    });
    const activeBody = await activeRes.json();
    const activeNames: string[] = activeBody.data.map((r: { name: string }) => r.name);
    expect(activeNames).not.toContain('Scrum Master');

    // Reactivate for test isolation
    await request.patch(`${BASE}/project-roles/${role!.id}`, {
      headers: authHeaders(token),
      data: { isActive: true },
    });
  });
});

test.describe('Project Roles — RBAC', () => {
  // E2E-N2: Non-Admin cannot create/update roles
  test('FINANCE user cannot POST /project-roles (403)', async ({ request }) => {
    const token = await getToken(request, 'FINANCE');
    const res = await request.post(`${BASE}/project-roles`, {
      headers: authHeaders(token),
      data: { name: 'Unauthorized Role' },
    });
    expect(res.status()).toBe(403);
  });

  test('FINANCE user can GET /project-roles (200)', async ({ request }) => {
    const token = await getToken(request, 'FINANCE');
    const res = await request.get(`${BASE}/project-roles`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
  });

  test('DELIVERY_MANAGER can GET /project-roles (200)', async ({ request }) => {
    const token = await getToken(request, 'DELIVERY_MANAGER');
    const res = await request.get(`${BASE}/project-roles`, {
      headers: authHeaders(token),
    });
    expect(res.ok()).toBeTruthy();
  });
});

test.describe('Team Member Assignment with roleId', () => {
  // E2E-P5: DM adds team member with valid active role
  test('POST team member with valid roleId succeeds', async ({ request }) => {
    const db = getDb();
    const token = await getToken(request, 'DELIVERY_MANAGER');

    const project = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(project).toBeTruthy();

    const emp = await db.employee.findFirst({ where: { employeeCode: 'EMP004' } });
    expect(emp).toBeTruthy();

    const role = await db.projectRole.findFirst({ where: { name: 'QA Engineer', isActive: true } });
    expect(role).toBeTruthy();

    const res = await request.post(`${BASE}/projects/${project!.id}/team-members`, {
      headers: authHeaders(token),
      data: {
        employeeId: emp!.id,
        roleId: role!.id,
        billingRatePaise: 400000,
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.data.roleId).toBe(role!.id);

    // GET team members should include roleName
    const listRes = await request.get(`${BASE}/projects/${project!.id}/team-members`, {
      headers: authHeaders(token),
    });
    const listBody = await listRes.json();
    const member = listBody.data.find((m: { employeeId: string }) => m.employeeId === emp!.id);
    expect(member).toBeTruthy();
    expect(member.roleName).toBe('QA Engineer');

    // Cleanup
    await request.delete(`${BASE}/projects/${project!.id}/team-members/${emp!.id}`, {
      headers: authHeaders(token),
    });
  });

  // E2E-N3: Adding team member with inactive role fails
  test('POST team member with inactive roleId returns 400', async ({ request }) => {
    const db = getDb();
    const token = await getToken(request, 'DELIVERY_MANAGER');

    const project = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(project).toBeTruthy();

    const emp = await db.employee.findFirst({ where: { employeeCode: 'EMP004' } });
    expect(emp).toBeTruthy();

    const inactiveRole = await db.projectRole.findFirst({ where: { name: 'Deprecated Role', isActive: false } });
    expect(inactiveRole).toBeTruthy();

    const res = await request.post(`${BASE}/projects/${project!.id}/team-members`, {
      headers: authHeaders(token),
      data: {
        employeeId: emp!.id,
        roleId: inactiveRole!.id,
        billingRatePaise: 300000,
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('Invalid or inactive project role');
  });

  // E2E-N3 variant: Non-existent roleId
  test('POST team member with non-existent roleId returns 400', async ({ request }) => {
    const db = getDb();
    const token = await getToken(request, 'DELIVERY_MANAGER');

    const project = await db.project.findFirst({
      where: { name: 'Seeded Active TM Project', status: 'ACTIVE' },
    });
    expect(project).toBeTruthy();

    const emp = await db.employee.findFirst({ where: { employeeCode: 'EMP004' } });
    expect(emp).toBeTruthy();

    const res = await request.post(`${BASE}/projects/${project!.id}/team-members`, {
      headers: authHeaders(token),
      data: {
        employeeId: emp!.id,
        roleId: '00000000-0000-0000-0000-000000000099',
        billingRatePaise: 300000,
      },
    });
    expect(res.status()).toBe(400);
  });
});
