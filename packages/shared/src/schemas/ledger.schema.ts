import { z } from 'zod';

const ledgerEmployeeSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  designation: z.string(),
  hours: z.number(),
  cost_per_hour_paise: z.number().int(),
  contribution_paise: z.number().int(),
});

const baseLedgerFields = {
  revenue_paise: z.number().int(),
  cost_paise: z.number().int(),
  profit_paise: z.number().int(),
  margin_percent: z.number(),
  engagement_model: z.enum(['TIME_AND_MATERIALS', 'FIXED_COST', 'AMC', 'INFRASTRUCTURE']),
  calculated_at: z.string(),
  engine_version: z.string(),
  recalculation_run_id: z.string(),
};

/** T&M / Fixed Cost / AMC response — has employees array */
const employeeLedgerSchema = z.object({
  ...baseLedgerFields,
  engagement_model: z.enum(['TIME_AND_MATERIALS', 'FIXED_COST', 'AMC']),
  employees: z.array(ledgerEmployeeSchema),
});

/** Infrastructure DETAILED — employees + vendor cost */
const infraDetailedLedgerSchema = z.object({
  ...baseLedgerFields,
  engagement_model: z.literal('INFRASTRUCTURE'),
  infra_cost_mode: z.literal('DETAILED'),
  vendor_cost_paise: z.number().int(),
  employees: z.array(ledgerEmployeeSchema),
});

/** Infrastructure SIMPLE — vendor + manpower costs, no employees */
const infraSimpleLedgerSchema = z.object({
  ...baseLedgerFields,
  engagement_model: z.literal('INFRASTRUCTURE'),
  infra_cost_mode: z.literal('SIMPLE'),
  vendor_cost_paise: z.number().int(),
  manpower_cost_paise: z.number().int(),
});

export const ledgerResponseSchema = z.union([
  infraDetailedLedgerSchema,
  infraSimpleLedgerSchema,
  employeeLedgerSchema,
]);

export type LedgerResponseData = z.infer<typeof ledgerResponseSchema>;
