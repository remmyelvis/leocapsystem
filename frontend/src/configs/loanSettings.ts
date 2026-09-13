// ---------------------------------------------------------------------------
// Loan Settings Configuration
// All loan settings in one place for easy future changes
// ---------------------------------------------------------------------------

export const LOAN_SETTINGS = {
  salaryAdvance: {
    /** Fixed interest rate for salary advances (10%) */
    interestRate: 0.10,
    /** Processing fee percentage (3%) */
    processingFeeRate: 0.03,
    /** Access fee percentage (2%) */
    accessFeeRate: 0.02,
    /** Legal charge flat fee (KES) */
    legalCharge: 500,
    /** Repayment period in days */
    repaymentDays: 30,
    /** Loan amount divisor (1/3 of average salary) */
    salaryDivisor: 3,
  },
  generalLoan: {
    /** Processing fee percentage (3%) */
    processingFeeRate: 0.03,
    /** Legal fees flat fee (KES) - default 0, editable by admin */
    legalFees: 0,
    /** Access fee percentage - default 0, editable by admin */
    accessFeeRate: 0,
    /** Default interest rate when admin hasn't set one */
    defaultInterestRate: 0.20,
    /** Repayment period in days */
    repaymentDays: 30,
    /** Available interest rates admin can pick from */
    availableRates: [0.05, 0.08, 0.10, 0.12, 0.15, 0.18, 0.20, 0.25, 0.30],
    /** Loan amount divisor (1/3 of average salary) */
    salaryDivisor: 3,
    /** Divisor for loan calculation (1.2 for 20% base) */
    baseDivisor: 1.2,
  },
  penalties: {
    /** Rescheduling fee percentage */
    reschedulingFeeRate: 0.10,
    /** Minimum rescheduling fee (KES) */
    minReschedulingFee: 1500,
    /** Debt collection fee percentage after 7 days */
    debtCollectionFeeRate: 0.15,
    /** Minimum bounced cheque fee (KES) */
    minBouncedChequeFee: 3000,
    /** Bounced cheque collection rate */
    bouncedChequeCollectionRate: 0.15,
  },
} as const;

export type LoanSettingsType = typeof LOAN_SETTINGS;
