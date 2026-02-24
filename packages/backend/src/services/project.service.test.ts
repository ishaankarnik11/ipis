import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    employee: {
      findUnique: vi.fn(),
    },
    employeeProject: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock email
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock logger
vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { prisma } from '../lib/prisma.js';
import * as projectService from './project.service.js';

const mockProjectCreate = prisma.project.create as ReturnType<typeof vi.fn>;
const mockProjectFindMany = prisma.project.findMany as ReturnType<typeof vi.fn>;
const mockProjectFindUnique = prisma.project.findUnique as ReturnType<typeof vi.fn>;
const mockProjectUpdate = prisma.project.update as ReturnType<typeof vi.fn>;
const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockEmployeeFindUnique = prisma.employee.findUnique as ReturnType<typeof vi.fn>;
const mockEmployeeProjectCreate = prisma.employeeProject.create as ReturnType<typeof vi.fn>;
const mockEmployeeProjectFindUnique = prisma.employeeProject.findUnique as ReturnType<typeof vi.fn>;
const mockEmployeeProjectFindMany = prisma.employeeProject.findMany as ReturnType<typeof vi.fn>;
const mockEmployeeProjectDelete = prisma.employeeProject.delete as ReturnType<typeof vi.fn>;

const dmUser = { id: 'dm-1', role: 'DELIVERY_MANAGER', email: 'dm@test.com' };
const adminUser = { id: 'admin-1', role: 'ADMIN', email: 'admin@test.com' };
const financeUser = { id: 'fin-1', role: 'FINANCE', email: 'fin@test.com' };
const deptHeadUser = { id: 'dh-1', role: 'DEPT_HEAD', email: 'dh@test.com' };

const sampleProject = {
  id: 'proj-1',
  name: 'Test Project',
  client: 'ACME Corp',
  vertical: 'Technology',
  engagementModel: 'FIXED_COST',
  status: 'PENDING_APPROVAL',
  contractValuePaise: BigInt(50000000),
  deliveryManagerId: 'dm-1',
  rejectionComment: null,
  completionPercent: null,
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-12-31'),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('project.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindMany.mockResolvedValue([{ email: 'admin@test.com' }]);
  });

  describe('createProject', () => {
    it('should create a project with PENDING_APPROVAL status and DM as owner', async () => {
      mockProjectCreate.mockResolvedValue(sampleProject);

      const result = await projectService.createProject(
        {
          name: 'Test Project',
          client: 'ACME Corp',
          vertical: 'Technology',
          engagementModel: 'FIXED_COST',
          contractValuePaise: 50000000,
          startDate: '2026-03-01',
          endDate: '2026-12-31',
        },
        dmUser,
      );

      expect(mockProjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deliveryManagerId: 'dm-1',
          }),
        }),
      );
      expect(result.id).toBe('proj-1');
      expect(result.contractValuePaise).toBe(50000000);
    });
  });

  describe('getAll', () => {
    it('should scope DM to own projects only', async () => {
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      await projectService.getAll(dmUser);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryManagerId: 'dm-1' },
        }),
      );
    });

    it('should return all projects for Admin', async () => {
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      await projectService.getAll(adminUser);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should return all projects for Finance', async () => {
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      await projectService.getAll(financeUser);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should scope DEPT_HEAD to their department projects', async () => {
      mockUserFindUnique.mockResolvedValue({ departmentId: 'dept-1' });
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      await projectService.getAll(deptHeadUser);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryManager: { departmentId: 'dept-1' } },
        }),
      );
    });

    it('should fall back to own projects for DEPT_HEAD without department', async () => {
      mockUserFindUnique.mockResolvedValue({ departmentId: null });
      mockProjectFindMany.mockResolvedValue([sampleProject]);

      await projectService.getAll(deptHeadUser);

      expect(mockProjectFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryManagerId: 'dh-1' },
        }),
      );
    });
  });

  describe('getById', () => {
    it('should return project for Admin regardless of ownership', async () => {
      mockProjectFindUnique.mockResolvedValue(sampleProject);

      const result = await projectService.getById('proj-1', adminUser);

      expect(result.id).toBe('proj-1');
    });

    it('should throw ForbiddenError for DM who does not own the project', async () => {
      mockProjectFindUnique.mockResolvedValue(sampleProject);

      await expect(
        projectService.getById('proj-1', { id: 'dm-other', role: 'DELIVERY_MANAGER', email: 'other@test.com' }),
      ).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(projectService.getById('nope', adminUser)).rejects.toThrow('Project not found');
    });
  });

  describe('approveProject', () => {
    it('should atomically set status to ACTIVE via compound where', async () => {
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });
      mockUserFindUnique.mockResolvedValue({ email: 'dm@test.com' });

      await projectService.approveProject('proj-1');

      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1', status: 'PENDING_APPROVAL' },
          data: { status: 'ACTIVE' },
        }),
      );
    });

    it('should throw ValidationError if project is not PENDING_APPROVAL', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockProjectUpdate.mockRejectedValue(prismaError);
      mockProjectFindUnique.mockResolvedValue({ status: 'ACTIVE' });

      await expect(projectService.approveProject('proj-1')).rejects.toThrow(
        'Cannot perform this action: project status is ACTIVE, expected PENDING_APPROVAL',
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockProjectUpdate.mockRejectedValue(prismaError);
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(projectService.approveProject('proj-1')).rejects.toThrow('Project not found');
    });
  });

  describe('rejectProject', () => {
    it('should atomically set status to REJECTED and store comment', async () => {
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });
      mockUserFindUnique.mockResolvedValue({ email: 'dm@test.com' });

      await projectService.rejectProject('proj-1', 'Not enough details');

      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1', status: 'PENDING_APPROVAL' },
          data: { status: 'REJECTED', rejectionComment: 'Not enough details' },
        }),
      );
    });

    it('should throw ValidationError if project is not PENDING_APPROVAL', async () => {
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockProjectUpdate.mockRejectedValue(prismaError);
      mockProjectFindUnique.mockResolvedValue({ status: 'ACTIVE' });

      await expect(projectService.rejectProject('proj-1', 'Reason')).rejects.toThrow(
        'Cannot perform this action: project status is ACTIVE, expected PENDING_APPROVAL',
      );
    });
  });

  describe('updateProject', () => {
    it('should update project for owning DM with REJECTED status', async () => {
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-1',
        status: 'REJECTED',
      });
      mockProjectUpdate.mockResolvedValue({ ...sampleProject, name: 'Updated' });

      const result = await projectService.updateProject('proj-1', { name: 'Updated' }, dmUser);

      expect(result.name).toBe('Updated');
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-other',
        status: 'REJECTED',
      });

      await expect(
        projectService.updateProject('proj-1', { name: 'Updated' }, dmUser),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ValidationError for non-REJECTED project', async () => {
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-1',
        status: 'ACTIVE',
      });

      await expect(
        projectService.updateProject('proj-1', { name: 'Updated' }, dmUser),
      ).rejects.toThrow('Only REJECTED projects can be edited');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        projectService.updateProject('proj-1', { name: 'Updated' }, dmUser),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('resubmitProject', () => {
    it('should atomically set status to PENDING_APPROVAL and clear rejection comment', async () => {
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-1',
      });
      mockProjectUpdate.mockResolvedValue({
        id: 'proj-1',
        name: 'Test Project',
        deliveryManagerId: 'dm-1',
      });

      await projectService.resubmitProject('proj-1', dmUser);

      expect(mockProjectUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1', status: 'REJECTED' },
          data: { status: 'PENDING_APPROVAL', rejectionComment: null },
        }),
      );
    });

    it('should throw ValidationError if project is not REJECTED', async () => {
      mockProjectFindUnique
        .mockResolvedValueOnce({ deliveryManagerId: 'dm-1' })
        .mockResolvedValueOnce({ status: 'ACTIVE' });
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockProjectUpdate.mockRejectedValue(prismaError);

      await expect(projectService.resubmitProject('proj-1', dmUser)).rejects.toThrow(
        'Cannot perform this action: project status is ACTIVE, expected REJECTED',
      );
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      mockProjectFindUnique.mockResolvedValue({
        id: 'proj-1',
        deliveryManagerId: 'dm-other',
      });

      await expect(projectService.resubmitProject('proj-1', dmUser)).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(projectService.resubmitProject('proj-1', dmUser)).rejects.toThrow('Project not found');
    });
  });

  // ── Team Roster Service Tests ──────────────────────────────────────

  const tmProject = {
    id: 'proj-tm',
    deliveryManagerId: 'dm-1',
    engagementModel: 'TIME_AND_MATERIALS',
    status: 'ACTIVE',
  };

  const fcProject = {
    id: 'proj-fc',
    deliveryManagerId: 'dm-1',
    engagementModel: 'FIXED_COST',
    status: 'ACTIVE',
  };

  describe('addTeamMember', () => {
    it('should add a team member and return the record', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      mockEmployeeProjectCreate.mockResolvedValue({
        projectId: 'proj-fc',
        employeeId: 'emp-1',
        role: 'Developer',
        billingRatePaise: null,
        assignedAt: new Date('2026-02-25'),
      });

      const result = await projectService.addTeamMember(
        'proj-fc',
        { employeeId: 'emp-1', role: 'Developer' },
        dmUser,
      );

      expect(result.employeeId).toBe('emp-1');
      expect(result.role).toBe('Developer');
      expect(result.billingRatePaise).toBeNull();
    });

    it('should require billingRatePaise for T&M projects', async () => {
      mockProjectFindUnique.mockResolvedValue(tmProject);

      await expect(
        projectService.addTeamMember(
          'proj-tm',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('billingRatePaise is required for T&M projects');
    });

    it('should accept billingRatePaise for T&M projects', async () => {
      mockProjectFindUnique.mockResolvedValue(tmProject);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      mockEmployeeProjectCreate.mockResolvedValue({
        projectId: 'proj-tm',
        employeeId: 'emp-1',
        role: 'Developer',
        billingRatePaise: BigInt(500000),
        assignedAt: new Date('2026-02-25'),
      });

      const result = await projectService.addTeamMember(
        'proj-tm',
        { employeeId: 'emp-1', role: 'Developer', billingRatePaise: 500000 },
        dmUser,
      );

      expect(result.billingRatePaise).toBe(500000);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      mockProjectFindUnique.mockResolvedValue({
        ...fcProject,
        deliveryManagerId: 'dm-other',
      });

      await expect(
        projectService.addTeamMember(
          'proj-fc',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Access denied');
    });

    it('should throw ConflictError for duplicate assignment (P2002)', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1' });
      const prismaError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      mockEmployeeProjectCreate.mockRejectedValue(prismaError);

      await expect(
        projectService.addTeamMember(
          'proj-fc',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Employee is already assigned to this project');
    });

    it('should throw NotFoundError for non-existent project', async () => {
      mockProjectFindUnique.mockResolvedValue(null);

      await expect(
        projectService.addTeamMember(
          'nope',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError for non-existent employee', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeFindUnique.mockResolvedValue(null);

      await expect(
        projectService.addTeamMember(
          'proj-fc',
          { employeeId: 'emp-none', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Employee not found');
    });

    it('should throw ValidationError for non-ACTIVE project', async () => {
      mockProjectFindUnique.mockResolvedValue({
        ...fcProject,
        status: 'PENDING_APPROVAL',
      });

      await expect(
        projectService.addTeamMember(
          'proj-fc',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Project must be in ACTIVE status');
    });

    it('should throw ValidationError for resigned employee', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeFindUnique.mockResolvedValue({ id: 'emp-1', isResigned: true });

      await expect(
        projectService.addTeamMember(
          'proj-fc',
          { employeeId: 'emp-1', role: 'Developer' },
          dmUser,
        ),
      ).rejects.toThrow('Cannot assign a resigned employee to a project');
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members with employee details', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeProjectFindMany.mockResolvedValue([
        {
          employeeId: 'emp-1',
          role: 'Developer',
          billingRatePaise: BigInt(500000),
          assignedAt: new Date('2026-02-25'),
          employee: { name: 'Alice', designation: 'Senior Dev' },
        },
      ]);

      const result = await projectService.getTeamMembers('proj-fc', dmUser);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
      expect(result[0].designation).toBe('Senior Dev');
      expect(result[0].billingRatePaise).toBe(500000);
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      mockProjectFindUnique.mockResolvedValue({
        ...fcProject,
        deliveryManagerId: 'dm-other',
      });

      await expect(
        projectService.getTeamMembers('proj-fc', dmUser),
      ).rejects.toThrow('Access denied');
    });

    it('should allow Finance user to view team members', async () => {
      mockProjectFindUnique.mockResolvedValue({
        ...fcProject,
        deliveryManagerId: 'dm-other',
      });
      mockEmployeeProjectFindMany.mockResolvedValue([]);

      const result = await projectService.getTeamMembers('proj-fc', financeUser);

      expect(result).toEqual([]);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      mockEmployeeProjectDelete.mockResolvedValue({});

      await projectService.removeTeamMember('proj-fc', 'emp-1', dmUser);

      expect(mockEmployeeProjectDelete).toHaveBeenCalledWith({
        where: {
          projectId_employeeId: { projectId: 'proj-fc', employeeId: 'emp-1' },
        },
      });
    });

    it('should throw ForbiddenError for non-owning DM', async () => {
      mockProjectFindUnique.mockResolvedValue({
        ...fcProject,
        deliveryManagerId: 'dm-other',
      });

      await expect(
        projectService.removeTeamMember('proj-fc', 'emp-1', dmUser),
      ).rejects.toThrow('Access denied');
    });

    it('should throw NotFoundError for non-existent team member', async () => {
      mockProjectFindUnique.mockResolvedValue(fcProject);
      const prismaError = Object.assign(new Error('Record not found'), { code: 'P2025' });
      mockEmployeeProjectDelete.mockRejectedValue(prismaError);

      await expect(
        projectService.removeTeamMember('proj-fc', 'emp-none', dmUser),
      ).rejects.toThrow('Team member not found');
    });
  });
});
