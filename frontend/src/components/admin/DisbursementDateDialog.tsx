import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal";
import { apiCall } from "@/lib/apiClient";
import type { ApplicationDetails } from "@/lib/adminApi";
import { getLoanTypeDisplay } from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";

// Enter, correct or remove the date a loan was disbursed. Loans disbursed before the platform kept a change history have
// none; this is how the owner's own records get in. A date entered here wins over the one the platform recorded.

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const longDay = (d: Date) => d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
const field = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue";

export default function DisbursementDateDialog({ loan, onClose, onSaved }: { loan: ApplicationDetails; onClose: () => void; onSaved: () => void }) {
  const current = loan.disbursed_at ? new Date(loan.disbursed_at) : null;
  const source = loan.disbursed_at_source ?? null;
  const startDate = current ? ymd(current) : "";
  const applied = loan.created_at ? new Date(loan.created_at) : null;
  const [date, setDate] = useState(startDate);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => { if (!saving) onClose(); };
  const send = async (body: { date: string | null; reason?: string }, done: string) => {
    setSaving(true);
    const res = await apiCall(`/api/applications/disbursement-date/${loan.id}`, { method: "PATCH", body });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(done);
    onSaved();
  };

  const changed = !!date && date !== startDate;
  const earlierThanApplied = changed && !!applied && date < ymd(applied); // only for the date being entered, not one already saved
  const what =
    source === "entered"
      ? "This date was entered by hand. Removing it brings back the date the platform recorded, if there is one."
      : source === "history"
        ? `Recorded automatically on ${current ? longDay(current) : ""}, when the loan was marked as disbursed. If that is wrong, enter the right date.`
        : "No date is on record for this loan. It was probably disbursed before the platform kept a history. Enter the date from your records.";

  return (
    <ModalShell titleId="disb-date-title" onClose={close}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <CalendarDays className="h-5 w-5 text-blue-800" />
        </div>
        <div className="min-w-0">
          <h3 id="disb-date-title" className="text-[15px] font-bold text-slate-900">Disbursement date</h3>
          <p className="mt-0.5 text-[13px] text-slate-600">
            {getLoanTypeDisplay(loan.loan_type ?? "")} <span className="font-mono">#{loan.id?.slice(0, 8)}</span> · {KES.format(Number(loan.amount_applied) || 0)}
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 ring-1 ring-slate-200">{what}</p>

      <label htmlFor="disb-date" className="mt-3 block text-xs font-semibold text-slate-700">Date disbursed</label>
      <input
        id="disb-date"
        type="date"
        max={ymd(new Date())}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={cn(field, "mt-1 w-full")}
      />
      {earlierThanApplied && applied && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 ring-1 ring-amber-200" role="status">
          This is earlier than {longDay(applied)}, the day the loan was applied for on the platform. That is normal for a loan from before the platform, so you can still save it.
        </p>
      )}

      <label htmlFor="disb-reason" className="mt-3 block text-xs font-semibold text-slate-700">
        Reason <span className="font-normal text-slate-600">(optional, saved in the loan's change history)</span>
      </label>
      <input
        id="disb-reason"
        value={reason}
        maxLength={200}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. From the 2025 loan register"
        className={cn(field, "mt-1 w-full placeholder:text-slate-500")}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {source === "entered" && (
          <button
            type="button"
            onClick={() => send({ date: null, reason: reason.trim() }, "The date you entered was removed")}
            disabled={saving}
            className="mr-auto text-[13px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-800 disabled:opacity-50"
          >
            Remove the date I entered
          </button>
        )}
        <div className={cn("flex gap-3", source === "entered" ? "" : "w-full")}>
          <Button variant="outline" className="flex-1 rounded-lg" onClick={close} disabled={saving}>Cancel</Button>
          <Button
            className="flex-1 rounded-lg bg-blue-900 font-bold text-white hover:bg-slate-800"
            onClick={() => send({ date, reason: reason.trim() }, "Disbursement date saved")}
            disabled={saving || !changed}
          >
            {saving ? "Saving…" : "Save date"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
