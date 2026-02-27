export interface CostRateInput {
  annualCtcPaise: number;
  overheadPaise: number;
  standardMonthlyHours: number;
}

export interface EmployeeCostEntry {
  hours: number;
  costPerHourPaise: number;
}

/** @deprecated Use EmployeeCostEntry instead. Kept for backward compatibility. */
export type TmEmployeeCost = EmployeeCostEntry;

export interface TmInput {
  /** Total billed hours for the period. Must be non-negative; validated at the API layer. */
  billedHours: number;
  billingRatePaise: number;
  employeeCosts: EmployeeCostEntry[];
}

export interface TmResult {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  /** Raw floating-point division (profit / revenue). Not rounded to fixed precision. */
  marginPercent: number;
}

export interface FixedCostInput {
  contractValuePaise: number;
  employeeCosts: EmployeeCostEntry[];
  completionPercent: number;
}

export interface FixedCostResult {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
  burnPercent: number;
  isAtRisk: boolean;
}

export interface AmcInput {
  contractValuePaise: number;
  employeeCosts: EmployeeCostEntry[];
}

export interface AmcResult {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}

export interface InfrastructureSimpleInput {
  mode: 'SIMPLE';
  infraInvoicePaise: number;
  vendorCostPaise: number;
  manpowerCostPaise: number;
}

export interface InfrastructureDetailedInput {
  mode: 'DETAILED';
  infraInvoicePaise: number;
  vendorCostPaise: number;
  employeeCosts: EmployeeCostEntry[];
}

export type InfrastructureInput = InfrastructureSimpleInput | InfrastructureDetailedInput;

export interface InfrastructureResult {
  revenuePaise: number;
  costPaise: number;
  profitPaise: number;
  marginPercent: number;
}
