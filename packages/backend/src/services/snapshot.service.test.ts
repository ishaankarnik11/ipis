import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { cleanDb, disconnectTestDb } from '../test-utils/db.js';
import {
  persistSnapshots,
  ENGINE_VERSION,
  type ProjectResult,
  type PersistSnapshotsInput,
} from './snapshot.service.js';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

async function createTestRun(
  uploadEventId = 'test-upload-1',
  projectsProcessed = 1,
) {
  return prisma.recalculationRun.create({
    data: { uploadEventId, projectsProcessed, completedAt: new Date() },
  });
}

function tmProjectResult(overrides?: Partial<ProjectResult>): ProjectResult {
  return {
    projectId: 'proj-tm-1',
    engagementModel: 'TIME_AND_MATERIALS',
    infraCostMode: null,
    revenuePaise: 10_000_000,
    costPaise: 6_000_000,
    profitPaise: 4_000_000,
    marginPercent: 0.4,
    employees: [
      {
        employeeId: 'emp-1',
        name: 'Alice',
        designation: 'Senior Developer',
        departmentId: 'dept-eng',
        hours: 160,
        costPerHourPaise: 37_500,
        contributionPaise: 6_000_000,
        billingRatePaise: 62_500,
        billableHours: 160,
        availableHours: 176,
      },
    ],
    ...overrides,
  };
}

function amcProjectResultMultiEmployee(
  overrides?: Partial<ProjectResult>,
): ProjectResult {
  return {
    projectId: 'proj-amc-1',
    engagementModel: 'AMC',
    infraCostMode: null,
    revenuePaise: 20_000_000,
    costPaise: 12_000_000,
    profitPaise: 8_000_000,
    marginPercent: 0.4,
    employees: [
      {
        employeeId: 'emp-2',
        name: 'Bob',
        designation: 'Senior Developer',
        departmentId: 'dept-eng',
        hours: 160,
        costPerHourPaise: 37_500,
        contributionPaise: 6_000_000,
        billingRatePaise: null,
        billableHours: 120,
        availableHours: 176,
      },
      {
        employeeId: 'emp-3',
        name: 'Carol',
        designation: 'QA Engineer',
        departmentId: 'dept-qa',
        hours: 160,
        costPerHourPaise: 37_500,
        contributionPaise: 6_000_000,
        billingRatePaise: null,
        billableHours: 140,
        availableHours: 176,
      },
    ],
    ...overrides,
  };
}

function fixedCostProjectResult(
  overrides?: Partial<ProjectResult>,
): ProjectResult {
  return {
    projectId: 'proj-fc-1',
    engagementModel: 'FIXED_COST',
    infraCostMode: null,
    revenuePaise: 15_000_000,
    costPaise: 9_000_000,
    profitPaise: 6_000_000,
    marginPercent: 0.4,
    employees: [
      {
        employeeId: 'emp-4',
        name: 'Dave',
        designation: 'Tech Lead',
        departmentId: 'dept-eng',
        hours: 120,
        costPerHourPaise: 50_000,
        contributionPaise: 6_000_000,
        billingRatePaise: null,
        billableHours: 120,
        availableHours: 176,
      },
      {
        employeeId: 'emp-5',
        name: 'Eve',
        designation: 'Junior Developer',
        departmentId: 'dept-eng',
        hours: 160,
        costPerHourPaise: 18_750,
        contributionPaise: 3_000_000,
        billingRatePaise: null,
        billableHours: 140,
        availableHours: 176,
      },
    ],
    ...overrides,
  };
}

function infraSimpleProjectResult(
  overrides?: Partial<ProjectResult>,
): ProjectResult {
  return {
    projectId: 'proj-infra-simple',
    engagementModel: 'INFRASTRUCTURE',
    infraCostMode: 'SIMPLE',
    revenuePaise: 8_000_000,
    costPaise: 5_000_000,
    profitPaise: 3_000_000,
    marginPercent: 0.375,
    vendorCostPaise: 3_000_000,
    manpowerCostPaise: 2_000_000,
    projectDepartmentId: 'dept-ops',
    employees: [], // SIMPLE has no employee breakdown
    ...overrides,
  };
}

function infraDetailedProjectResult(
  overrides?: Partial<ProjectResult>,
): ProjectResult {
  return {
    projectId: 'proj-infra-detailed',
    engagementModel: 'INFRASTRUCTURE',
    infraCostMode: 'DETAILED',
    revenuePaise: 12_000_000,
    costPaise: 8_000_000,
    profitPaise: 4_000_000,
    marginPercent: 0.3333,
    vendorCostPaise: 2_000_000,
    employees: [
      {
        employeeId: 'emp-6',
        name: 'Frank',
        designation: 'DevOps Engineer',
        departmentId: 'dept-eng',
        hours: 160,
        costPerHourPaise: 37_500,
        contributionPaise: 6_000_000,
        billingRatePaise: null,
        billableHours: 160,
        availableHours: 176,
      },
    ],
    ...overrides,
  };
}

function makeInput(
  runId: string,
  projectResults: ProjectResult[],
): PersistSnapshotsInput {
  return {
    recalculationRunId: runId,
    periodMonth: 3,
    periodYear: 2026,
    projectResults,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('snapshot.service', () => {
  // 4.2 — Correct row count per recalculation run
  describe('row count per run (AC 1, 3)', () => {
    it('should write correct total snapshot rows for a single T&M project', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const snapshots = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id },
      });

      // 3 PROJECT + 3 PRACTICE (1 designation) + 3 DEPARTMENT (1 dept)
      // + 3 COMPANY + 5 EMPLOYEE (1 emp) = 17
      expect(snapshots).toHaveLength(17);
    });

    it('should stamp all rows with ENGINE_VERSION and correct period', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const snapshots = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id },
      });

      for (const s of snapshots) {
        expect(s.engineVersion).toBe(ENGINE_VERSION);
        expect(s.periodMonth).toBe(3);
        expect(s.periodYear).toBe(2026);
      }
    });
  });

  // 4.3 — PRACTICE aggregation by designation (AC 4)
  describe('PRACTICE aggregation (AC 4)', () => {
    it('should aggregate costs by designation across projects', async () => {
      const run = await createTestRun('upload-2', 2);
      // Both projects have "Senior Developer" employees
      await persistSnapshots(
        makeInput(run.id, [
          tmProjectResult(),
          amcProjectResultMultiEmployee(),
        ]),
      );

      const practiceRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'PRACTICE' },
      });

      // 2 designations: "Senior Developer" (from both projects) + "QA Engineer" (from AMC)
      // 2 designations * 3 figure types = 6 rows
      expect(practiceRows).toHaveLength(6);

      const srDevCost = practiceRows.find(
        (r) =>
          r.entityId === 'Senior Developer' &&
          r.figureType === 'EMPLOYEE_COST',
      );
      // T&M: 6_000_000 + AMC Bob: 6_000_000 = 12_000_000
      expect(Number(srDevCost!.valuePaise)).toBe(12_000_000);
    });
  });

  // 4.4 — DEPARTMENT aggregation (AC 5)
  describe('DEPARTMENT aggregation (AC 5)', () => {
    it('should aggregate costs by department', async () => {
      const run = await createTestRun();
      // AMC has employees in 2 departments (dept-eng + dept-qa)
      await persistSnapshots(
        makeInput(run.id, [amcProjectResultMultiEmployee()]),
      );

      const deptRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'DEPARTMENT' },
      });

      // 2 departments * 3 figure types = 6 rows
      expect(deptRows).toHaveLength(6);

      const deptIds = [...new Set(deptRows.map((r) => r.entityId))];
      expect(deptIds.sort()).toEqual(['dept-eng', 'dept-qa']);
    });

    it('should attribute Infrastructure SIMPLE costs to projectDepartmentId', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [infraSimpleProjectResult()]),
      );

      const deptRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'DEPARTMENT' },
      });

      // 1 department (dept-ops) * 3 figure types = 3 rows
      expect(deptRows).toHaveLength(3);
      expect(deptRows[0].entityId).toBe('dept-ops');

      const costRow = deptRows.find(
        (r) => r.figureType === 'EMPLOYEE_COST',
      );
      expect(Number(costRow!.valuePaise)).toBe(5_000_000);
    });
  });

  // 4.5 — COMPANY rollup (AC 5)
  describe('COMPANY rollup (AC 5)', () => {
    it('should produce exactly 3 COMPANY rows', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const companyRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'COMPANY' },
      });

      expect(companyRows).toHaveLength(3);
      expect(companyRows.every((r) => r.entityId === 'COMPANY')).toBe(true);
    });

    it('should aggregate revenue across all projects', async () => {
      const run = await createTestRun('upload-multi', 2);
      await persistSnapshots(
        makeInput(run.id, [
          tmProjectResult(),
          amcProjectResultMultiEmployee(),
        ]),
      );

      const revenueRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'COMPANY',
          figureType: 'REVENUE_CONTRIBUTION',
        },
      });

      // 10_000_000 + 20_000_000 = 30_000_000
      expect(Number(revenueRow!.valuePaise)).toBe(30_000_000);
    });
  });

  // 4.6 — EMPLOYEE-level rows with utilization metrics (AC 6)
  describe('EMPLOYEE rows (AC 6)', () => {
    it('should write 5 figure types per employee', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const empRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'EMPLOYEE' },
      });

      expect(empRows).toHaveLength(5);
      const figureTypes = empRows.map((r) => r.figureType).sort();
      expect(figureTypes).toEqual([
        'BILLABLE_PERCENT',
        'COST_PER_HOUR',
        'EMPLOYEE_COST',
        'REVENUE_CONTRIBUTION',
        'UTILIZATION_PERCENT',
      ]);
    });

    it('should calculate utilization percent as totalHours / availableHours', async () => {
      const run = await createTestRun();
      // AMC: Bob has 160 total / 176 available ≈ 90.9%
      await persistSnapshots(
        makeInput(run.id, [amcProjectResultMultiEmployee()]),
      );

      const bobUtil = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'EMPLOYEE',
          entityId: 'emp-2',
          figureType: 'UTILIZATION_PERCENT',
        },
      });

      // 160 / 176 ≈ 0.9091 → 9091 basis points
      expect(Number(bobUtil!.valuePaise)).toBe(9091);
    });

    it('should calculate billable percent as billableHours / totalHours', async () => {
      const run = await createTestRun();
      // AMC: Bob has 120 billable / 160 total = 75%
      await persistSnapshots(
        makeInput(run.id, [amcProjectResultMultiEmployee()]),
      );

      const bobBillable = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'EMPLOYEE',
          entityId: 'emp-2',
          figureType: 'BILLABLE_PERCENT',
        },
      });

      // 120 / 160 = 0.75 → 7500 basis points
      expect(Number(bobBillable!.valuePaise)).toBe(7500);
    });

    it('should produce different values for UTILIZATION_PERCENT and BILLABLE_PERCENT', async () => {
      const run = await createTestRun();
      // Bob: 160 worked / 176 available (util ~90.9%), 120 billable / 160 total (billable 75%)
      await persistSnapshots(
        makeInput(run.id, [amcProjectResultMultiEmployee()]),
      );

      const bobUtil = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'EMPLOYEE',
          entityId: 'emp-2',
          figureType: 'UTILIZATION_PERCENT',
        },
      });

      const bobBillable = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'EMPLOYEE',
          entityId: 'emp-2',
          figureType: 'BILLABLE_PERCENT',
        },
      });

      expect(Number(bobUtil!.valuePaise)).not.toBe(
        Number(bobBillable!.valuePaise),
      );
    });
  });

  // 4.7 — Snapshot isolation on failure (AC 8)
  describe('error isolation (AC 8)', () => {
    it('should write zero rows if transaction fails (FK violation)', async () => {
      await persistSnapshots(
        makeInput('non-existent-run-id', [tmProjectResult()]),
      );

      const allSnapshots = await prisma.calculationSnapshot.findMany();
      expect(allSnapshots).toHaveLength(0);
    });

    it('should not throw when persistence fails', async () => {
      await expect(
        persistSnapshots(
          makeInput('non-existent-run-id', [tmProjectResult()]),
        ),
      ).resolves.toBeUndefined();
    });

    it('should preserve previous snapshots on failure', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const countBefore = await prisma.calculationSnapshot.count();
      expect(countBefore).toBeGreaterThan(0);

      // Attempt a second write that will fail
      await persistSnapshots(
        makeInput('non-existent-run-id', [tmProjectResult()]),
      );

      const countAfter = await prisma.calculationSnapshot.count();
      expect(countAfter).toBe(countBefore);
    });
  });

  // 4.8 — breakdown_json shape for T&M (AC 10)
  describe('breakdown_json — T&M (AC 10)', () => {
    it('should produce T&M breakdown with employees array', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const marginRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          figureType: 'MARGIN_PERCENT',
        },
      });

      const breakdown = marginRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown.engagementModel).toBe('TIME_AND_MATERIALS');
      expect(breakdown).not.toHaveProperty('infraCostMode');
      expect(breakdown).toHaveProperty('revenue');
      expect(breakdown).toHaveProperty('cost');
      expect(breakdown).toHaveProperty('profit');
      expect(Array.isArray(breakdown.employees)).toBe(true);

      const emp = (breakdown.employees as Record<string, unknown>[])[0];
      expect(emp).toHaveProperty('employeeId');
      expect(emp).toHaveProperty('name');
      expect(emp).toHaveProperty('designation');
      expect(emp).toHaveProperty('hours');
      expect(emp).toHaveProperty('costPerHourPaise');
      expect(emp).toHaveProperty('contributionPaise');
    });
  });

  // 4.9 — breakdown_json shape for AMC (AC 10)
  describe('breakdown_json — AMC multi-employee (AC 10)', () => {
    it('should produce AMC breakdown with multiple employees', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [amcProjectResultMultiEmployee()]),
      );

      const marginRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          figureType: 'MARGIN_PERCENT',
        },
      });

      const breakdown = marginRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown.engagementModel).toBe('AMC');
      expect(breakdown).not.toHaveProperty('infraCostMode');
      expect(Array.isArray(breakdown.employees)).toBe(true);
      expect(
        (breakdown.employees as Record<string, unknown>[]).length,
      ).toBe(2);
    });
  });

  // 4.10 — breakdown_json shape for Infra SIMPLE (AC 10)
  describe('breakdown_json — Infrastructure SIMPLE (AC 10)', () => {
    it('should produce Infra SIMPLE breakdown without employees array', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [infraSimpleProjectResult()]),
      );

      const marginRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          figureType: 'MARGIN_PERCENT',
        },
      });

      const breakdown = marginRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown.engagementModel).toBe('INFRASTRUCTURE');
      expect(breakdown.infraCostMode).toBe('SIMPLE');
      expect(breakdown).toHaveProperty('vendorCostPaise');
      expect(breakdown).toHaveProperty('manpowerCostPaise');
      expect(breakdown).not.toHaveProperty('employees');
    });
  });

  // 4.11 — breakdown_json shape for Infra DETAILED (AC 10)
  describe('breakdown_json — Infrastructure DETAILED (AC 10)', () => {
    it('should produce Infra DETAILED breakdown with vendorCostPaise and employees array', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [infraDetailedProjectResult()]),
      );

      const marginRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          figureType: 'MARGIN_PERCENT',
        },
      });

      const breakdown = marginRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown.engagementModel).toBe('INFRASTRUCTURE');
      expect(breakdown.infraCostMode).toBe('DETAILED');
      expect(breakdown).toHaveProperty('vendorCostPaise');
      expect(breakdown).not.toHaveProperty('manpowerCostPaise');
      expect(Array.isArray(breakdown.employees)).toBe(true);
    });
  });

  // 4.12 — Infra SIMPLE produces zero EMPLOYEE rows (AC 11)
  describe('Infrastructure SIMPLE — no EMPLOYEE rows (AC 11)', () => {
    it('should produce zero EMPLOYEE rows for Infrastructure SIMPLE', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [infraSimpleProjectResult()]),
      );

      const empRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id, entityType: 'EMPLOYEE' },
      });

      expect(empRows).toHaveLength(0);
    });

    it('should still produce PROJECT/PRACTICE/DEPT/COMPANY rows for Infra SIMPLE', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [infraSimpleProjectResult()]),
      );

      const allRows = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id },
      });

      // 3 PROJECT + 0 PRACTICE (no employees) + 3 DEPARTMENT (via projectDepartmentId)
      // + 3 COMPANY + 0 EMPLOYEE = 9
      expect(allRows).toHaveLength(9);
    });
  });

  // Review fix: breakdown_json for Fixed Cost (AC 10)
  describe('breakdown_json — Fixed Cost (AC 10)', () => {
    it('should produce FC breakdown with employees array (same shape as T&M)', async () => {
      const run = await createTestRun();
      await persistSnapshots(
        makeInput(run.id, [fixedCostProjectResult()]),
      );

      const marginRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'PROJECT',
          figureType: 'MARGIN_PERCENT',
        },
      });

      const breakdown = marginRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown.engagementModel).toBe('FIXED_COST');
      expect(breakdown).not.toHaveProperty('infraCostMode');
      expect(breakdown).toHaveProperty('revenue');
      expect(breakdown).toHaveProperty('cost');
      expect(breakdown).toHaveProperty('profit');
      expect(Array.isArray(breakdown.employees)).toBe(true);
      expect(
        (breakdown.employees as Record<string, unknown>[]).length,
      ).toBe(2);
    });
  });

  // Review fix: empty projectResults
  describe('empty projectResults', () => {
    it('should not throw for empty input and write only COMPANY rows', async () => {
      const run = await createTestRun();
      await expect(
        persistSnapshots(makeInput(run.id, [])),
      ).resolves.toBeUndefined();

      const allSnapshots = await prisma.calculationSnapshot.findMany({
        where: { recalculationRunId: run.id },
      });
      // buildCompanyRows always produces 3 rows (zero-valued) even with no projects
      expect(allSnapshots).toHaveLength(3);
      expect(allSnapshots.every((s) => s.entityType === 'COMPANY')).toBe(true);
      expect(allSnapshots.every((s) => Number(s.valuePaise) === 0)).toBe(true);
    });
  });

  // Review fix: EMPLOYEE_COST breakdown includes availableHours
  describe('EMPLOYEE_COST breakdown includes availableHours', () => {
    it('should include availableHours in EMPLOYEE_COST breakdown', async () => {
      const run = await createTestRun();
      await persistSnapshots(makeInput(run.id, [tmProjectResult()]));

      const empCostRow = await prisma.calculationSnapshot.findFirst({
        where: {
          recalculationRunId: run.id,
          entityType: 'EMPLOYEE',
          figureType: 'EMPLOYEE_COST',
        },
      });

      const breakdown = empCostRow!.breakdownJson as Record<string, unknown>;
      expect(breakdown).toHaveProperty('totalHours');
      expect(breakdown).toHaveProperty('billableHours');
      expect(breakdown).toHaveProperty('availableHours');
      expect(breakdown.availableHours).toBe(176);
    });
  });
});
