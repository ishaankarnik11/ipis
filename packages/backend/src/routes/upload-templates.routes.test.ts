import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { createApp } from '../app.js';
import { cleanDb, seedTestDepartments, createTestUser, disconnectTestDb } from '../test-utils/db.js';
import { signToken } from '../lib/jwt.js';
import { UPLOAD_TEMPLATES, type TemplateType } from '../lib/excel.js';

describe('Upload Template Routes — GET /api/v1/uploads/templates/:type', () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanDb();
    await seedTestDepartments();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  async function loginAs(role: string) {
    const user = await createTestUser(role as any);
    const token = await signToken({ sub: user.id, role: user.role, email: user.email });
    const cookies = [`ipis_token=${token}`];
    return { cookies, user };
  }

  const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const templateTypes: TemplateType[] = ['employee-master', 'timesheet', 'revenue'];

  for (const type of templateTypes) {
    describe(`GET /api/v1/uploads/templates/${type}`, () => {
      it('should return 200 with correct Content-Type', async () => {
        const { cookies } = await loginAs('ADMIN');

        const res = await request(app)
          .get(`/api/v1/uploads/templates/${type}`)
          .set('Cookie', cookies);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain(XLSX_CONTENT_TYPE);
      });

      it('should set Content-Disposition to attachment with filename', async () => {
        const { cookies } = await loginAs('ADMIN');

        const res = await request(app)
          .get(`/api/v1/uploads/templates/${type}`)
          .set('Cookie', cookies);

        expect(res.headers['content-disposition']).toMatch(/^attachment; filename="/);
        expect(res.headers['content-disposition']).toContain('.xlsx');
      });

      it('should return valid xlsx with expected headers', async () => {
        const { cookies } = await loginAs('ADMIN');

        const res = await request(app)
          .get(`/api/v1/uploads/templates/${type}`)
          .set('Cookie', cookies)
          .buffer(true)
          .parse((res, callback) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        const workbook = XLSX.read(res.body, { type: 'buffer' });
        expect(workbook.SheetNames.length).toBeGreaterThanOrEqual(1);

        const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        // Verify headers match UPLOAD_TEMPLATES definition
        const expectedHeaders = UPLOAD_TEMPLATES[type].headers;
        const actualHeaders = Object.keys(rows[0] ?? {});
        expect(actualHeaders).toEqual(expectedHeaders);
      });

      it('should include an example data row', async () => {
        const { cookies } = await loginAs('ADMIN');

        const res = await request(app)
          .get(`/api/v1/uploads/templates/${type}`)
          .set('Cookie', cookies)
          .buffer(true)
          .parse((res, callback) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(chunks)));
          });

        const workbook = XLSX.read(res.body, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
        const rows = XLSX.utils.sheet_to_json(sheet);

        // Should have at least one data row (the example)
        expect(rows.length).toBeGreaterThanOrEqual(1);
      });
    });
  }

  describe('Invalid template type', () => {
    it('should return 404 for unknown template type', async () => {
      const { cookies } = await loginAs('ADMIN');

      const res = await request(app)
        .get('/api/v1/uploads/templates/nonexistent')
        .set('Cookie', cookies);

      expect(res.status).toBe(404);
    });
  });

  describe('Authentication & RBAC', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/v1/uploads/templates/employee-master');

      expect(res.status).toBe(401);
    });

    it('should allow FINANCE role', async () => {
      const { cookies } = await loginAs('FINANCE');

      const res = await request(app)
        .get('/api/v1/uploads/templates/revenue')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });

    it('should allow HR role', async () => {
      const { cookies } = await loginAs('HR');

      const res = await request(app)
        .get('/api/v1/uploads/templates/employee-master')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });

    // Story 10.3: DM can now download templates (for timesheet uploads)
    it('should allow DELIVERY_MANAGER role for timesheet template', async () => {
      const { cookies } = await loginAs('DELIVERY_MANAGER');

      const res = await request(app)
        .get('/api/v1/uploads/templates/timesheet')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
    });
  });
});
