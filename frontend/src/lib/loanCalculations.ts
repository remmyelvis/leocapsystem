// ---------------------------------------------------------------------------
// Loan Calculation Functions
// All loan formulas based on Leocap spreadsheet calculations
// ---------------------------------------------------------------------------

import { LOAN_SETTINGS } from "@/configs/loanSettings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SalaryAdvanceResult {
  averageSalary: number;
  loanAmount: number;
  processingFees: number;
  accessFees: number;
  legalCharge: number;
  disbursementAmount: number;
  interestAmount: number;
  repaymentAmount: number;
  interestRate: number;
}

export interface GeneralLoanEstimate {
  averageSalary: number;
  maxLoanAmount: number;
  processingFees: number;
  accessFees: number;
  legalFees: number;
  estimatedDisbursement: number;
}

export interface GeneralLoanResult {
  loanAmount: number;
  processingFees: number;
  accessFees: number;
  legalFees: number;
  disbursementAmount: number;
  interestAmount: number;
  repaymentAmount: number;
  interestRate: number;
}

// ---------------------------------------------------------------------------
// Salary Advance Calculation (Ideon & Nakama)
// Formula: Loan Amount = AVERAGE(M1,M2,M3) / 3 / (1 + rate)
// Fixed 10% interest rate
// ---------------------------------------------------------------------------

export function calculateSalaryAdvance(
  month1: number,
  month2: number,
  month3: number,
  interestRate: number = LOAN_SETTINGS.salaryAdvance.interestRate
): SalaryAdvanceResult {
  const { processingFeeRate, accessFeeRate, legalCharge, salaryDivisor } =
    LOAN_SETTINGS.salaryAdvance;

  // Calculate average salary
  const averageSalary = (month1 + month2 + month3) / 3;

  // Gross loan = average / 3 / (1 + rate)
  // This gives the loan amount such that loan * (1 + rate) = average / 3
  const loanAmount = averageSalary / salaryDivisor / (1 + interestRate);

  // Calculate fees
  const processingFees = loanAmount * processingFeeRate;
  const accessFees = loanAmount * accessFeeRate;

  // Disbursement = Loan - All Fees
  const disbursementAmount =
    loanAmount - processingFees - accessFees - legalCharge;

  // Interest and repayment
  const interestAmount = loanAmount * interestRate;
  const repaymentAmount = loanAmount * (1 + interestRate);

  return {
    averageSalary,
    loanAmount,
    processingFees,
    accessFees,
    legalCharge,
    disbursementAmount,
    interestAmount,
    repaymentAmount,
    interestRate,
  };
}

// ---------------------------------------------------------------------------
// General Loan Estimate (Before admin sets rate)
// Formula: Loan Amount = ROUNDUP(1/3 * AVERAGE(M1,M2,M3), -2) / 1.2
// Used to show maximum eligible amount
// ---------------------------------------------------------------------------

export function estimateGeneralLoan(
  month1: number,
  month2: number,
  month3: number
): GeneralLoanEstimate {
  const { processingFeeRate, accessFeeRate, legalFees, salaryDivisor, baseDivisor } =
    LOAN_SETTINGS.generalLoan;

  // Calculate average salary
  const averageSalary = (month1 + month2 + month3) / 3;

  // Raw loan = 1/3 of average
  const rawLoan = averageSalary / salaryDivisor;

  // ROUNDUP to nearest 100, then divide by 1.2
  const roundedUp = Math.ceil(rawLoan / 100) * 100;
  const maxLoanAmount = roundedUp / baseDivisor;

  // Calculate fees
  const processingFees = maxLoanAmount * processingFeeRate;
  const accessFees = maxLoanAmount * accessFeeRate;

  // Estimated disbursement
  const estimatedDisbursement = maxLoanAmount - processingFees - accessFees - legalFees;

  return {
    averageSalary,
    maxLoanAmount,
    processingFees,
    accessFees,
    legalFees,
    estimatedDisbursement,
  };
}

// ---------------------------------------------------------------------------
// General Loan Calculation (After admin sets rate)
// Used to calculate final amounts once interest rate is agreed
// ---------------------------------------------------------------------------

export function calculateGeneralLoan(
  loanAmount: number,
  interestRate: number
): GeneralLoanResult {
  const { processingFeeRate, accessFeeRate, legalFees } = LOAN_SETTINGS.generalLoan;

  // Calculate fees
  const processingFees = loanAmount * processingFeeRate;
  const accessFees = loanAmount * accessFeeRate;

  // Disbursement = Loan - All Fees
  const disbursementAmount = loanAmount - processingFees - accessFees - legalFees;

  // Interest and repayment
  const interestAmount = loanAmount * interestRate;
  const repaymentAmount = loanAmount + interestAmount;

  return {
    loanAmount,
    processingFees,
    accessFees,
    legalFees,
    disbursementAmount,
    interestAmount,
    repaymentAmount,
    interestRate,
  };
}

// ---------------------------------------------------------------------------
// Salary Advance Breakdown from Admin-Approved Amount
// Used when admin has overridden the calculated loan amount.
// ---------------------------------------------------------------------------

export interface SalaryAdvanceFromAmountResult {
  loanAmount: number;
  processingFees: number;
  accessFees: number;
  legalCharge: number;
  disbursementAmount: number;
  interestAmount: number;
  repaymentAmount: number;
  interestRate: number;
}

export function calculateSalaryAdvanceFromAmount(
  loanAmount: number,
  interestRate: number = LOAN_SETTINGS.salaryAdvance.interestRate
): SalaryAdvanceFromAmountResult {
  const { processingFeeRate, accessFeeRate, legalCharge } =
    LOAN_SETTINGS.salaryAdvance;

  const processingFees = loanAmount * processingFeeRate;
  const accessFees = loanAmount * accessFeeRate;
  const disbursementAmount = loanAmount - processingFees - accessFees - legalCharge;
  const interestAmount = loanAmount * interestRate;
  const repaymentAmount = loanAmount * (1 + interestRate);

  return {
    loanAmount,
    processingFees,
    accessFees,
    legalCharge,
    disbursementAmount,
    interestAmount,
    repaymentAmount,
    interestRate,
  };
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatKESShort(amount: number): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

// Calculate what user can apply for based on requested amount
export function calculateSalaryAdvanceForAmount(
  requestedAmount: number,
  interestRate: number = LOAN_SETTINGS.salaryAdvance.interestRate
): Omit<SalaryAdvanceResult, "averageSalary"> {
  const { processingFeeRate, accessFeeRate, legalCharge } =
    LOAN_SETTINGS.salaryAdvance;

  const loanAmount = requestedAmount;
  const processingFees = loanAmount * processingFeeRate;
  const accessFees = loanAmount * accessFeeRate;
  const disbursementAmount =
    loanAmount - processingFees - accessFees - legalCharge;
  const interestAmount = loanAmount * interestRate;
  const repaymentAmount = loanAmount * (1 + interestRate);

  return {
    loanAmount,
    processingFees,
    accessFees,
    legalCharge,
    disbursementAmount,
    interestAmount,
    repaymentAmount,
    interestRate,
  };
}
