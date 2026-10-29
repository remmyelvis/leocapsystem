import { calculateSalaryAdvance, calculateSalaryAdvanceForAmount, estimateGeneralLoan } from "@/lib/loanCalculations";
import { LOAN_SETTINGS } from "@/configs/loanSettings";

// The assistant's "check my numbers": the same maths the application forms use (lib/loanCalculations.ts), fed one figure.
// The forms ask for the last 3 months of basic pay; here one rough figure stands for all three, so the result is an estimate.

export type Loan = "advance" | "personal";

export interface Estimate {
  amount: number;
  fees: number;
  receive: number;
  /** Only the salary advance has a fixed rate, so only it can say what is repaid. */
  repay?: number;
}

export const kes = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;

export function estimate(loan: Loan, pay: number): Estimate | null {
  if (loan === "advance") {
    const r = calculateSalaryAdvance(pay, pay, pay);
    return r.disbursementAmount > 0 ? { amount: r.loanAmount, fees: r.loanAmount - r.disbursementAmount, receive: r.disbursementAmount, repay: r.repaymentAmount } : null;
  }
  const r = estimateGeneralLoan(pay, pay, pay);
  return r.estimatedDisbursement > 0 ? { amount: r.maxLoanAmount, fees: r.maxLoanAmount - r.estimatedDisbursement, receive: r.estimatedDisbursement } : null;
}

/** What a chosen amount of this loan would pay out (and, for a salary advance, repay). Shared by the assistant and the borrower calculator. */
export function quote(loan: Loan, amount: number): Estimate {
  if (loan === "advance") {
    const r = calculateSalaryAdvanceForAmount(amount);
    return { amount, fees: amount - r.disbursementAmount, receive: r.disbursementAmount, repay: r.repaymentAmount };
  }
  const { processingFeeRate, accessFeeRate, legalFees } = LOAN_SETTINGS.generalLoan;
  const receive = amount - amount * processingFeeRate - amount * accessFeeRate - legalFees;
  return { amount, fees: amount - receive, receive };
}

const MIN_PAY = 1_000;
const MAX_PAY = 5_000_000;

/** Reads what a person types for their pay: "50000", "50,000", "KES 50k", "1.2m", "my pay is 80k". */
export function parsePay(input: string): number | "low" | "high" | null {
  const m = input.toLowerCase().replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|m)?\b/);
  if (!m) return null;
  const n = parseFloat(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  if (!isFinite(n)) return null;
  return n < MIN_PAY ? "low" : n > MAX_PAY ? "high" : Math.round(n);
}
