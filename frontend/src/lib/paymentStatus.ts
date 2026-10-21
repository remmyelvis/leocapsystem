import type { PaymentStatus } from "@/types/loan";

/** The payment status shown to an applicant for a loan's repayment_status as the server stores it. */
export function paymentStatusFromRepayment(repaymentStatus: unknown): PaymentStatus | undefined {
  const value = typeof repaymentStatus === "string" ? repaymentStatus.toLowerCase() : "";
  if (value === "paid" || value === "fully_paid") return "FULLY_PAID";
  if (value === "partially_paid") return "PARTIALLY_PAID";
  if (value === "delinquent") return "DELINQUENT";
  if (value === "unpaid" || value === "defaulted") return "UNPAID";
  return undefined;
}
