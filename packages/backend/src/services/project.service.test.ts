import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import * as projectService from './project.service.js';

describe('project.service', () => {
  let departments: Map<string, string>;

  // Shared user creators
  async function makeDmUser(deptId?: string) {
    return createTestUser('DELIVERY_MANAGER', {
      email: 'dm@test.com',
      name: 'Test DM',
      departmentId: deptId,
    });
  }

  async function makeAdminUser() {
    return createTestUser('ADMIN', { email: 'admin@test.com', name: 'Test Admin' });
  }

  async function makeFinanceUser() {
    return createTestUser('FINANCE', { email: 'fin@test.com', name: 'Test Finance' });
  }

  async function makeDeptHeadUser(deptId?: string) {
    return createTestUser('DEPT_HEAD', {
      email: 'dh@test.com',
      name: 'Test DH',
      departmentId: deptId,
    });
  }

  const validCreateInput = {
    name: 'Test Project',
    client: 'ACME Corp',
    vertical: 'Technology',
    engagementModel: 'FIXED_COST' as const,
    contractValuePaise: 50000000,
    startDate: '2026-03-01',
    endDate: '2026-12-31',
  };

  beforeEach(async () => {
    await cleanDb();
    departments = await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createProject', () => {
    it('should create a project with PENDING_APPROVAL status and DM as owner', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(validCreateInput, dm);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.deliveryManagerId).toBe(dm.id);
      expect(result.contractValuePaise).toBe(50000000);
    });

    it('should persist slaDescription for AMC projects', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(
        {
          name: 'AMC Project',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'AMC',
          contractValuePaise: 50000000,
          slaDescription: '24/7 support with 4-hour response time',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dm,
      );

      const dbProj = await prisma.project.findUnique({ where: { id: result.id } });
      expect(dbProj!.slaDescription).toBe('24/7 support with 4-hour response time');
    });

    it('should persist vendorCostPaise, manpowerCostPaise, and infraCostMode for Infrastructure SIMPLE projects', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(
        {
          name: 'Infra Project',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'INFRASTRUCTURE',
          vendorCostPaise: 1000000,
          manpowerCostPaise: 500000,
          infraCostMode: 'SIMPLE',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dm,
      );

      const dbProj = await prisma.project.findUnique({ where: { id: result.id } });
      expect(Number(dbProj!.vendorCostPaise)).toBe(1000000);
      expect(Number(dbProj!.manpowerCostPaise)).toBe(500000);
      expect(dbProj!.infraCostMode).toBe('SIMPLE');
    });

    it('should persist infraCostMode DETAILED without manpowerCostPaise for Infrastructure projects', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(
        {
          name: 'Infra Detailed',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'INFRASTRUCTURE',
          vendorCostPaise: 2000000,
          infraCostMode: 'DETAILED',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dm,
      );

      const dbProj = await prisma.project.findUnique({ where: { id: result.id } });
      expect(dbProj!.infraCostMode).toBe('DETAILED');
      expect(Number(dbProj!.vendorCostPaise)).toBe(2000000);
      expect(dbProj!.manpowerCostPaise).toBeNull();
    });

    it('should persist budgetPaise for Fixed Cost projects', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(
        { ...validCreateInput, budgetPaise: 40000000 },
        dm,
      );

      const dbProj = await prisma.project.findUnique({ where: { id: result.id } });
      expect(Number(dbProj!.budgetPaise)).toBe(40000000);
    });
  });

  describe('serializeProject', () => {
    it('should convert new BigInt fields to Number', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      const proj = await projectService.createProject(
        {
          name: 'Infra Project',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'INFRASTRUCTURE',
          vendorCostPaise: 1000000,
          manpowerCostPaise: 500000,
          infraCostMode: 'SIMPLE',
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dm,
      );

      const result = await projectService.getById(proj.id, { id: dm.id, role: 'ADMIN', email: 'admin@test.com' });

      expect(result.vendorCostPaise).toBe(1000000);
      expect(result.manpowerCostPaise).toBe(500000);
      expect(typeof result.vendorCostPaise).toBe('number');
      expect(typeof result.manpowerCostPaise).toBe('number');
    });

    it('should return null for null BigInt fields', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      const proj = await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getById(proj.id, { id: dm.id, role: 'ADMIN', email: 'admin@test.com' });

      expect(result.vendorCostPaise).toBeNull();
      expect(result.manpowerCostPaise).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should scope DM to own projects only', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });
      await projectService.createProject({ ...validCreateInput, name: 'Other Project' }, otherDm);

      const result = await projectService.getAll(dm);

      expect(result).toHaveLength(1);
      expect(result[0].deliveryManagerId).toBe(dm.id);
    });

    it('should return all projects for Admin', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getAll(admin);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should return all projects for Finance', async () => {
      const dm = await makeDmUser();
      const fin = await makeFinanceUser();
      await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getAll(fin);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should scope DEPT_HEAD to their department projects', async () => {
      const engDeptId = departments.get('Engineering')!;
      const dm = await createTestUser('DELIVERY_MANAGER', {
        email: 'dm1@test.com',
        departmentId: engDeptId,
      });
      await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const dh = await makeDeptHeadUser(engDeptId);

      const result = await projectService.getAll(dh);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should fall back to own projects for DEPT_HEAD without department', async () => {
      const dh = await makeDeptHeadUser();
      await makeAdminUser();

      const result = await projectService.getAll(dh);

      expect(result).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return project for Admin regardless of ownership', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getById(proj.id, admin);

      expect(result.id).toBe(proj.id);
    });

    it('should throw ForbiddenError for DM who does not own the project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(projectService.getById(proj.id, otherDm)).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const admin = await makeAdminUser();

      await expect(
        projectService.getById('00000000-0000-4000-8000-000000000001', admin),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('approveProject', () => {
    it('should atomically set status to ACTIVE', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await projectService.approveProject(proj.id);

      const dbProj = await prisma.project.findUnique({ where: { id: proj.id } });
      expect(dbProj!.status).toBe('ACTIVE');
    });

    it('should throw ValidationError if project is not PENDING_APPROVAL', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.approveProject(proj.id);

      await expect(projectService.approveProject(proj.id)).rejects.toThrow(
        'Cannot perform this action: project status is ACTIVE, expected PENDING_APPROVAL',
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      await expect(
        projectService.approveProject('00000000-0000-4000-8000-000000000001'),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('rejectProject', () => {
    it('should atomically set status to REJECTED and store comment', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await projectService.rejectProject(proj.id, 'Not enough details');

      const dbProj = await prisma.project.findUnique({ where: { id: proj.id } });
      expect(dbProj!.status).toBe('REJECTED');
      expect(dbProj!.rejectionComment).toBe('Not enough details');
    });

    it('should throw ValidationError if project is not PENDING_APPROVAL', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.approveProject(proj.id);

      await expect(projectService.rejectProject(proj.id, 'Reason')).rejects.toThrow(
        'Cannot perform this action: project status is ACTIVE, expected PENDING_APPROVAL',
      );
    });
  });

  describe('updateProject', () => {
    it('should update project for owning DM with REJECTED status', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.rejectProject(proj.id, 'Fix it');

      const result = await projectService.updateProject(proj.id, { name: 'Updated' }, dm);

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.rejectProject(proj.id, 'Fix it');

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(
        projectService.updateProject(proj.id, { name: 'Updated' }, otherDm),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ValidationError for non-REJECTED project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await expect(
        projectService.updateProject(proj.id, { name: 'Updated' }, dm),
      ).rejects.toThrow('Only REJECTED projects can be edited');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const dm = await makeDmUser();

      await expect(
        projectService.updateProject('00000000-0000-4000-8000-000000000001', { name: 'Updated' }, dm),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('resubmitProject', () => {
    it('should atomically set status to PENDING_APPROVAL and clear rejection comment', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.rejectProject(proj.id, 'Fix it');

      await projectService.resubmitProject(proj.id, dm);

      const dbProj = await prisma.project.findUnique({ where: { id: proj.id } });
      expect(dbProj!.status).toBe('PENDING_APPROVAL');
      expect(dbProj!.rejectionComment).toBeNull();
    });

    it('should throw ValidationError if project is not REJECTED', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await expect(projectService.resubmitProject(proj.id, dm)).rejects.toThrow(
        'Cannot perform this action: project status is PENDING_APPROVAL, expected REJECTED',
      );
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.rejectProject(proj.id, 'Fix it');

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(projectService.resubmitProject(proj.id, otherDm)).rejects.toThrow(
        'Access denied',
      );
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const dm = await makeDmUser();

      await expect(
        projectService.resubmitProject('00000000-0000-4000-8000-000000000001', dm),
      ).rejects.toThrow('Project not found');
    });
  });

  // ── Team Roster Service Tests ──────────────────────────────────────

  async function createActiveProject(dm: { id: string; role: string; email: string }, model = 'FIXED_COST' as const) {
    await makeAdminUser().catch(() => {}); // may already exist
    const proj = await projectService.createProject(
      { ...validCreateInput, engagementModel: model },
      dm,
    );
    await projectService.approveProject(proj.id);
    return proj;
  }

  async function createTestEmployee(code: string) {
    return prisma.employee.create({
      data: {
        employeeCode: code,
        name: `Employee ${code}`,
        departmentId: departments.get('Engineering')!,
        designation: 'Developer',
        annualCtcPaise: BigInt(1500000),
      },
    });
  }

  describe('addTeamMember', () => {
    it('should add a team member and return the record', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, role: 'Developer' },
        dm,
      );

      expect(result.employeeId).toBe(emp.id);
      expect(result.role).toBe('Developer');
      expect(result.billingRatePaise).toBeNull();
    });

    it('should require billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm),
      ).rejects.toThrow('billingRatePaise is required for T&M projects');
    });

    it('should accept billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, role: 'Developer', billingRatePaise: 500000 },
        dm,
      );

      expect(result.billingRatePaise).toBe(500000);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, otherDm),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ConflictError for duplicate assignment (P2002)', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm);

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Tester' }, dm),
      ).rejects.toThrow('Employee is already assigned to this project');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      await expect(
        projectService.addTeamMember(
          '00000000-0000-4000-8000-000000000001',
          { employeeId: '00000000-0000-4000-8000-000000000002', role: 'Developer' },
          dm,
        ),
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError for non-existent employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);

      await expect(
        projectService.addTeamMember(
          proj.id,
          { employeeId: '00000000-0000-4000-8000-000000000002', role: 'Developer' },
          dm,
        ),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError for non-ACTIVE project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      const emp = await createTestEmployee('EMP001');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm),
      ).rejects.toThrow('Project must be in ACTIVE status');
    });

    it('should throw ValidationError for resigned employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await prisma.employee.create({
        data: {
          employeeCode: 'EMP001',
          name: 'Resigned',
          departmentId: departments.get('Engineering')!,
          designation: 'Developer',
          annualCtcPaise: BigInt(1500000),
          isResigned: true,
        },
      });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm),
      ).rejects.toThrow('Cannot assign a resigned employee to a project');
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members with employee details', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm);

      const result = await projectService.getTeamMembers(proj.id, dm);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Employee EMP001');
      expect(result[0].designation).toBe('Developer');
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(projectService.getTeamMembers(proj.id, otherDm)).rejects.toThrow(
        'Access denied',
      );
    });

    it('should allow Finance user to view team members', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const fin = await makeFinanceUser();

      const result = await projectService.getTeamMembers(proj.id, fin);

      expect(result).toEqual([]);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm);

      await projectService.removeTeamMember(proj.id, emp.id, dm);

      const members = await projectService.getTeamMembers(proj.id, dm);
      expect(members).toHaveLength(0);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, role: 'Developer' }, dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(
        projectService.removeTeamMember(proj.id, emp.id, otherDm),
      ).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError for non-existent team member', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);

      await expect(
        projectService.removeTeamMember(proj.id, '00000000-0000-4000-8000-000000000002', dm),
      ).rejects.toThrow('Team member not found');
    });
  });
});
