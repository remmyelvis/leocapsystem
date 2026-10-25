import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AlertTriangle, ArrowDown, ArrowUp, Download, FileText, Lock, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { apiCall, downloadFile } from "@/lib/apiClient";
import type { AdminApplicationItem } from "@/lib/adminApi";
import { getLoanTypeDisplay } from "@/hooks/useAdminData";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types and small helpers
// ---------------------------------------------------------------------------

type Kind = "loan" | "interest" | "payment" | "charge" | "writeoff";

interface Entry {
  id: string;
  application_id: string | null;
  kind: Kind;
  locked: string | null; // why this row cannot be deleted, or null
  date: string | null;
  memo: string;
  debit: string;
  credit: string;
  balance: string;
}

interface Preview {
  entry: { id: string; memo: string; kind: Kind; debit: number; credit: number; date: string | null };
  loan?: { balance_before: number; balance_after: number; status_before: string; status_after: string; in_credit: number; later_rows: number };
}

interface AmendPreview {
  entry: { id: string; memo: string; kind: Kind; amount: number; date: string | null };
  new: { memo: string; amount: number; date: string | null };
  changes: string[];
  loan?: { balance_before: number; balance_after: number; status_before: string; status_after: string; in_credit: number; rows_rebalanced: number; repayment_before?: number; repayment_after?: number };
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value: number | string) => KES.format(Number(value) || 0);
const amountOrDash = (value: string) => (Number(value) ? money(value) : "—");

const KINDS: { kind: Kind; label: string; badge: string }[] = [
  { kind: "payment", label: "Payments", badge: "bg-emerald-100 text-emerald-800" },
  { kind: "interest", label: "Interest", badge: "bg-amber-100 text-amber-800" },
  { kind: "charge", label: "Charges", badge: "bg-rose-100 text-rose-800" },
  { kind: "loan", label: "Loan", badge: "bg-slate-100 text-slate-700" },
  { kind: "writeoff", label: "Write-offs", badge: "bg-violet-100 text-violet-800" },
];
const KIND_BADGE = Object.fromEntries(KINDS.map((k) => [k.kind, k.badge])) as Record<Kind, string>;
const KIND_NAME: Record<Kind, string> = { payment: "Payment", interest: "Interest", charge: "Charge", loan: "Loan", writeoff: "Write-off" };

// Dates are compared as the YYYY-MM-DD the server stored, so a late-evening row never slips into another day.
const dayOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fmtDay = (iso: string | null) => {
  const d = dayOf(iso);
  if (!d) return "—";
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const statusText = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

type Range = "all" | "month" | "30" | "90" | "custom";
const RANGES: { value: Range; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

function rangeDates(range: Range, from: string, to: string) {
  const now = new Date();
  const today = ymd(now);
  if (range === "month") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  if (range === "30" || range === "90") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - Number(range))), to: today };
  if (range === "custom") return { from, to };
  return { from: "", to: "" };
}

const chip = (on: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40",
    on ? "bg-brand-blue text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
  );
const field = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue";

// ---------------------------------------------------------------------------
// Dialog shell: rendered on the page itself (not inside the section) so the dimming also covers the app's header and
// sidebar; Escape and a click outside close it, scrolling behind it is locked, and focus goes back to what opened it
// ---------------------------------------------------------------------------

function ModalShell({ titleId, onClose, children }: { titleId: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    box.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; opener?.focus?.(); };
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation: asks the server what the deletion would do first, shows it, then deletes on request
// ---------------------------------------------------------------------------

function DeleteEntryDialog({ entry, loanTag, onClose, onDeleted }: { entry: Entry; loanTag: string | null; onClose: () => void; onDeleted: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    apiCall<Preview>(`/api/applications/statement-entry/${entry.id}?dry_run=1`, { method: "DELETE" }).then((res) => {
      if (!alive) return;
      if (res.error || !res.data) setPreviewError(res.error ?? "Could not check this entry.");
      else setPreview(res.data);
    });
    return () => { alive = false; };
  }, [entry.id]);

  const close = () => { if (!deleting) onClose(); };

  const confirm = async () => {
    setDeleting(true);
    const res = await apiCall(`/api/applications/statement-entry/${entry.id}`, { method: "DELETE", body: { reason: reason.trim() } });
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Entry deleted and the loan's balance corrected");
    onDeleted();
  };

  const loan = preview?.loan;
  const paid = Number(entry.credit) > 0;
  const statusChanges = loan && loan.status_before !== loan.status_after;

  return (
    <ModalShell titleId="del-entry-title" onClose={close}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-700" />
          </div>
          <div>
            <h3 id="del-entry-title" className="text-[15px] font-bold text-slate-900">Delete this entry?</h3>
            <p className="mt-0.5 text-[13px] text-slate-600">Use this for something recorded in error. The loan's balance is corrected to match.</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-[13px] font-semibold text-slate-900">{entry.memo}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", KIND_BADGE[entry.kind])}>{KIND_NAME[entry.kind]}</span>
                <span>{fmtDay(entry.date)}</span>
                {loanTag && <span>{loanTag}</span>}
              </p>
            </div>
            <p className={cn("shrink-0 text-right text-[13px] font-bold tabular-nums", paid ? "text-emerald-700" : "text-red-700")}>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{paid ? "Paid" : "Charged"}</span>
              {money(paid ? entry.credit : entry.debit)}
            </p>
          </div>
        </div>

        <div className="mt-3 min-h-[72px] text-[13px]" aria-live="polite">
          {previewError ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800 ring-1 ring-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {previewError}
            </p>
          ) : !preview ? (
            <div className="space-y-2" aria-label="Checking what this would change">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          ) : loan ? (
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-baseline justify-between gap-3">
                <span>Balance owed on this loan</span>
                <span className="font-semibold tabular-nums text-slate-900">{money(loan.balance_before)} <span className="text-slate-500">→</span> {money(loan.balance_after)}</span>
              </li>
              {statusChanges && (
                <li className="flex items-baseline justify-between gap-3">
                  <span>Loan status</span>
                  <span className="font-semibold text-slate-900">{statusText(loan.status_before)} <span className="text-slate-500">→</span> {statusText(loan.status_after)}</span>
                </li>
              )}
              {loan.later_rows > 0 && <li>{loan.later_rows} later {loan.later_rows === 1 ? "entry" : "entries"} on this loan will be re-balanced.</li>}
              {loan.in_credit > 0 && <li className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">The borrower has paid {money(loan.in_credit)} more than is now owed.</li>}
              {entry.kind === "interest" && <li className="text-xs text-slate-600">The loan's due date is not changed.</li>}
              {loan.status_before === "paid" && loan.status_after !== "paid" && <li className="text-xs text-slate-600">A repayment email already sent to the borrower cannot be recalled.</li>}
            </ul>
          ) : (
            <p className="text-slate-600">This entry is not attached to a loan, so no balance changes.</p>
          )}
        </div>

        <label className="mt-3 block text-xs font-semibold text-slate-600" htmlFor="del-entry-reason">
          Reason <span className="font-normal text-slate-500">(optional, saved in the loan's change history)</span>
        </label>
        <input
          id="del-entry-reason"
          value={reason}
          maxLength={200}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Payment entered twice"
          className={cn(field, "mt-1 w-full placeholder:text-slate-500")}
        />

        <div className="mt-4 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-lg" onClick={close} disabled={deleting}>Cancel</Button>
          <Button className="flex-1 rounded-lg bg-red-700 font-bold text-white hover:bg-red-800" onClick={confirm} disabled={deleting || !preview}>
            {deleting ? "Deleting…" : "Delete entry"}
          </Button>
        </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Edit an entry: the server previews every change as it is typed (balance, status, lines re-balanced), then saves it
// ---------------------------------------------------------------------------

function AmendEntryDialog({ entry, loanTag, onClose, onSaved }: { entry: Entry; loanTag: string | null; onClose: () => void; onSaved: () => void }) {
  const isPayment = Number(entry.credit) > 0;
  const startAmount = String(Number(isPayment ? entry.credit : entry.debit));
  const startDate = entry.date ? entry.date.slice(0, 16) : "";
  const [amount, setAmount] = useState(startAmount);
  const [date, setDate] = useState(startDate);
  const [description, setDescription] = useState(entry.memo);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<AmendPreview | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = Number(amount) > 0 && description.trim().length >= 3 && !!date;
  const touched = Number(amount) !== Number(startAmount) || date !== startDate || description.trim() !== entry.memo;
  const body = { amount: Number(amount), date, description: description.trim() };
  const nowValue = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })();

  // ask the server what this change would do, a moment after typing stops
  useEffect(() => {
    setPreview(null);
    setProblem(null);
    if (!touched || !valid) { setChecking(false); return; }
    setChecking(true);
    let alive = true;
    const timer = setTimeout(async () => {
      const res = await apiCall<AmendPreview>(`/api/applications/statement-entry/${entry.id}?dry_run=1`, { method: "PATCH", body });
      if (!alive) return;
      setChecking(false);
      if (res.error || !res.data) setProblem(res.error ?? "Could not check this change.");
      else setPreview(res.data);
    }, 450);
    return () => { alive = false; clearTimeout(timer); };
  }, [amount, date, description]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { if (!saving) onClose(); };
  const save = async () => {
    setSaving(true);
    const res = await apiCall(`/api/applications/statement-entry/${entry.id}`, { method: "PATCH", body: { ...body, reason: reason.trim() } });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Entry updated and the loan's balance corrected");
    onSaved();
  };

  const loan = preview?.loan;
  const statusChanges = loan && loan.status_before !== loan.status_after;
  const label = "block text-xs font-semibold text-slate-700";

  return (
    <ModalShell titleId="amend-entry-title" onClose={close}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Pencil className="h-5 w-5 text-blue-800" />
        </div>
        <div>
          <h3 id="amend-entry-title" className="text-[15px] font-bold text-slate-900">Edit this entry</h3>
          <p className="mt-0.5 text-[13px] text-slate-600">Correct the amount, date or description. The loan's balance and the lines after this one follow.</p>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", KIND_BADGE[entry.kind])}>{KIND_NAME[entry.kind]}</span>
        {loanTag && <span>{loanTag}</span>}
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="amend-amount" className={label}>{isPayment ? "Amount paid (KES)" : "Amount charged (KES)"}</label>
          <input id="amend-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onWheel={(e) => e.currentTarget.blur()} className={cn(field, "mt-1 w-full tabular-nums")} />
        </div>
        <div>
          <label htmlFor="amend-date" className={label}>Date &amp; time</label>
          <input id="amend-date" type="datetime-local" max={nowValue} value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, "mt-1 w-full")} />
        </div>
        <div>
          <label htmlFor="amend-description" className={label}>Description</label>
          <input id="amend-description" type="text" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} className={cn(field, "mt-1 w-full")} />
          {entry.kind === "interest" && <p className="mt-1 text-xs text-slate-600">This does not change by itself: if the percentage in the description no longer applies, update it here.</p>}
          {isPayment && /^Partially paid [\d.,]+$/.test(entry.memo) && <p className="mt-1 text-xs text-slate-600">It follows the amount unless you write something else.</p>}
        </div>
      </div>

      <div className="mt-3 min-h-[60px] text-[13px]" aria-live="polite">
        {!touched ? (
          <p className="text-slate-600">Change something to see what it would do to the loan.</p>
        ) : !valid ? (
          <p className="text-slate-600">Enter an amount above zero, a date, and a description of at least 3 characters.</p>
        ) : problem ? (
          <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800 ring-1 ring-red-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problem}</p>
        ) : checking || !preview ? (
          <div className="space-y-2" aria-label="Checking what this would change">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        ) : loan ? (
          <ul className="space-y-1.5 text-slate-700">
            <li className="flex items-baseline justify-between gap-3">
              <span>Balance owed on this loan</span>
              {loan.balance_before === loan.balance_after
                ? <span className="font-semibold tabular-nums text-slate-900">unchanged ({money(loan.balance_after)})</span>
                : <span className="font-semibold tabular-nums text-slate-900">{money(loan.balance_before)} <span className="text-slate-500">→</span> {money(loan.balance_after)}</span>}
            </li>
            {loan.repayment_before !== undefined && loan.repayment_after !== undefined && loan.repayment_before !== loan.repayment_after && (
              <li className="flex items-baseline justify-between gap-3">
                <span>Loan repayment total</span>
                <span className="font-semibold tabular-nums text-slate-900">{money(loan.repayment_before)} <span className="text-slate-500">→</span> {money(loan.repayment_after)}</span>
              </li>
            )}
            {statusChanges && (
              <li className="flex items-baseline justify-between gap-3">
                <span>Loan status</span>
                <span className="font-semibold text-slate-900">{statusText(loan.status_before)} <span className="text-slate-500">→</span> {statusText(loan.status_after)}</span>
              </li>
            )}
            {preview.changes.includes("description") && preview.new.memo !== description.trim() && (
              <li>The description will read: <span className="font-semibold text-slate-900">{preview.new.memo}</span></li>
            )}
            {loan.rows_rebalanced > 0 && <li>{loan.rows_rebalanced} other {loan.rows_rebalanced === 1 ? "line" : "lines"} on this loan will be re-balanced.</li>}
            {loan.in_credit > 0 && <li className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">The borrower would then have paid {money(loan.in_credit)} more than is owed.</li>}
          </ul>
        ) : (
          <p className="text-slate-600">This entry is not attached to a loan, so no balance changes.</p>
        )}
      </div>

      <label className="mt-3 block text-xs font-semibold text-slate-700" htmlFor="amend-reason">
        Reason <span className="font-normal text-slate-600">(optional, saved in the loan's change history)</span>
      </label>
      <input id="amend-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The slip said 2,500" className={cn(field, "mt-1 w-full placeholder:text-slate-500")} />

      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="flex-1 rounded-lg" onClick={close} disabled={saving}>Cancel</Button>
        <Button className="flex-1 rounded-lg bg-blue-900 font-bold text-white hover:bg-slate-800" onClick={save} disabled={saving || !touched || !valid || checking || !!problem || !preview}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// The statement
// ---------------------------------------------------------------------------

interface Props {
  applicantId: string;
  applicantName: string;
  loans: AdminApplicationItem[];
  onChanged: () => void; // a deletion changes a loan's balance and status: the page refreshes its loan list
}

export default function ApplicantStatement({ applicantId, applicantName, loans, onChanged }: Props) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loan, setLoan] = useState("all");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [newestFirst, setNewestFirst] = useState(true);
  const [statementDate, setStatementDate] = useState(ymd(new Date()));
  const [downloading, setDownloading] = useState(false);
  const [target, setTarget] = useState<Entry | null>(null); // the entry being deleted
  const [amending, setAmending] = useState<Entry | null>(null); // the entry being edited

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await apiCall<{ data: Entry[] }>(`/api/applicant/statement/${applicantId}`);
    if (res.error) setLoadError(res.error);
    else setEntries(res.data?.data ?? []);
  }, [applicantId]);

  useEffect(() => {
    setEntries(null);
    load();
  }, [load]);

  // Loans that have rows on the statement, newest loan first (the page sorts its loans that way)
  const loanInfo = useMemo(() => new Map(loans.map(({ application: a }) => [a.id as string, a])), [loans]);
  const loanIds = useMemo(() => {
    const present = new Set((entries ?? []).map((e) => e.application_id).filter(Boolean) as string[]);
    const known = loans.map(({ application: a }) => a.id as string).filter((id) => present.has(id));
    return known.concat(Array.from(present).filter((id) => !known.includes(id)));
  }, [entries, loans]);
  const tag = (id: string) => `#${id.slice(0, 8)}`;
  const loanName = (id: string) => `${getLoanTypeDisplay(loanInfo.get(id)?.loan_type ?? "")} ${tag(id)}`.trim();
  const manyLoans = loanIds.length > 1;

  // ---- filtering (all in the browser: instant, and the type counts follow the other filters)
  const { from: rFrom, to: rTo } = rangeDates(range, from, to);
  const badRange = !!rFrom && !!rTo && rFrom > rTo;
  const q = search.trim().toLowerCase().replace(/,/g, "").replace(/^#/, "");
  const inView = (e: Entry, withKind: boolean) => {
    if (loan !== "all" && e.application_id !== loan) return false;
    if (withKind && kind !== "all" && e.kind !== kind) return false;
    const d = dayOf(e.date);
    if (rFrom && d < rFrom) return false;
    if (rTo && d > rTo) return false;
    if (q && !`${e.memo} ${Number(e.debit) || Number(e.credit)} ${e.application_id ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  };

  const all = entries ?? [];
  const counts: Record<string, number> = {};
  all.filter((e) => inView(e, false)).forEach((e) => { counts[e.kind] = (counts[e.kind] ?? 0) + 1; });
  const visible = all.filter((e) => inView(e, true)).sort((a, b) => Date.parse(a.date ?? "") - Date.parse(b.date ?? ""));
  if (newestFirst) visible.reverse();

  const charged = visible.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
  const paidIn = visible.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
  // What is owed now, from the loans themselves (the same rule as the dashboard): the selected loan, or all of them
  const owed = loans
    .filter(({ application: a }) => loan === "all" || a.id === loan)
    .reduce((sum, { application: a }) => {
      if (a.loan_status !== "disbursed" || a.repayment_status === "paid") return sum;
      const tracked = Number(a.outstanding_balance) || 0;
      return sum + (tracked > 0 ? tracked : Number(a.repayment_amount) || 0);
    }, 0);

  const filtering = loan !== "all" || kind !== "all" || range !== "all" || q !== "";
  const clearFilters = () => { setLoan("all"); setKind("all"); setRange("all"); setFrom(""); setTo(""); setSearch(""); };

  // ---- PDF: follows the loan and dates chosen (the server needs both dates, or none)
  const handleDownload = async () => {
    setDownloading(true);
    const qs = new URLSearchParams();
    if (rFrom || rTo) {
      qs.set("start_date", rFrom || "2000-01-01");
      qs.set("end_date", rTo || ymd(new Date()));
    }
    if (loan !== "all") qs.set("application_id", loan);
    if (statementDate) qs.set("request_date", statementDate);
    const slug = applicantName.trim().replace(/\s+/g, "_") || "applicant";
    const { error } = await downloadFile(`/api/applicant/statement/download/${applicantId}?${qs}`, `statement_${slug}${loan !== "all" ? `_${loan.slice(0, 8)}` : ""}.pdf`);
    setDownloading(false);
    if (error) toast.error(error);
    else toast.success("Statement downloaded");
  };

  const SortIcon = newestFirst ? ArrowDown : ArrowUp;
  const actionCell = (e: Entry) =>
    e.locked ? (
      <Tip label={e.locked} side="left">
        <span tabIndex={0} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40">
          <Lock className="h-3.5 w-3.5" />
          <span className="sr-only">Cannot be changed or deleted: {e.locked}</span>
        </span>
      </Tip>
    ) : (
      <span className="inline-flex items-center max-sm:flex-col">
        <Tip label="Edit amount, date or description" side="left">
          <button
            onClick={() => setAmending(e)}
            aria-label={`Edit entry: ${e.memo}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-blue-800 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </Tip>
        <Tip label="Delete (recorded in error)" side="left">
          <button
            onClick={() => setTarget(e)}
            aria-label={`Delete entry: ${e.memo}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </Tip>
      </span>
    );

  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-900">
            <FileText className="h-4 w-4 text-brand-blue" /> Applicant Statement
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            {entries === null ? "Loading…" : `${all.length} ${all.length === 1 ? "entry" : "entries"}${manyLoans ? ` across ${loanIds.length} loans` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="stmt-date" className="block text-[10px] font-semibold uppercase tracking-wide text-slate-600">Date on the PDF</label>
            <input id="stmt-date" type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} className={cn(field, "py-1.5")} />
          </div>
          <Tip label="The PDF covers the loan and dates chosen below" wrap>
            <Button
              onClick={handleDownload}
              disabled={downloading || all.length === 0 || badRange}
              className="h-9 rounded-lg bg-blue-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {downloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </Tip>
          <Tip label="Refresh">
            <button
              onClick={() => { setEntries(null); load(); }}
              aria-label="Refresh the statement"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
            >
              <RefreshCw className={cn("h-4 w-4", entries === null && !loadError && "animate-spin")} />
            </button>
          </Tip>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-[13px] text-red-800 ring-1 ring-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {loadError}
          <button onClick={() => { setEntries(null); load(); }} className="ml-auto font-semibold underline underline-offset-2">Try again</button>
        </div>
      ) : entries === null ? (
        <div className="space-y-2" aria-label="Loading the statement">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : all.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-600">
          No statement entries yet. They appear when a loan is applied for, charged or paid.
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  aria-label="Search the statement"
                  placeholder="Search description or amount"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(field, "w-full pl-9 placeholder:text-slate-500")}
                />
              </div>
              {manyLoans && (
                <select aria-label="Loan" value={loan} onChange={(e) => setLoan(e.target.value)} className={cn(field, "sm:max-w-[20rem] sm:min-w-[14rem]")}>
                  <option value="all">All loans ({loanIds.length})</option>
                  {loanIds.map((id) => {
                    const a = loanInfo.get(id);
                    return <option key={id} value={id}>{loanName(id)}{a ? ` · ${money(a.amount_applied ?? 0)} · ${statusText(a.repayment_status ?? a.loan_status ?? "")}` : ""}</option>;
                  })}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Dates">
              {RANGES.map((r) => (
                <button key={r.value} aria-pressed={range === r.value} onClick={() => setRange(r.value)} className={chip(range === r.value)}>{r.label}</button>
              ))}
              {range === "custom" && (
                <span className="ml-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                  <input type="date" aria-label="From date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={cn(field, "py-1")} />
                  to
                  <input type="date" aria-label="To date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={cn(field, "py-1")} />
                </span>
              )}
            </div>
            {badRange && <p className="text-xs font-semibold text-red-700">The start date is after the end date.</p>}

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Type of entry">
              <button aria-pressed={kind === "all"} onClick={() => setKind("all")} className={chip(kind === "all")}>
                All <span className={kind === "all" ? "text-white/80" : "text-slate-500"}>{Object.values(counts).reduce((s, n) => s + n, 0)}</span>
              </button>
              {KINDS.filter(({ kind: k }) => all.some((e) => e.kind === k)).map(({ kind: k, label }) => (
                <button key={k} aria-pressed={kind === k} onClick={() => setKind(kind === k ? "all" : k)} className={chip(kind === k)}>
                  {label} <span className={kind === k ? "text-white/80" : "text-slate-500"}>{counts[k] ?? 0}</span>
                </button>
              ))}
              {filtering && (
                <button onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-brand-blue">
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
            {(kind !== "all" || q) && <p className="text-xs text-slate-600">The PDF covers the loan and dates chosen; the type and the search only narrow this list.</p>}
          </div>

          {/* Totals for what is shown */}
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              { label: "Charged", note: "in this view", value: charged, cls: "text-red-700" },
              { label: "Paid", note: "in this view", value: paidIn, cls: "text-emerald-700" },
              { label: "Balance owed", note: loan === "all" ? "now, all loans" : "now, this loan", value: owed, cls: "text-slate-900" },
            ].map((t) => (
              // phones: one row per figure (label and note left, amount right), so seven-figure amounts always fit
              <div key={t.label} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{t.label}</dt>
                <dd className={cn("mt-0.5 break-normal text-[15px] font-bold tabular-nums max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:mt-0 max-sm:self-center max-sm:text-right", t.cls)}>{money(t.value)}</dd>
                <dd className="text-[10px] text-slate-500">{t.note}</dd>
              </div>
            ))}
          </dl>

          {/* Entries */}
          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-600">
              Nothing matches these filters.{" "}
              <button onClick={clearFilters} className="font-semibold text-brand-blue underline underline-offset-2">Clear filters</button>
            </div>
          ) : (
            <div>
              <p className="mb-1.5 text-xs text-slate-600">
                Showing {visible.length} of {all.length}. <span className="text-slate-500">Each balance is that loan's running balance after the entry.</span>
              </p>

              {/* Tablets and up: a table */}
              <div className="hidden max-h-[28rem] overflow-auto rounded-lg ring-1 ring-slate-200 md:block">
                <table className="w-full text-left text-[13px]">
                  <caption className="sr-only">Statement entries</caption>
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-600 shadow-[0_1px_0_0_theme(colors.slate.200)]">
                    <tr>
                      <th scope="col" className="px-4 py-2.5" aria-sort={newestFirst ? "descending" : "ascending"}>
                        <Tip label={newestFirst ? "Newest first: click for oldest first" : "Oldest first: click for newest first"} side="bottom" align="start">
                          <button onClick={() => setNewestFirst((v) => !v)} className="inline-flex items-center gap-1 font-bold uppercase tracking-wide hover:text-brand-blue">
                            Date <SortIcon className="h-3 w-3" />
                          </button>
                        </Tip>
                      </th>
                      <th scope="col" className="px-4 py-2.5">Entry</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Charged</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Paid</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Balance</th>
                      <th scope="col" className="w-[4.75rem] px-2 py-2.5"><span className="sr-only">Edit or delete</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visible.map((e) => (
                      <tr key={e.id} className="bg-white hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">{fmtDay(e.date)}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-900">{e.memo}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                            <span className={cn("rounded-full px-2 py-0.5 font-semibold", KIND_BADGE[e.kind])}>{KIND_NAME[e.kind]}</span>
                            {manyLoans && e.application_id && <Tip label="Show only this loan"><button onClick={() => setLoan(e.application_id!)} className="hover:text-brand-blue hover:underline">{loanName(e.application_id)}</button></Tip>}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-red-700">{amountOrDash(e.debit)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-emerald-700">{amountOrDash(e.credit)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(e.balance)}</td>
                        <td className="px-2 py-2.5 text-right">{actionCell(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones: one card per entry */}
              <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto rounded-lg ring-1 ring-slate-200 md:hidden">
                {visible.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 bg-white px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[13px] font-medium text-slate-900">{e.memo}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span className={cn("rounded-full px-2 py-0.5 font-semibold", KIND_BADGE[e.kind])}>{KIND_NAME[e.kind]}</span>
                        <span>{fmtDay(e.date)}</span>
                        {manyLoans && e.application_id && <span>{loanName(e.application_id)}</span>}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">Balance <span className="font-semibold tabular-nums text-slate-900">{money(e.balance)}</span></p>
                    </div>
                    <div className="shrink-0 text-right">
                      {Number(e.credit) > 0 ? (
                        <p className="text-[13px] font-bold tabular-nums text-emerald-700"><span className="block text-[10px] font-semibold uppercase text-slate-500">Paid</span>{money(e.credit)}</p>
                      ) : (
                        <p className="text-[13px] font-bold tabular-nums text-red-700"><span className="block text-[10px] font-semibold uppercase text-slate-500">Charged</span>{money(e.debit)}</p>
                      )}
                    </div>
                    <div className="shrink-0">{actionCell(e)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {amending && (
        <AmendEntryDialog
          entry={amending}
          loanTag={amending.application_id ? loanName(amending.application_id) : null}
          onClose={() => setAmending(null)}
          onSaved={() => { setAmending(null); setEntries(null); load(); onChanged(); }}
        />
      )}

      {target && (
        <DeleteEntryDialog
          entry={target}
          loanTag={target.application_id ? loanName(target.application_id) : null}
          onClose={() => setTarget(null)}
          onDeleted={() => { setTarget(null); setEntries(null); load(); onChanged(); }}
        />
      )}
    </div>
  );
}
