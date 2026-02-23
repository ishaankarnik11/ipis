import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema, systemConfigSchema } from './user.schema';

describe('createUserSchema', () => {
  it('should accept valid user data with all fields', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'ADMIN',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid user data without optional departmentId', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'FINANCE',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null departmentId', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'HR',
      departmentId: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing name', () => {
    const result = createUserSchema.safeParse({
      email: 'jane@example.com',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createUserSchema.safeParse({
      name: '',
      email: 'jane@example.com',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane',
      email: 'not-an-email',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid role', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane',
      email: 'jane@example.com',
      role: 'SUPERUSER',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid roles', () => {
    const roles = ['ADMIN', 'FINANCE', 'HR', 'DELIVERY_MANAGER', 'DEPT_HEAD'];
    for (const role of roles) {
      const result = createUserSchema.safeParse({
        name: 'Jane',
        email: 'jane@example.com',
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject non-UUID departmentId', () => {
    const result = createUserSchema.safeParse({
      name: 'Jane',
      email: 'jane@example.com',
      role: 'ADMIN',
      departmentId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('should accept partial update with name only', () => {
    const result = updateUserSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with role only', () => {
    const result = updateUserSchema.safeParse({ role: 'HR' });
    expect(result.success).toBe(true);
  });

  it('should accept isActive field', () => {
    const result = updateUserSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (no fields to update)', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept all fields together', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated',
      role: 'FINANCE',
      departmentId: '550e8400-e29b-41d4-a716-446655440000',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid role', () => {
    const result = updateUserSchema.safeParse({ role: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should reject non-boolean isActive', () => {
    const result = updateUserSchema.safeParse({ isActive: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('systemConfigSchema', () => {
  it('should accept valid config with all fields', () => {
    const result = systemConfigSchema.safeParse({
      standardMonthlyHours: 176,
      healthyMarginThreshold: 0.2,
      atRiskMarginThreshold: 0.05,
    });
    expect(result.success).toBe(true);
  });

  it('should accept partial config', () => {
    const result = systemConfigSchema.safeParse({
      standardMonthlyHours: 160,
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object', () => {
    const result = systemConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject non-integer standardMonthlyHours', () => {
    const result = systemConfigSchema.safeParse({
      standardMonthlyHours: 160.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject standardMonthlyHours below 1', () => {
    const result = systemConfigSchema.safeParse({
      standardMonthlyHours: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject standardMonthlyHours above 744', () => {
    const result = systemConfigSchema.safeParse({
      standardMonthlyHours: 745,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative margin thresholds', () => {
    const result = systemConfigSchema.safeParse({
      healthyMarginThreshold: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject margin thresholds above 1', () => {
    const result = systemConfigSchema.safeParse({
      atRiskMarginThreshold: 1.5,
    });
    expect(result.success).toBe(false);
  });
});
