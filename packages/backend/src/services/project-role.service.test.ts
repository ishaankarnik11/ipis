import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { cleanDb, disconnectTestDb } from '../test-utils/db.js';
import * as projectRoleService from './project-role.service.js';

describe('project-role.service', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('createRole', () => {
    it('creates a new role and returns it', async () => {
      const role = await projectRoleService.createRole({ name: 'Data Engineer' });

      expect(role).toMatchObject({
        name: 'Data Engineer',
        isActive: true,
      });
      expect(role.id).toBeDefined();
      expect(role.createdAt).toBeDefined();
    });

    it('throws ConflictError for case-insensitive duplicate', async () => {
      await projectRoleService.createRole({ name: 'Developer' });

      await expect(
        projectRoleService.createRole({ name: 'developer' }),
      ).rejects.toThrow('A designation with this name already exists');
    });

    it('throws ConflictError for exact duplicate', async () => {
      await projectRoleService.createRole({ name: 'Developer' });

      await expect(
        projectRoleService.createRole({ name: 'Developer' }),
      ).rejects.toThrow('A designation with this name already exists');
    });
  });

  describe('getAllRoles', () => {
    it('returns all roles sorted by name ascending', async () => {
      await projectRoleService.createRole({ name: 'Zebra' });
      await projectRoleService.createRole({ name: 'Alpha' });
      await projectRoleService.createRole({ name: 'Middle' });

      const roles = await projectRoleService.getAllRoles();

      expect(roles).toHaveLength(3);
      expect(roles[0].name).toBe('Alpha');
      expect(roles[1].name).toBe('Middle');
      expect(roles[2].name).toBe('Zebra');
    });

    it('returns only active roles when activeOnly=true', async () => {
      await projectRoleService.createRole({ name: 'Active Role' });
      const inactive = await projectRoleService.createRole({ name: 'Inactive Role' });
      await projectRoleService.updateRole(inactive.id, { isActive: false });

      const roles = await projectRoleService.getAllRoles(true);

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('Active Role');
    });

    it('returns both active and inactive when activeOnly is undefined', async () => {
      await projectRoleService.createRole({ name: 'Active Role' });
      const inactive = await projectRoleService.createRole({ name: 'Inactive Role' });
      await projectRoleService.updateRole(inactive.id, { isActive: false });

      const roles = await projectRoleService.getAllRoles();

      expect(roles).toHaveLength(2);
    });
  });

  describe('updateRole', () => {
    it('deactivates a role', async () => {
      const role = await projectRoleService.createRole({ name: 'To Deactivate' });

      const updated = await projectRoleService.updateRole(role.id, { isActive: false });

      expect(updated.isActive).toBe(false);
    });

    it('reactivates a deactivated role', async () => {
      const role = await projectRoleService.createRole({ name: 'To Reactivate' });
      await projectRoleService.updateRole(role.id, { isActive: false });

      const reactivated = await projectRoleService.updateRole(role.id, { isActive: true });

      expect(reactivated.isActive).toBe(true);
    });

    it('throws NotFoundError for non-existent role', async () => {
      await expect(
        projectRoleService.updateRole('00000000-0000-0000-0000-000000000000', { isActive: false }),
      ).rejects.toThrow('Designation not found');
    });
  });

  describe('validateRoleId', () => {
    it('succeeds for active role', async () => {
      const role = await projectRoleService.createRole({ name: 'Valid Role' });

      await expect(projectRoleService.validateRoleId(role.id)).resolves.toBeUndefined();
    });

    it('throws ValidationError for inactive role', async () => {
      const role = await projectRoleService.createRole({ name: 'Inactive' });
      await projectRoleService.updateRole(role.id, { isActive: false });

      await expect(projectRoleService.validateRoleId(role.id)).rejects.toThrow(
        'Invalid or inactive designation',
      );
    });

    it('throws ValidationError for non-existent role', async () => {
      await expect(
        projectRoleService.validateRoleId('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Invalid or inactive designation');
    });
  });
});
