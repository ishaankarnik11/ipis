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
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      const result = await projectService.createProject(
        { ...validCreateInput, members: [{ employeeId: emp.id, designationId: role.id, billingRatePaise: 500000 }] },
        dm,
      );

      const members = await prisma.employeeProject.findMany({ where: { projectId: result.id } });
      expect(members).toHaveLength(1);
      expect(members[0]!.employeeId).toBe(emp.id);
      expect(members[0]!.designationId).toBe(role.id);
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
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, designationId: role.id }, { employeeId: emp.id, designationId: role.id }] },
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
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, designationId: role.id }] },
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
      const role = await prisma.designation.create({ data: { name: 'Inactive Role', isActive: false } });

      await expect(
        projectService.createProject(
          { ...validCreateInput, members: [{ employeeId: emp.id, designationId: role.id }] },
          dm,
        ),
      ).rejects.toThrow('Invalid or inactive designation');

      const projects = await prisma.project.findMany();
      expect(projects).toHaveLength(0);
    });

    it('should require billingRatePaise for T&M project members', async () => {
      const dm = await makeDmUser();
      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Alice', departmentId: departments.get('Engineering')!, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      await expect(
        projectService.createProject(
          {
            name: 'TM Proj', client: 'X', vertical: 'Tech',
            engagementModel: 'TIME_AND_MATERIALS' as const,
            startDate: '2026-03-01', endDate: '2026-12-31',
            members: [{ employeeId: emp.id, designationId: role.id }],
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

    it('should return all projects for DM with scope=all', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });
      await projectService.createProject({ ...validCreateInput, name: 'Other Project' }, otherDm);

      // Without scope — DM sees only own
      const ownResult = await projectService.getAll(dm);
      expect(ownResult).toHaveLength(1);

      // With scope=all — DM sees all projects
      const allResult = await projectService.getAll(dm, { scope: 'all' });
      expect(allResult).toHaveLength(2);
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

    it('should scope DEPT_HEAD to projects with employees from their department', async () => {
      const engDeptId = departments.get('Engineering')!;
      const hrDeptId = departments.get('HR')!;
      const dm = await makeDmUser();
      await makeAdminUser();

      // Create two projects
      const proj1 = await projectService.createProject(validCreateInput, dm);
      const proj2 = await projectService.createProject({ ...validCreateInput, name: 'Other Project' }, dm);

      // Approve both
      await projectService.approveProject(proj1.id);
      await projectService.approveProject(proj2.id);

      // Create employees in Engineering and HR departments
      const engEmployee = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Eng Employee', departmentId: engDeptId, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const hrEmployee = await prisma.employee.create({
        data: { employeeCode: 'EMP002', name: 'HR Employee', departmentId: hrDeptId, designation: 'HR', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      // Assign Engineering employee to proj1, HR employee to proj2
      await projectService.addTeamMember(proj1.id, { employeeId: engEmployee.id, designationId: role.id }, dm);
      await projectService.addTeamMember(proj2.id, { employeeId: hrEmployee.id, designationId: role.id }, dm);

      // Engineering DEPT_HEAD should only see proj1
      const dh = await makeDeptHeadUser(engDeptId);
      const result = await projectService.getAll(dh);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(proj1.id);
    });

    it('should not show duplicate projects when multiple dept employees are on same project', async () => {
      const engDeptId = departments.get('Engineering')!;
      const dm = await makeDmUser();
      await makeAdminUser();

      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.approveProject(proj.id);

      // Create two Engineering employees
      const emp1 = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Eng 1', departmentId: engDeptId, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const emp2 = await prisma.employee.create({
        data: { employeeCode: 'EMP002', name: 'Eng 2', departmentId: engDeptId, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.designation.create({ data: { name: 'Developer' } });

      // Assign both to same project
      await projectService.addTeamMember(proj.id, { employeeId: emp1.id, designationId: role.id }, dm);
      await projectService.addTeamMember(proj.id, { employeeId: emp2.id, designationId: role.id }, dm);

      const dh = await makeDeptHeadUser(engDeptId);
      const result = await projectService.getAll(dh);

      expect(result).toHaveLength(1);
    });

    it('should return empty list for DEPT_HEAD with no department employees on any project', async () => {
      const engDeptId = departments.get('Engineering')!;
      const dm = await makeDmUser();
      await makeAdminUser();

      // Create a project but don't assign any Engineering employees
      await projectService.createProject(validCreateInput, dm);

      const dh = await makeDeptHeadUser(engDeptId);
      const result = await projectService.getAll(dh);

      expect(result).toHaveLength(0);
    });

    it('should return empty list for DEPT_HEAD without department', async () => {
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

    it('should allow DM to read any project detail (cross-project visibility per Story 10.6)', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      // DMs have read-only cross-project visibility — no ForbiddenError
      const result = await projectService.getById(proj.id, otherDm);
      expect(result.id).toBe(proj.id);
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const admin = await makeAdminUser();

      await expect(
        projectService.getById('00000000-0000-4000-8000-000000000001', admin),
      ).rejects.toThrow('Project not found');
    });

    it('should allow DEPT_HEAD to access project with department employees', async () => {
      const engDeptId = departments.get('Engineering')!;
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      await projectService.approveProject(proj.id);

      const emp = await prisma.employee.create({
        data: { employeeCode: 'EMP001', name: 'Eng', departmentId: engDeptId, designation: 'Dev', annualCtcPaise: BigInt(1500000) },
      });
      const role = await prisma.designation.create({ data: { name: 'Developer' } });
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId: role.id }, dm);

      const dh = await makeDeptHeadUser(engDeptId);
      const result = await projectService.getById(proj.id, dh);

      expect(result.id).toBe(proj.id);
    });

    it('should throw ForbiddenError for DEPT_HEAD accessing project without department employees', async () => {
      const engDeptId = departments.get('Engineering')!;
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      const dh = await makeDeptHeadUser(engDeptId);

      await expect(projectService.getById(proj.id, dh)).rejects.toThrow('Access denied');
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

  async function seedDesignation(name: string = 'Developer'): Promise<string> {
    const role = await prisma.designation.create({ data: { name } });
    return role.id;
  }

  describe('addTeamMember', () => {
    it('should add a team member and return the record', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, designationId },
        dm,
      );

      expect(result.employeeId).toBe(emp.id);
      expect(result.designationId).toBe(designationId);
      expect(result.billingRatePaise).toBeNull();
    });

    it('should require billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm),
      ).rejects.toThrow('billingRatePaise is required for T&M projects');
    });

    it('should accept billingRatePaise for T&M projects', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm, 'TIME_AND_MATERIALS');
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      const result = await projectService.addTeamMember(
        proj.id,
        { employeeId: emp.id, designationId, billingRatePaise: 500000 },
        dm,
      );

      expect(result.billingRatePaise).toBe(500000);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      const otherDm = await createTestUser('DELIVERY_MANAGER', { email: 'other@test.com' });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, otherDm),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ConflictError for duplicate assignment (P2002)', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');
      const designationId2 = await seedDesignation('Tester');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm);

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId: designationId2 }, dm),
      ).rejects.toThrow('Employee is already assigned to this project');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const designationId = await seedDesignation('Developer');

      await expect(
        projectService.addTeamMember(
          '00000000-0000-4000-8000-000000000001',
          { employeeId: '00000000-0000-4000-8000-000000000002', designationId },
          dm,
        ),
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError for non-existent employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const designationId = await seedDesignation('Developer');

      await expect(
        projectService.addTeamMember(
          proj.id,
          { employeeId: '00000000-0000-4000-8000-000000000002', designationId },
          dm,
        ),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError for non-ACTIVE project', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm),
      ).rejects.toThrow('Project must be in ACTIVE status');
    });

    it('should throw ValidationError for resigned employee', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const designationId = await seedDesignation('Developer');
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
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm),
      ).rejects.toThrow('Cannot assign a resigned employee to a project');
    });

    it('should throw ValidationError for inactive designationId', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const role = await prisma.designation.create({ data: { name: 'Inactive Role', isActive: false } });

      await expect(
        projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId: role.id }, dm),
      ).rejects.toThrow('Invalid or inactive designation');
    });

    it('should throw ValidationError for non-existent designationId', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');

      await expect(
        projectService.addTeamMember(
          proj.id,
          { employeeId: emp.id, designationId: '00000000-0000-0000-0000-000000000000' },
          dm,
        ),
      ).rejects.toThrow('Invalid or inactive designation');
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members with employee details and designationName', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');

      await projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm);

      const result = await projectService.getTeamMembers(proj.id, dm);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Employee EMP001');
      expect(result[0].employeeDesignation).toBe('Developer');
      expect(result[0].designationId).toBe(designationId);
      expect(result[0].designationName).toBe('Developer');
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
      opts: { revenue: number; cost: number; marginBp: number },
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
      await prisma.calculationSnapshot.create({
        data: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          entityId: projectId,
          figureType: 'MARGIN_PERCENT',
          periodMonth: 3,
          periodYear: 2026,
          valuePaise: BigInt(opts.marginBp),
          breakdownJson: { revenue: opts.revenue, cost: opts.cost, profit: opts.revenue - opts.cost },
          engineVersion: '1.0.0',
          calculatedAt: calculatedAt ?? new Date(),
        },
      });
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

      await seedSnapshotsForProject(proj.id, admin.id, { revenue: 1000000, cost: 500000, marginBp: 2500 });

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

      // Older snapshot
      await seedSnapshotsForProject(proj.id, admin.id, { revenue: 500000, cost: 400000, marginBp: 1000 }, new Date('2026-01-01'));
      // Newer snapshot
      await seedSnapshotsForProject(proj.id, admin.id, { revenue: 2000000, cost: 800000, marginBp: 3000 }, new Date('2026-02-01'));

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

      await seedSnapshotsForProject(proj.id, admin.id, { revenue: 1000000, cost: 500000, marginBp: 2500 });

      const result = await projectService.getById(proj.id, dm);

      expect(typeof result.financials!.revenuePaise).toBe('number');
      expect(typeof result.financials!.costPaise).toBe('number');
      expect(typeof result.financials!.profitPaise).toBe('number');
      expect(typeof result.financials!.marginPercent).toBe('number');
    });
  });

  describe('getAll — financials', () => {
    async function seedSnapshotsForProjectList(
      projectId: string,
      userId: string,
      figures: Array<{ figureType: string; valuePaise: bigint; breakdownJson?: Record<string, unknown> }>,
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
            breakdownJson: fig.breakdownJson ?? ({} as any),
            engineVersion: '1.0.0',
            calculatedAt: calculatedAt ?? new Date(),
          },
        });
      }
    }

    it('should return financials: null for projects with no snapshots', async () => {
      const dm = await makeDmUser();
      await makeAdminUser();
      await projectService.createProject(validCreateInput, dm);

      const result = await projectService.getAll(dm);

      expect(result).toHaveLength(1);
      expect(result[0].financials).toBeNull();
    });

    it('should return financials for projects with snapshots', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await seedSnapshotsForProjectList(proj.id, admin.id, [
        { figureType: 'REVENUE_CONTRIBUTION', valuePaise: BigInt(1000000) },
        { figureType: 'EMPLOYEE_COST', valuePaise: BigInt(500000) },
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(2500), breakdownJson: { revenue: 1000000, cost: 500000, profit: 500000 } },
      ]);

      const result = await projectService.getAll(dm);

      expect(result).toHaveLength(1);
      expect(result[0].financials).not.toBeNull();
      expect(result[0].financials!.revenuePaise).toBe(1000000);
      expect(result[0].financials!.costPaise).toBe(500000);
      expect(result[0].financials!.profitPaise).toBe(500000);
      expect(result[0].financials!.marginPercent).toBe(0.25);
    });

    it('should return latest snapshot when multiple exist for same project', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      // Older snapshots
      await seedSnapshotsForProjectList(proj.id, admin.id, [
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(1000), breakdownJson: { revenue: 500000, cost: 400000, profit: 100000 } },
      ], new Date('2026-01-01'));

      // Newer snapshots
      await seedSnapshotsForProjectList(proj.id, admin.id, [
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(3000), breakdownJson: { revenue: 2000000, cost: 800000, profit: 1200000 } },
      ], new Date('2026-02-01'));

      const result = await projectService.getAll(dm);

      expect(result[0].financials!.revenuePaise).toBe(2000000);
      expect(result[0].financials!.costPaise).toBe(800000);
      expect(result[0].financials!.profitPaise).toBe(1200000);
      expect(result[0].financials!.marginPercent).toBe(0.30);
    });

    it('should derive profitPaise from revenue - cost when profit key is missing from breakdownJson', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      // breakdownJson has revenue and cost but NO profit key
      await seedSnapshotsForProjectList(proj.id, admin.id, [
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(2500), breakdownJson: { revenue: 1000000, cost: 750000 } },
      ]);

      const listResult = await projectService.getAll(dm);
      expect(listResult[0].financials!.revenuePaise).toBe(1000000);
      expect(listResult[0].financials!.costPaise).toBe(750000);
      expect(listResult[0].financials!.profitPaise).toBe(250000); // derived: 1000000 - 750000

      const detailResult = await projectService.getById(proj.id, dm);
      expect(detailResult.financials!.profitPaise).toBe(250000); // same fallback in getById
    });

    it('should return financials that match getById for same project', async () => {
      const dm = await makeDmUser();
      const admin = await makeAdminUser();
      const proj = await projectService.createProject(validCreateInput, dm);

      await seedSnapshotsForProjectList(proj.id, admin.id, [
        { figureType: 'MARGIN_PERCENT', valuePaise: BigInt(4000), breakdownJson: { revenue: 1500000, cost: 700000, profit: 800000 } },
      ]);

      const listResult = await projectService.getAll(dm);
      const detailResult = await projectService.getById(proj.id, dm);

      expect(listResult[0].financials!.revenuePaise).toBe(detailResult.financials!.revenuePaise);
      expect(listResult[0].financials!.costPaise).toBe(detailResult.financials!.costPaise);
      expect(listResult[0].financials!.profitPaise).toBe(detailResult.financials!.profitPaise);
      expect(listResult[0].financials!.marginPercent).toBe(detailResult.financials!.marginPercent);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm);

      await projectService.removeTeamMember(proj.id, emp.id, dm);

      const members = await projectService.getTeamMembers(proj.id, dm);
      expect(members).toHaveLength(0);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      const dm = await makeDmUser();
      const proj = await createActiveProject(dm);
      const emp = await createTestEmployee('EMP001');
      const designationId = await seedDesignation('Developer');
      await projectService.addTeamMember(proj.id, { employeeId: emp.id, designationId }, dm);

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
