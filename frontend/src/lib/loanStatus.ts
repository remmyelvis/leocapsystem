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
