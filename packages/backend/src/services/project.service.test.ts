import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import type { CreateProjectInput } from '@ipis/shared';
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

    it('should create project with members atomically', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.projectRole.create({ data: { name: 'Developer' } });

      const result = await projectService.createProject(
        { ...validCreateInput, members: [{ employeeId: emp.id, roleId: role.id, billingRatePaise: 500000 }] },
        dm,
      );

      const members = await prisma.employeeProject.findMany({ where: { projectId: result.id } });
      expect(members).toHaveLength(1);
      expect(members[0]!.employeeId).toBe(emp.id);
      expect(members[0]!.roleId).toBe(role.id);
      expect(Number(members[0]!.billingRatePaise)).toBe(500000);
    });

    it('should create project without members (backward compat)', async () => {
      const dm = await makeDmUser();

      const result = await projectService.createProject(validCreateInput, dm);

      const members = await prisma.employeeProject.findMany({ where: { projectId: result.id } });
      expect(members).toHaveLength(0);
      expect(result.id).toBeDefined();
    });

    it('should reject duplicate employeeId in members array', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.projectRole.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, roleId: role.id }, { employeeId: emp.id, roleId: role.id }] },
          dm,
        ),
      ).rejects.toThrow('Duplicate employee in members array');

      // No project should exist
      const projects = await prisma.project.findMany();
      expect(projects).toHaveLength(0);
    });

    it('should rollback project creation when member has resigned employee', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000), isResigned: true },
      });
      const role = await prisma.projectRole.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, roleId: role.id }] },
          dm,
        ),
      ).rejects.toThrow(/resigned/i);

      const projects = await prisma.project.findMany();
      expect(projects).toHaveLength(0);
    });

    it('should rollback project creation when member has inactive role', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.projectRole.create({ data: { name: 'Inactive Role', isActive: false } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, roleId: role.id }] },
          dm,
        ),
      ).rejects.toThrow('Invalid or inactive project role');

      const projects = await prisma.project.findMany();
      expect(projects).toHaveLength(0);
    });

    it('should require billingRatePaise for T&M project members', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.projectRole.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          {
            name: 'TM Proj', client: 'X', vertical: 'Tech',
            engagementModel: 'TIME_AND_MATERIALS' as const,
            startDate: '2026-03-01', endDate: '2026-12-31',
            members: [{ employeeId: emp.id, roleId: role.id }],
          },
          dm,
        ),
      ).rejects.toThrow('billingRatePaise is required for T&M projects');

      const projects = await prisma.project.findMany();
      expect(projects).toHaveLength(0);
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

    it('should convert budgetPaise BigInt to Number', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      const proj = await projectService.createProject(
        { ...validCreateInput, budgetPaise: 40000000 },
        dm,
      );

      const result = await projectService.getById(proj.id, { id: dm.id, role: 'ADMIN', email: 'admin@test.com' });

      expect(result.budgetPaise).toBe(40000000);
      expect(typeof result.budgetPaise).toBe('number');
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

    it('should persist model-specific fields on update of rejected project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      // Create Infrastructure project, reject it, then update with model-specific fields
      const proj = await projectService.createProject(
        {
          name: 'Infra Project',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'INFRASTRUCTURE',
          vendorCostPaise: 1000000,
          infraCostMode: 'SIMPLE',
          manpowerCostPaise: 500000,
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dm,
      );
      await projectService.rejectProject(proj.id, 'Fix costs');

      const updated = await projectService.updateProject(
        proj.id,
        { vendorCostPaise: 2000000, infraCostMode: 'DETAILED' },
        dm,
      );

      expect(updated.vendorCostPaise).toBe(2000000);
      expect(updated.infraCostMode).toBe('DETAILED');
    });

    it('should ignore model-specific fields that do not match engagement model on update', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();

      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.rejectProject(proj.id, 'Fix it');

      // Try to set slaDescription on a FIXED_COST project — should be ignored
      const updated = await projectService.updateProject(
        proj.id,
        { name: 'Updated', slaDescription: 'should be ignored' },
        dm,
      );

      const dbProj = await prisma.project.findUnique({ where: { id: proj.id } });
      expect(dbProj!.slaDescription).toBeNull();
      expect(updated.name).toBe('Updated');
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

  async function createActiveProject(dm: { id: string; role: string; email: string }, model: string = 'FIXED_COST') {
    await makeAdminUser().catch(() => {}); // may already exist
    const proj = await projectService.createProject(
      { ...validCreateInput, engagementModel: model } as CreateProjectInput,
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

  async function seedProjectRole(name: string = 'Developer'): Promise<string> {
    const role = await prisma.projectRole.create({ data: { name } });
    return role.id;
  }

  describe('addTeamMember', () => {
    it('should add a team member and return the record', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, roleId },
        dm,
      );

      expect(result.employeeId).toBe(emp.id);
      expect(result.roleId).toBe(roleId);
      expect(result.billingRatePaise).toBeNull();
    });

    it('should require billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm),
      ).rejects.toThrow('billingRatePaise is required for T&M projects');
    });

    it('should accept billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, roleId, billingRatePaise: 500000 },
        dm,
      );

      expect(result.billingRatePaise).toBe(500000);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, otherDm),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ConflictError for duplicate assignment (P2002)', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');
      const roleId2 = await seedProjectRole('Tester');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm);

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId: roleId2 }, dm),
      ).rejects.toThrow('Employee is already assigned to this project');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const roleId = await seedProjectRole('Developer');

      await expect(
        projectService.addTeamMember(
          '00000000-0000-4000-8000-000000000001',
          { employeeId: '00000000-0000-4000-8000-000000000002', roleId },
          dm,
        ),
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError for non-existent employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const roleId = await seedProjectRole('Developer');

      await expect(
        projectService.addTeamMember(
          proj.id,
          { employeeId: '00000000-0000-4000-8000-000000000002', roleId },
          dm,
        ),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError for non-ACTIVE project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm),
      ).rejects.toThrow('Project must be in ACTIVE status');
    });

    it('should throw ValidationError for resigned employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const roleId = await seedProjectRole('Developer');
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
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm),
      ).rejects.toThrow('Cannot assign a resigned employee to a project');
    });

    it('should throw ValidationError for inactive roleId', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const role = await prisma.projectRole.create({ data: { name: 'Inactive Role', isActive: false } });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId: role.id }, dm),
      ).rejects.toThrow('Invalid or inactive project role');
    });

    it('should throw ValidationError for non-existent roleId', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      await expect(
        projectService.addTeamMember(
          proj.id,
          { employeeId: emp.id, roleId: '00000000-0000-0000-0000-000000000000' },
          dm,
        ),
      ).rejects.toThrow('Invalid or inactive project role');
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members with employee details and roleName', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm);

      const result = await projectService.getTeamMembers(proj.id, dm);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Employee EMP001');
      expect(result[0].designation).toBe('Developer');
      expect(result[0].roleId).toBe(roleId);
      expect(result[0].roleName).toBe('Developer');
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

  describe('getById — financials', () => {
    async function seedSnapshotsForProject(
      projectId: string,
      userId: string,
      figures: Array<{ figureType: string; valuePaise: bigint }>,
      calculatedAt?: Date,
    ) {
      const uploadEvent = await prisma.uploadEvent.create({
        data: {
          type: 'TIMESHEET',
          status: 'SUCCESS',
          uploadedBy: userId,
          periodMonth: 3,
          periodYear: 2026,
          rowCount: 1,
        },
      });
      const run = await prisma.recalculationRun.create({
        data: {
          uploadEventId: uploadEvent.id,
          projectsProcessed: 1,
          completedAt: calculatedAt ?? new Date(),
        },
      });
      for (const fig of figures) {
        await prisma.calculationSnapshot.create({
          data: {
            recalculationRunId: run.id,
            entityType: 'PROJECT',
            entityId: projectId,
            figureType: fig.figureType,
            periodMonth: 3,
            periodYear: 2026,
            valuePaise: fig.valuePaise,
            breakdownJson: {},
            engineVersion: '1.0.0',
            calculatedAt: calculatedAt ?? new Date(),
          },
        });
      }
    }

    it('should return financials: null when no snapshots exist', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getById(proj.id, dm);

      expect(result.financials).toBeNull();
    });

    it('should return financials object when snapshots exist', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await seedSnapshotsForProject(proj.id, admin.id, [
        { figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(1000000) },
        { figureType: 'EMPLOYEE_COST', valuePaise: BigInt(500000) },
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(2500) },
      ]);

      const result = await projectService.getById(proj.id, dm);

      expect(result.financials).not.toBeNull();
      expect(result.financials!.revenuePaise).toBe(1000000);
      expect(result.financials!.costPaise).toBe(500000);
      expect(result.financials!.profitPaise).toBe(500000);
      expect(result.financials!.marginPercent).toBe(0.25);
    });

    it('should return latest snapshot when multiple exist', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      // Older snapshots
      await seedSnapshotsForProject(proj.id, admin.id, [
        { figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(500000) },
        { figureType: 'EMPLOYEE_COST', valuePaise: BigInt(400000) },
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(1000) },
      ], new Date('2026-01-01'));

      // Newer snapshots
      await seedSnapshotsForProject(proj.id, admin.id, [
        { figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(2000000) },
        { figureType: 'EMPLOYEE_COST', valuePaise: BigInt(800000) },
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(3000) },
      ], new Date('2026-02-01'));

      const result = await projectService.getById(proj.id, dm);

      expect(result.financials!.revenuePaise).toBe(2000000);
      expect(result.financials!.costPaise).toBe(800000);
      expect(result.financials!.profitPaise).toBe(1200000);
      expect(result.financials!.marginPercent).toBe(0.30);
    });

    it('should return number types for financials values (not BigInt)', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await seedSnapshotsForProject(proj.id, admin.id, [
        { figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(1000000) },
        { figureType: 'EMPLOYEE_COST', valuePaise: BigInt(500000) },
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(2500) },
      ]);

      const result = await projectService.getById(proj.id, dm);

      expect(typeof result.financials!.revenuePaise).toBe('number');
      expect(typeof result.financials!.costPaise).toBe('number');
      expect(typeof result.financials!.profitPaise).toBe('number');
      expect(typeof result.financials!.marginPercent).toBe('number');
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm);

      await projectService.removeTeamMember(proj.id, emp.id, dm);

      const members = await projectService.getTeamMembers(proj.id, dm);
      expect(members).toHaveLength(0);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const roleId = await seedProjectRole('Developer');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, roleId }, dm);

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
