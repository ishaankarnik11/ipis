import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import {
  cleanDb,
  seedTestDepartments,
  createTestUser,
  disconnectTestDb,
} from '../test-utils/db.js';
import { prisma } from '../lib/prisma.js';

// Mock puppeteer before importing the service
const mockPdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4-mock-content'));
const mockGoto = vi.fn().mockResolvedValue(undefined);
const mockSetCookie = vi.fn().mockResolvedValue(undefined);
const mockNewPage = vi.fn().mockResolvedValue({
  setCookie: mockSetCookie,
  goto: mockGoto,
  pdf: mockPdf,
});
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockLaunch = vi.fn().mockResolvedValue({
  newPage: mockNewPage,
  close: mockClose,
});

vi.mock('puppeteer', () => ({
  default: { launch: mockLaunch },
}));

// Import after mocking
const { exportPdf } = await import('./report.service.js');

afterAll(async () => {
  await disconnectTestDb();
});

describe('report.service — exportPdf', () => {
  let depts: Map<string, string>;
  let financeUser: { id: string; role: string; email: string };
  let adminUser: { id: string; role: string; email: string };
  let dmUser: { id: string; role: string; email: string };
  let projectId: string;

  beforeEach(async () => {
    await cleanDb();
    vi.clearAllMocks();

    // Restore default mock implementations
    mockPdf.mockResolvedValue(Buffer.from('%PDF-1.4-mock-content'));
    mockGoto.mockResolvedValue(undefined);
    mockSetCookie.mockResolvedValue(undefined);
    mockNewPage.mockResolvedValue({
      setCookie: mockSetCookie,
      goto: mockGoto,
      pdf: mockPdf,
    });
    mockClose.mockResolvedValue(undefined);
    mockLaunch.mockResolvedValue({
      newPage: mockNewPage,
      close: mockClose,
    });

    depts = await seedTestDepartments();

    const finance = await createTestUser('FINANCE', {
      departmentId: depts.get('Finance'),
    });
    financeUser = { id: finance.id, role: finance.role, email: finance.email };

    const admin = await createTestUser('ADMIN');
    adminUser = { id: admin.id, role: admin.role, email: admin.email };

    const dm = await createTestUser('DELIVERY_MANAGER', {
      departmentId: depts.get('Delivery'),
    });
    dmUser = { id: dm.id, role: dm.role, email: dm.email };

    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        client: 'Test Client',
        vertical: 'IT Services',
        engagementModel: 'TIME_AND_MATERIALS',
        status: 'ACTIVE',
        deliveryManagerId: dm.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
      },
    });
    projectId = project.id;
  });

  it('Finance user gets PDF buffer and correct filename', async () => {
    const result = await exportPdf('project', projectId, '2026-01', financeUser);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.toString()).toContain('%PDF');
    expect(result.filename).toBe(`IPIS-project-${projectId}-2026-01.pdf`);
  });

  it('Admin user gets PDF buffer (unrestricted access)', async () => {
    const result = await exportPdf('executive', projectId, '2026-02', adminUser);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.filename).toBe(`IPIS-executive-${projectId}-2026-02.pdf`);
  });

  it('DM can export their own project', async () => {
    const result = await exportPdf('project', projectId, '2026-01', dmUser);

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.filename).toBe(`IPIS-project-${projectId}-2026-01.pdf`);
  });

  it('DM cannot export another DM project — ForbiddenError', async () => {
    const otherDm = await createTestUser('DELIVERY_MANAGER', {
      email: 'other-dm@test.com',
      departmentId: depts.get('Delivery'),
    });
    const otherDmUser = {
      id: otherDm.id,
      role: otherDm.role,
      email: otherDm.email,
    };

    await expect(
      exportPdf('project', projectId, '2026-01', otherDmUser),
    ).rejects.toThrow('You can only export reports for projects you manage');
  });

  it('returns PdfGenerationError with PDF_GENERATION_FAILED code when Puppeteer throws', async () => {
    mockLaunch.mockRejectedValueOnce(new Error('Chromium crashed'));

    await expect(
      exportPdf('project', projectId, '2026-01', financeUser),
    ).rejects.toMatchObject({
      code: 'PDF_GENERATION_FAILED',
      statusCode: 500,
    });
  });

  it('generates correct filename for different report types', async () => {
    const result = await exportPdf('employee', projectId, '2026-03', financeUser);

    expect(result.filename).toBe(`IPIS-employee-${projectId}-2026-03.pdf`);
  });

  it('calls Puppeteer with correct parameters', async () => {
    await exportPdf('project', projectId, '2026-01', financeUser);

    expect(mockLaunch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ipis_internal_token',
        httpOnly: true,
      }),
    );
    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringContaining('/dashboards/projects'),
      expect.objectContaining({ waitUntil: 'networkidle0', timeout: 10_000 }),
    );
  });

  it('always closes browser even on error', async () => {
    mockGoto.mockRejectedValueOnce(new Error('Navigation failed'));

    await expect(
      exportPdf('project', projectId, '2026-01', financeUser),
    ).rejects.toThrow();

    expect(mockClose).toHaveBeenCalled();
  });

  it('DM cannot export non-project report types — ForbiddenError (AC5)', async () => {
    await expect(
      exportPdf('executive', projectId, '2026-01', dmUser),
    ).rejects.toThrow('Delivery Managers can only export their own project reports');

    await expect(
      exportPdf('company', projectId, '2026-01', dmUser),
    ).rejects.toThrow('Delivery Managers can only export their own project reports');
  });

  it('HR user gets no special service-level bypass (AC8 — route-level RBAC excludes HR)', async () => {
    const hr = await createTestUser('HR', { departmentId: depts.get('HR') });
    const hrUser = { id: hr.id, role: hr.role, email: hr.email };

    // HR is blocked at route level by rbacMiddleware(['FINANCE','ADMIN','DELIVERY_MANAGER']).
    // At service level, HR isn't DM so RBAC check doesn't throw — confirming the route
    // middleware is the enforcement layer. This test documents that the service does NOT
    // accidentally grant or deny HR; the 403 comes from rbacMiddleware.
    const result = await exportPdf('project', projectId, '2026-01', hrUser);
    expect(result.buffer).toBeInstanceOf(Buffer);
    // ^ This passes because service layer has no HR-specific guard.
    // Route-level rbacMiddleware is responsible for the 403.
  });

  it('includes period in Puppeteer navigation URL', async () => {
    await exportPdf('project', projectId, '2026-03', financeUser);

    expect(mockGoto).toHaveBeenCalledWith(
      expect.stringContaining('period=2026-03'),
      expect.anything(),
    );
  });
});
