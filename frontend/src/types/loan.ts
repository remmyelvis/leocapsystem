export type LoanType =
  | "IDEON_SALARY_ADVANCE"
  | "NAKAMA_SALARY_ADVANCE"
  | "GENERAL_LOAN";

export type LoanStatus =
  | "PENDING"        // Just submitted, awaiting admin review
  | "RATE_SET"       // Admin set interest rate, awaiting user confirmation (general loan only)
  | "RATE_CONFIRMED" // User accepted the proposed interest rate
  | "RATE_DECLINED"  // User declined the proposed interest rate
  | "CONFIRMED"      // User confirmed the rate and terms
  | "APPROVED"       // Admin approved
  | "DECLINED"       // Admin declined
  | "DISBURSED";     // Money sent

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";

export type NatureOfEmployment = "Agent" | "Management" | "Other";
export type EmploymentType = "Self Employed" | "Employed";

export interface LoanApplication {
  id: string;
  userId: string;
  loanType: LoanType;
  status: LoanStatus;
  submittedAt: Date;
  updatedAt: Date;

  // ── Payment tracking fields ───────────────────────────────────────────────
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  lastPaymentDate?: Date;

  // ── Calculation results stored at submission time ─────────────────────────
  calculatedLoanAmount?: number;
  calculatedProcessingFees?: number;
  calculatedAccessFees?: number;      // salary advance only
  calculatedLegalFees?: number;
  calculatedDisbursement?: number;
  calculatedInterest?: number;
  calculatedRepayment?: number;

  // ── Interest rate management (General loans) ──────────────────────────────
  agreedInterestRate?: number;        // e.g. 0.1 for 10%
  interestRateSetAt?: string;         // ISO date when admin set rate
  interestRateSetBy?: string;         // admin name who set the rate

  // ── User confirmation (General Loan rate) ──────────────────────────────────
  userConfirmedAt?: string;           // ISO date when user confirmed rate

  // ── Disbursement confirmation (Salary Advance) ────────────────────────────
  disbursementConfirmed?: boolean | null; // true=agreed, false=declined, null/undefined=pending
  disbursementConfirmedAt?: string;   // ISO date when user confirmed disbursement
  disbursementDeclinedAt?: string;    // ISO date when user declined disbursement

  // ── Approval tracking ─────────────────────────────────────────────────────
  approvalNote?: string;
  approvedAt?: string;
  approvedBy?: string;
  declinedAt?: string;
  declinedBy?: string;
  disbursedAt?: string;
  disbursedBy?: string;

  // ── Salary Advance fields (Ideon & Nakama) ────────────────────────────────
  payrollNumber?: string;
  natureOfEmployment?: NatureOfEmployment;
  designation?: string;
  /** Basic pay for the most recent month */
  basicPayMonth1?: number;
  /** Basic pay for 2 months ago */
  basicPayMonth2?: number;
  /** Basic pay for 3 months ago */
  basicPayMonth3?: number;
  /** Amount requested (salary advance) */
  amountRequested?: number;

  // ── General Loan fields ───────────────────────────────────────────────────
  employmentType?: EmploymentType;
  isFirstTimeApplicant?: boolean;
  kraPin?: string;
  lastEarningsMonth1?: number;
  lastEarningsMonth2?: number;
  lastEarningsMonth3?: number;
  amountApplied?: number;

  // ── Shared bio (all loan types) ───────────────────────────────────────────
  customerName: string;
  idNumber: string;
  phoneNumber: string;
  emailAddress: string;

  // ── Purpose of loan ───────────────────────────────────────────────────────
  loanPurpose?: string;

  // ── Company name (Employed general loan / hardcoded for salary advance) ───
  companyName?: string;

  // ── Supporting documents ──────────────────────────────────────────────────
  bankStatementUrl?: string;
  mpesaStatementUrl?: string;
  payslipUrl?: string;
  idCopyUrl?: string;
  kraPinDocUrl?: string;

  termsAccepted: boolean;

  // ── Admin-only fields ─────────────────────────────────────────────────────
  adminNotes?: string;
}
