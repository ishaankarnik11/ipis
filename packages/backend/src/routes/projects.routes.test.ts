import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import type { UserRole } from '@prisma/client';

describe('Project Routes', () => {
  const app = createApp();
  let departments: Map<string, string>;

  beforeEach(async () => {
    await cleanDb();
    departments = await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function loginAs(role: UserRole, overrides: Record<string, unknown> = {}) {
    const user = await createTestUser(role, overrides as Parameters<typeof createTestUser>[1]);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password });
    return { cookies: res.headers['set-cookie'] as string[], user };
  }

  const validCreateBody = {
    name: 'Test Project',
    client: 'ACME Corp',
    vertical: 'Technology',
    engagementModel: 'FIXED_COST' as const,
    contractValuePaise: 50000000,
    startDate: '2026-03-01',
    endDate: '2026-12-31',
  };

  /** Create a project via API and return the response body data */
  async function createProjectAs(cookies: string[], body = validCreateBody) {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', cookies)
      .send(body);
    return res;
  }

  // ── POST /api/v1/projects ──────────────────────────────────────────

  describe('POST /api/v1/projects', () => {
    it('should create project as DM — 201, status PENDING_APPROVAL (AC: 1)', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await createProjectAs(cookies);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING_APPROVAL');
      expect(res.body.data.name).toBe('Test Project');
      expect(res.body.data.client).toBe('ACME Corp');
      expect(res.body.data.engagementModel).toBe('FIXED_COST');
      expect(res.body.data.contractValuePaise).toBe(50000000);
      expect(res.body.data.deliveryManagerName).toBeDefined();
    });

    it('should return 403 for non-DM creating project (AC: 11)', async () => {
      const { cookies } = await loginAs('HR');

      const res = await createProjectAs(cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for Finance creating project', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await createProjectAs(cookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid body (missing name)', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookies)
        .send({ ...validCreateBody, name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when endDate is before startDate', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Cookie', cookies)
        .send({ ...validCreateBody, startDate: '2026-12-31', endDate: '2026-03-01' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should persist model-specific fields for Fixed Cost (budgetPaise)', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await createProjectAs(cookies, {
        ...validCreateBody,
        budgetPaise: 30000000,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.budgetPaise).toBe(30000000);
    });
  });

  // ── POST /api/v1/projects/:id/approve ──────────────────────────────

  describe('POST /api/v1/projects/:id/approve', () => {
    it('should approve project as Admin — status ACTIVE (AC: 4)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/approve`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const dbProject = await prisma.project.findUnique({ where: { id: projectId } });
      expect(dbProject!.status).toBe('ACTIVE');
    });

    it('should return 403 for non-Admin approving project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/approve`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400/404 when approving an already ACTIVE project (status guard)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');

      // First approve
      await request(app)
        .post(`/api/v1/projects/${projectId}/approve`)
        .set('Cookie', adminCookies);

      // Second approve — atomic transition guard
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/approve`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('ACTIVE');
    });
  });

  // ── POST /api/v1/projects/:id/reject ───────────────────────────────

  describe('POST /api/v1/projects/:id/reject', () => {
    it('should reject project with comment — status REJECTED (AC: 5)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: 'Incomplete details' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const dbProject = await prisma.project.findUnique({ where: { id: projectId } });
      expect(dbProject!.status).toBe('REJECTED');
      expect(dbProject!.rejectionComment).toBe('Incomplete details');
    });

    it('should return 400 for empty rejectionComment (AC: 5)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for non-Admin rejecting project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', dmCookies)
        .send({ rejectionComment: 'No reason' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── POST /api/v1/projects/:id/resubmit ─────────────────────────────

  describe('POST /api/v1/projects/:id/resubmit', () => {
    it('should resubmit project — status PENDING_APPROVAL, comment cleared (AC: 6)', async () => {
      // Create → reject → resubmit
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');
      await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: 'Fix it' });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/resubmit`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const dbProject = await prisma.project.findUnique({ where: { id: projectId } });
      expect(dbProject!.status).toBe('PENDING_APPROVAL');
      expect(dbProject!.rejectionComment).toBeNull();
    });

    it('should return 403 for other DM resubmitting', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');
      await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: 'Fix it' });

      const { cookies: otherDmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/resubmit`)
        .set('Cookie', otherDmCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for resubmitting a PENDING_APPROVAL project (wrong status)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/resubmit`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('PENDING_APPROVAL');
    });
  });

  // ── GET /api/v1/projects/:id ───────────────────────────────────────

  describe('GET /api/v1/projects/:id', () => {
    it('should return project for owning DM (AC: 7)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
      expect(res.body.data.name).toBe('Test Project');
    });

    it('should return 403 for DM who does not own the project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: otherDmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherDmCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return project for Admin regardless of ownership', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
    });

    it('should return project for Finance regardless of ownership', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: finCookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', finCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(projectId);
    });

    it('should return 404 for non-existent project', async () => {
      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/projects/00000000-0000-4000-8000-000000000001')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 for HR on project detail', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: hrCookies } = await loginAs('HR');

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Cookie', hrCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── GET /api/v1/projects ───────────────────────────────────────────

  describe('GET /api/v1/projects', () => {
    it('should return DM own projects only (AC: 7)', async () => {
      const { cookies: dm1Cookies, user: dm1 } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const { cookies: dm2Cookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      await createProjectAs(dm1Cookies, { ...validCreateBody, name: 'DM1 Project' });
      await createProjectAs(dm2Cookies, { ...validCreateBody, name: 'DM2 Project' });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', dm1Cookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('DM1 Project');
      expect(res.body.data[0].deliveryManagerId).toBe(dm1.id);
    });

    it('should return all projects for Finance (AC: 8)', async () => {
      const { cookies: dm1Cookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const { cookies: dm2Cookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      await createProjectAs(dm1Cookies, { ...validCreateBody, name: 'DM1 Project' });
      await createProjectAs(dm2Cookies, { ...validCreateBody, name: 'DM2 Project' });

      const { cookies: finCookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', finCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return all projects for Admin (AC: 8)', async () => {
      const { cookies: dm1Cookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      await createProjectAs(dm1Cookies);

      const { cookies: adminCookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 403 for HR on project list', async () => {
      const { cookies: hrCookies } = await loginAs('HR');

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Cookie', hrCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── PATCH /api/v1/projects/:id ─────────────────────────────────────

  describe('PATCH /api/v1/projects/:id', () => {
    it('should allow DM to edit REJECTED project fields', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      // Reject first
      const { cookies: adminCookies } = await loginAs('ADMIN');
      await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: 'Fix name' });

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', dmCookies)
        .send({ name: 'Updated Project Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Project Name');
    });

    it('should reject DM editing non-REJECTED project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', dmCookies)
        .send({ name: 'Changed' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('REJECTED');
    });

    it('should allow Finance to update completionPercent on ACTIVE FC project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');
      await request(app)
        .post(`/api/v1/projects/${projectId}/approve`)
        .set('Cookie', adminCookies);

      const { cookies: finCookies } = await loginAs('FINANCE');

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', finCookies)
        .send({ completionPercent: 0.5 });

      expect(res.status).toBe(200);
      expect(res.body.data.completionPercent).toBe(0.5);
    });

    it('should return 403 for other DM editing REJECTED project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const createRes = await createProjectAs(dmCookies);
      const projectId = createRes.body.data.id;

      const { cookies: adminCookies } = await loginAs('ADMIN');
      await request(app)
        .post(`/api/v1/projects/${projectId}/reject`)
        .set('Cookie', adminCookies)
        .send({ rejectionComment: 'Fix it' });

      const { cookies: otherDmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Cookie', otherDmCookies)
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── Team Roster Routes ─────────────────────────────────────────────

  async function createActiveProject(dmCookies: string[], adminCookies: string[], body = validCreateBody) {
    const createRes = await createProjectAs(dmCookies, body);
    const projectId = createRes.body.data.id;

    await request(app)
      .post(`/api/v1/projects/${projectId}/approve`)
      .set('Cookie', adminCookies);

    return projectId;
  }

  async function seedEmployee(code: string, deptName = 'Engineering') {
    return prisma.employee.create({
      data: {
        employeeCode: code,
        name: `Employee ${code}`,
        departmentId: departments.get(deptName)!,
        designation: 'Developer',
        annualCtcPaise: BigInt(1500000),
      },
    });
  }

  describe('POST /api/v1/projects/:id/team-members', () => {
    it('should add team member as DM — 201 (AC: 1)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toBe(emp.id);
      expect(res.body.data.role).toBe('Developer');
    });

    it('should add team member as Admin — 201 (Admin bypass)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', adminCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(201);
      expect(res.body.data.employeeId).toBe(emp.id);
    });

    it('should return 400 for T&M project without billingRatePaise (AC: 2)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies, {
        ...validCreateBody,
        engagementModel: 'TIME_AND_MATERIALS' as const,
      });
      const emp = await seedEmployee('EMP001');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('billingRatePaise');
    });

    it('should accept billingRatePaise for T&M project', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies, {
        ...validCreateBody,
        engagementModel: 'TIME_AND_MATERIALS' as const,
      });
      const emp = await seedEmployee('EMP001');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer', billingRatePaise: 500000 });

      expect(res.status).toBe(201);
      expect(res.body.data.billingRatePaise).toBe(500000);
    });

    it('should return 403 for other DM project (AC: 6)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const { cookies: otherDmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', otherDmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 409 for duplicate assignment (AC: 8)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      // First assignment
      await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      // Duplicate assignment
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Tester' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should return 403 for HR user (AC: 7)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const { cookies: hrCookies } = await loginAs('HR');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', hrCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for Finance user (AC: 7)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const { cookies: finCookies } = await loginAs('FINANCE');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', finCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 for DEPT_HEAD user (AC: 7)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      const { cookies: dhCookies } = await loginAs('DEPT_HEAD');

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dhCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for resigned employee', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP099',
          name: 'Resigned Worker',
          departmentId: departments.get('Engineering')!,
          designation: 'Dev',
          annualCtcPaise: BigInt(1500000),
          isResigned: true,
        },
      });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent employee', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: '00000000-0000-4000-8000-000000000001', role: 'Developer' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/projects/:id/team-members', () => {
    it('should return team members with employee details (AC: 3)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Employee EMP001');
      expect(res.body.data[0].designation).toBe('Developer');
      expect(res.body.data[0].role).toBe('Developer');
    });

    it('should return team members for Admin (Admin bypass)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return team members for Finance user (Finance access)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);

      const { cookies: finCookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', finCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 403 for HR on team members', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);

      const { cookies: hrCookies } = await loginAs('HR');

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', hrCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/projects/:id/team-members/:employeeId', () => {
    it('should remove team member — 200 (AC: 4)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/team-members/${emp.id}`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify removed from DB
      const members = await prisma.employeeProject.findMany({ where: { projectId } });
      expect(members).toHaveLength(0);
    });

    it('should return 403 for other DM project (AC: 6)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm1@test.com' });
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      const { cookies: otherDmCookies } = await loginAs('DELIVERY_MANAGER', { email: 'dm2@test.com' });

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/team-members/${emp.id}`)
        .set('Cookie', otherDmCookies);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 404 for non-existent team member', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/team-members/00000000-0000-4000-8000-000000000001`)
        .set('Cookie', dmCookies);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should allow Admin to remove team member (Admin bypass)', async () => {
      const { cookies: dmCookies } = await loginAs('DELIVERY_MANAGER');
      const { cookies: adminCookies } = await loginAs('ADMIN');
      const projectId = await createActiveProject(dmCookies, adminCookies);
      const emp = await seedEmployee('EMP001');

      await request(app)
        .post(`/api/v1/projects/${projectId}/team-members`)
        .set('Cookie', dmCookies)
        .send({ employeeId: emp.id, role: 'Developer' });

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/team-members/${emp.id}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
