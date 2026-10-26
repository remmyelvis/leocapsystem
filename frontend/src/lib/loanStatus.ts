// One label + badge colour per loan status for the applicant portal, whatever case the API or page uses
// ("pending_processing", "PENDING", "Pending" all read "Pending Review").
const STATUSES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  pending_processing: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
  amended: { label: "Amended", className: "bg-blue-100 text-blue-700" },
  rate_set: { label: "Review Rate", className: "bg-indigo-100 text-indigo-700" },
  rate_confirmed: { label: "Rate Accepted", className: "bg-cyan-100 text-cyan-700" },
  confirmed: { label: "Confirmed", className: "bg-cyan-100 text-cyan-700" },
  rate_declined: { label: "Rate Declined", className: "bg-orange-100 text-orange-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  declined: { label: "Declined", className: "bg-red-100 text-red-700" },
  rejected: { label: "Declined", className: "bg-red-100 text-red-700" },
  disbursed: { label: "Disbursed", className: "bg-blue-100 text-blue-700" },
};

export function statusDisplay(status?: string | null): { label: string; className: string } {
  const key = (status ?? "").toLowerCase();
  return (
    STATUSES[key] ?? {
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—",
      className: "bg-slate-100 text-slate-700",
    }
  );
}

// A loan in one of these states was never paid out, so it can be deleted without erasing money that moved. Any other state
// (disbursed, defaulted, written off, paid, ...) cannot. The server decides too: NEVER_PAID_OUT in backend/website/application.py.
const NEVER_PAID_OUT = new Set(["pending", "pending_processing", "processing", "amended", "rate_set", "rate_confirmed", "confirmed", "rate_declined", "approved", "declined", "rejected"]);

export const canDeleteApplication = (status?: string | null) => NEVER_PAID_OUT.has((status ?? "").toLowerCase().replace(/[\s-]/g, "_"));

// Workflow order for sorting a Status column: what needs someone's attention first, finished things last (ascending).
// Keep in step with STATUS_ORDER in backend/website/reports.py (which sorts the paged lists on the server).
const STATUS_ORDER = [
  "delinquent", "escalated", "defaulted",                      // overdue trouble
  "pending", "pending_processing", "processing", "amended",    // waiting for a decision
  "rate_confirmed", "confirmed",                               // the borrower accepted: approve
  "approved",                                                  // approved: pay out
  "rate_set",                                                  // waiting for the borrower
  "disbursed",                                                 // paid out (when only the loan status is shown)
  "unpaid", "partially_paid",                                  // being repaid
  "paid",
  "rate_declined", "written_off", "declined", "rejected",      // closed without being repaid
];

/** Where a loan status or a repayment status sits in the workflow order (unknown ones last). */
export const statusRank = (status?: string | null) => {
  const i = STATUS_ORDER.indexOf((status ?? "").toLowerCase().replace(/[\s-]/g, "_"));
  return i < 0 ? STATUS_ORDER.length : i;
};
