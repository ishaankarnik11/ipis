import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import * as departmentService from './department.service.js';

describe('department.service', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createDepartment', () => {
    it('should create a department and return it in the list', async () => {
      const dept = await departmentService.createDepartment({ name: 'Engineering' });

      expect(dept.name).toBe('Engineering');
      expect(dept.isActive).toBe(true);
      expect(dept.employeeCount).toBe(0);
      expect(dept.headUserId).toBeNull();

      const all = await departmentService.getAllDepartments();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Engineering');
    });

    it('should reject duplicate names (case-insensitive)', async () => {
      await departmentService.createDepartment({ name: 'Engineering' });

      await expect(
        departmentService.createDepartment({ name: 'engineering' }),
      ).rejects.toThrow('A department with this name already exists');
    });

    it('should assign a department head with DEPT_HEAD role', async () => {
      const deptHead = await createTestUser('DEPT_HEAD');

      const dept = await departmentService.createDepartment({
        name: 'Engineering',
        headUserId: deptHead.id,
      });

      expect(dept.headUserId).toBe(deptHead.id);
    });

    it('should reject non-DEPT_HEAD user as department head', async () => {
      const admin = await createTestUser('ADMIN');

      await expect(
        departmentService.createDepartment({
          name: 'Engineering',
          headUserId: admin.id,
        }),
      ).rejects.toThrow('Department head must have the DEPT_HEAD role');
    });
  });

  describe('getAllDepartments', () => {
    it('should return all departments ordered by name', async () => {
      await departmentService.createDepartment({ name: 'Zebra' });
      await departmentService.createDepartment({ name: 'Alpha' });
      await departmentService.createDepartment({ name: 'Middle' });

      const all = await departmentService.getAllDepartments();
      expect(all.map((d) => d.name)).toEqual(['Alpha', 'Middle', 'Zebra']);
    });

    it('should filter to active-only when requested', async () => {
      const dept = await departmentService.createDepartment({ name: 'ToDeactivate' });
      await departmentService.createDepartment({ name: 'StaysActive' });

      // Directly deactivate in DB since it has no employees
      await prisma.department.update({
        where: { id: dept.id },
        data: { isActive: false },
      });

      const activeOnly = await departmentService.getAllDepartments(true);
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0].name).toBe('StaysActive');

      const all = await departmentService.getAllDepartments();
      expect(all).toHaveLength(2);
    });
  });

  describe('updateDepartment', () => {
    it('should update department name', async () => {
      const dept = await departmentService.createDepartment({ name: 'Old Name' });

      const updated = await departmentService.updateDepartment(dept.id, { name: 'New Name' });
      expect(updated.name).toBe('New Name');

      // Verify persistence
      const fetched = await departmentService.getAllDepartments();
      expect(fetched[0].name).toBe('New Name');
    });

    it('should assign headUserId', async () => {
      const dept = await departmentService.createDepartment({ name: 'Engineering' });
      const deptHead = await createTestUser('DEPT_HEAD');

      const updated = await departmentService.updateDepartment(dept.id, {
        headUserId: deptHead.id,
      });

      expect(updated.headUserId).toBe(deptHead.id);
    });

    it('should reject duplicate name on update', async () => {
      await departmentService.createDepartment({ name: 'Engineering' });
      const dept2 = await departmentService.createDepartment({ name: 'Finance' });

      await expect(
        departmentService.updateDepartment(dept2.id, { name: 'engineering' }),
      ).rejects.toThrow('A department with this name already exists');
    });

    it('should throw NotFoundError for non-existent department', async () => {
      await expect(
        departmentService.updateDepartment('00000000-0000-0000-0000-000000000000', { name: 'Test' }),
      ).rejects.toThrow('Department not found');
    });
  });

  describe('deactivateDepartment', () => {
    it('should soft-delete an empty department', async () => {
      const dept = await departmentService.createDepartment({ name: 'Empty Dept' });

      const deactivated = await departmentService.deactivateDepartment(dept.id);
      expect(deactivated.isActive).toBe(false);

      // Verify it's excluded from active filter
      const activeOnly = await departmentService.getAllDepartments(true);
      expect(activeOnly).toHaveLength(0);
    });

    it('should reject deactivation when department has active employees', async () => {
      const dept = await departmentService.createDepartment({ name: 'With Employees' });

      // Create an employee in this department
      await prisma.employee.create({
        data: {
          name: 'Test Employee',
          employeeCode: 'EMP001',
          designation: 'Engineer',
          departmentId: dept.id,
          annualCtcPaise: BigInt(1200000),
          isResigned: false,
        },
      });

      await expect(
        departmentService.deactivateDepartment(dept.id),
      ).rejects.toThrow('Cannot deactivate department with 1 active employee. Reassign employees first.');
    });

    it('should allow deactivation when all employees are resigned', async () => {
      const dept = await departmentService.createDepartment({ name: 'All Resigned' });

      await prisma.employee.create({
        data: {
          name: 'Resigned Employee',
          employeeCode: 'EMP002',
          designation: 'Engineer',
          departmentId: dept.id,
          annualCtcPaise: BigInt(1200000),
          isResigned: true,
        },
      });

      const deactivated = await departmentService.deactivateDepartment(dept.id);
      expect(deactivated.isActive).toBe(false);
    });

    it('should throw NotFoundError for non-existent department', async () => {
      await expect(
        departmentService.deactivateDepartment('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Department not found');
    });

    it('should throw if department is already inactive', async () => {
      const dept = await departmentService.createDepartment({ name: 'Already Inactive' });
      await departmentService.deactivateDepartment(dept.id);

      await expect(
        departmentService.deactivateDepartment(dept.id),
      ).rejects.toThrow('Department is already inactive');
    });
  });
});
