export const APP_NAME = "Leocap Invest";

export const COMPANY_TYPES = ["IDEON", "NAKAMA"] as const;

export const LOAN_TYPES = ["SALARY_ADVANCE", "GENERAL_LOAN"] as const;

export const LOAN_STATUSES = [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "DISBURSED",
] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];
export type LoanType = (typeof LOAN_TYPES)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
