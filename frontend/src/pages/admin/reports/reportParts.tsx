import { formatName } from "@/lib/formatName";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText,
  Loader2, RefreshCw, Search, SearchX, X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared types, labels and formatters
// ---------------------------------------------------------------------------

export interface LoanRow {
  id: string;
  applicant_name?: string;
  applicant_id?: string;
  company: string;
  created_at: string;
  loan_type: string;
  amount_applied: string;
  disbursement_amount?: string;
  repayment_amount: string;
  outstanding_balance?: string;
  loan_status: string;
  repayment_status: string;
  due_date?: string | null;
}

export interface Filters {
  search: string;
  company: string;
  loanType: string;
  loanStatus: string;
  repayment: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_FILTERS: Filters = {
  search: "", company: "all", loanType: "all", loanStatus: "all", repayment: "all", startDate: "", endDate: "",
};

export type Bucket = { count: number; amount: number };
export type Aging = Record<string, Bucket>;

export const BUCKETS = [
  { key: "current", label: "Not yet due", color: "#10B981" },
  { key: "1-30", label: "1 to 30 days late", color: "#F59E0B" },
  { key: "31-60", label: "31 to 60 days late", color: "#F97316" },
  { key: "61-90", label: "61 to 90 days late", color: "#E11D48" },
  { key: "90+", label: "Over 90 days late", color: "#9F1239" },
] as const;

const LOAN_TYPES: Record<string, string> = { salary_advance: "Salary advance", personal: "Personal loan" };
const LOAN_STATUSES: Record<string, string> = {
  pending_processing: "Pending", approved: "Approved", disbursed: "Disbursed", rejected: "Rejected", written_off: "Written off",
};
const REPAYMENTS: Record<string, string> = {
  unpaid: "Unpaid", partially_paid: "Partly paid", paid: "Paid", delinquent: "Delinquent", escalated: "Escalated", defaulted: "Defaulted",
};

export const loanTypeLabel = (v: string) => LOAN_TYPES[v] ?? titleCase(v);
export const loanStatusLabel = (v: string) => LOAN_STATUSES[v] ?? titleCase(v);
export const repaymentLabel = (v: string) => REPAYMENTS[v] ?? titleCase(v);

export function titleCase(v: string) {
  return (v || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const toNumber = (v: unknown) => {
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
};

export const kes = (n: number, decimals = 0) =>
  `Ksh ${n.toLocaleString("en-KE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30 focus-visible:border-[#0F2C59]";

// ---------------------------------------------------------------------------
// Header actions: export menu
// ---------------------------------------------------------------------------

export function ExportMenu({
  exporting, onExport,
}: { exporting: "excel" | "pdf" | null; onExport: (type: "excel" | "pdf") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const item = (type: "excel" | "pdf", icon: ReactNode, title: string, hint: string) => (
    <button
      role="menuitem"
      disabled={exporting !== null}
      onClick={() => { setOpen(false); onExport(type); }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none disabled:opacity-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F2C59] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#143a73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/40 focus-visible:ring-offset-2"
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {exporting ? "Preparing file" : "Export"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200">
          {item("excel", <FileSpreadsheet className="h-4 w-4 text-emerald-600" />, "Excel spreadsheet", "Repayment report, .xlsx")}
          {item("pdf", <FileText className="h-4 w-4 text-rose-600" />, "PDF report", "Printable repayment report")}
          <p className="mt-1 border-t border-slate-100 px-3 pb-2 pt-2.5 text-xs leading-relaxed text-slate-500">
            Exports follow the company and dates you have set. The other filters only change this page.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The state of the book: money flow bars + aging strip
// ---------------------------------------------------------------------------

function Bar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  // grows in from zero once per change; the short delay lets the zero state paint first
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 40);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
}

function FlowRow({
  label, value, max, color, note, loading,
}: { label: string; value: number; max: number; color: string; note?: string; loading: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        {loading ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <span className="break-normal text-xl font-extrabold tabular-nums tracking-tight text-[#081430]">{kes(value)}</span>
        )}
      </div>
      <div className="mt-2"><Bar pct={loading ? 0 : (value / max) * 100} color={color} /></div>
      {note && !loading && <p className="mt-1.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function BookPanel({
  loading, count, applied, disbursed, repayment, aging, agingLoading, agingFailed, agingScope, onRefreshAging,
}: {
  loading: boolean; count: number; applied: number; disbursed: number; repayment: number;
  aging: Aging | null; agingLoading: boolean; agingFailed: boolean; agingScope: string; onRefreshAging: () => void;
}) {
  const max = Math.max(applied, disbursed, repayment, 1);
  const avg = count > 0 ? applied / count : 0;
  const disbursedShare = applied > 0 ? Math.round((disbursed / applied) * 100) : null;
  const spread = disbursed > 0 ? ((repayment / disbursed - 1) * 100) : null;

  const rows = BUCKETS.map((b) => ({ ...b, ...(aging?.[b.key] ?? { count: 0, amount: 0 }) }));
  const openAmount = rows.reduce((s, r) => s + r.amount, 0);
  const openCount = rows.reduce((s, r) => s + r.count, 0);
  const lateRows = rows.filter((r) => r.key !== "current");
  const lateAmount = lateRows.reduce((s, r) => s + r.amount, 0);
  const lateCount = lateRows.reduce((s, r) => s + r.count, 0);
  const latePct = openAmount > 0 ? Math.round((lateAmount / openAmount) * 100) : 0;

  return (
    <section aria-label="State of the loan book" className="grid rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,44,89,0.06)] ring-1 ring-slate-200 lg:grid-cols-[1.1fr_1fr]">
      {/* Money flow */}
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2">
            {loading ? <Skeleton className="h-10 w-20" /> : (
              <span className="text-4xl font-extrabold tabular-nums tracking-tight text-[#081430]">{count.toLocaleString("en-KE")}</span>
            )}
            <span className="text-sm font-semibold text-slate-500">{count === 1 ? "loan" : "loans"}</span>
          </div>
          {!loading && count > 0 && (
            <p className="text-right text-xs text-slate-500">
              Average loan <span className="font-bold tabular-nums text-slate-700">{kes(avg)}</span>
            </p>
          )}
        </div>
        <div className="space-y-5">
          <FlowRow loading={loading} label="Applied for" value={applied} max={max} color="#CBD5E1" />
          <FlowRow
            loading={loading} label="Disbursed" value={disbursed} max={max} color="#0F2C59"
            note={disbursedShare !== null ? `${disbursedShare}% of what was applied for` : undefined}
          />
          <FlowRow
            loading={loading} label="Expected back" value={repayment} max={max} color="#D97706"
            note={spread !== null ? `${spread >= 0 ? "+" : ""}${spread.toFixed(1)}% on top of what was disbursed` : undefined}
          />
        </div>
      </div>

      {/* Open loans and aging */}
      <div className="border-t border-slate-200 p-6 lg:border-l lg:border-t-0 lg:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-600">Still owed on open loans</p>
            {agingLoading && !aging ? <Skeleton className="mt-1.5 h-9 w-44" /> : (
              <p className="mt-1 break-normal text-3xl font-extrabold tabular-nums tracking-tight text-[#081430]">{kes(openAmount)}</p>
            )}
          </div>
          <button
            onClick={onRefreshAging}
            aria-label="Refresh overdue figures"
            title="Refresh overdue figures"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800", focusRing)}
          >
            <RefreshCw className={cn("h-4 w-4", agingLoading && "animate-spin")} />
          </button>
        </div>

        {agingFailed ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            Overdue figures did not load. <button onClick={onRefreshAging} className="font-semibold underline underline-offset-2">Try again</button>
          </p>
        ) : (
          <>
            <p className={cn("mt-1.5 text-sm", lateAmount > 0 ? "font-semibold text-rose-700" : "text-emerald-700")}>
              {agingLoading && !aging
                ? " "
                : lateAmount > 0
                  ? `${kes(lateAmount)} on ${lateCount} ${lateCount === 1 ? "loan is" : "loans are"} past due (${latePct}%)`
                  : openCount > 0 ? "Nothing is past due." : "There are no open loans."}
            </p>

            <div
              className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Open loans by days late: ${rows.map((r) => `${r.label} ${kes(r.amount)}`).join(", ")}`}
            >
              {rows.filter((r) => r.amount > 0).map((r) => (
                <div key={r.key} style={{ flexGrow: r.amount, flexBasis: 0, minWidth: 6, background: r.color }} />
              ))}
            </div>

            <ul className="mt-5 space-y-2.5">
              {rows.map((r) => (
                <li key={r.key} className={cn("flex items-center gap-3 text-sm", r.amount === 0 && "text-slate-400")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.amount > 0 ? r.color : "#E2E8F0" }} />
                  <span className={cn("flex-1", r.amount > 0 && "text-slate-700")}>{r.label}</span>
                  <span className="w-16 text-right text-xs tabular-nums sm:w-20">{r.count} {r.count === 1 ? "loan" : "loans"}</span>
                  <span className={cn("w-28 text-right font-semibold tabular-nums sm:w-32", r.amount > 0 && "text-slate-900")}>{kes(r.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-slate-500">
              Counts every open loan {agingScope}, as of today. Only the company filter changes it.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Filter strip
// ---------------------------------------------------------------------------

function SelectField({
  label, value, onChange, active, children,
}: { label: string; value: string; onChange: (v: string) => void; active: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300",
          active ? "border-[#0F2C59]/50 bg-[#0F2C59]/5 text-[#0F2C59]" : "border-slate-200",
          focusRing,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

const iso = (d: Date) => d.toLocaleDateString("en-CA");

function presetRanges() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const thirty = new Date(today); thirty.setDate(today.getDate() - 29);
  return [
    { label: "All time", start: "", end: "" },
    { label: "This month", start: iso(monthStart), end: iso(today) },
    { label: "Last 30 days", start: iso(thirty), end: iso(today) },
    { label: "This year", start: iso(yearStart), end: iso(today) },
  ];
}

export function FilterBar({
  filters, companies, onChange, onClear,
}: {
  filters: Filters;
  companies: { name: string; code: string }[];
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}) {
  const [text, setText] = useState(filters.search);
  useEffect(() => setText(filters.search), [filters.search]);
  // wait for typing to pause before asking the server
  useEffect(() => {
    if (text.trim() === filters.search) return;
    const t = setTimeout(() => onChange({ search: text.trim() }), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const companyName = (code: string) => companies.find((c) => c.code === code)?.name ?? titleCase(code);
  const presets = presetRanges();

  const chips: { key: string; label: string; clear: Partial<Filters> }[] = [];
  if (filters.search) chips.push({ key: "search", label: `Matching "${filters.search}"`, clear: { search: "" } });
  if (filters.company !== "all") chips.push({ key: "company", label: companyName(filters.company), clear: { company: "all" } });
  if (filters.loanType !== "all") chips.push({ key: "type", label: loanTypeLabel(filters.loanType), clear: { loanType: "all" } });
  if (filters.loanStatus !== "all") chips.push({ key: "status", label: loanStatusLabel(filters.loanStatus), clear: { loanStatus: "all" } });
  if (filters.repayment !== "all") chips.push({ key: "repay", label: repaymentLabel(filters.repayment), clear: { repayment: "all" } });
  if (filters.startDate || filters.endDate) {
    const from = filters.startDate ? fmtDate(filters.startDate + "T00:00:00") : "the start";
    const to = filters.endDate ? fmtDate(filters.endDate + "T00:00:00") : "today";
    chips.push({ key: "dates", label: `${from} to ${to}`, clear: { startDate: "", endDate: "" } });
  }

  const dateInput = "h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 " + focusRing;

  return (
    <div className="space-y-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,44,89,0.06)] ring-1 ring-slate-200">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-[minmax(14rem,1.4fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            aria-label="Search borrowers"
            placeholder="Name, email, phone, payroll"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={cn("h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-300 [&::-webkit-search-cancel-button]:hidden", focusRing)}
          />
          {text && (
            <button
              aria-label="Clear search"
              onClick={() => { setText(""); onChange({ search: "" }); }}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <SelectField label="Company" value={filters.company} onChange={(v) => onChange({ company: v })} active={filters.company !== "all"}>
          <option value="all">All companies</option>
          {companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </SelectField>
        <SelectField label="Loan type" value={filters.loanType} onChange={(v) => onChange({ loanType: v })} active={filters.loanType !== "all"}>
          <option value="all">All loan types</option>
          <option value="salary_advance">Salary advance</option>
          <option value="personal">Personal loan</option>
        </SelectField>
        <SelectField label="Loan status" value={filters.loanStatus} onChange={(v) => onChange({ loanStatus: v })} active={filters.loanStatus !== "all"}>
          <option value="all">Any loan status</option>
          <option value="pending_processing">Pending</option>
          <option value="approved">Approved</option>
          <option value="disbursed">Disbursed</option>
          <option value="rejected">Rejected</option>
          <option value="written_off">Written off</option>
        </SelectField>
        <SelectField label="Repayment" value={filters.repayment} onChange={(v) => onChange({ repayment: v })} active={filters.repayment !== "all"}>
          <option value="all">Any repayment</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partly paid</option>
          <option value="delinquent">Delinquent</option>
          <option value="paid">Paid</option>
        </SelectField>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div role="group" aria-label="Period" className="flex w-full overflow-x-auto rounded-lg bg-slate-100 p-0.5 lg:w-auto">
          {presets.map((p) => {
            const on = filters.startDate === p.start && filters.endDate === p.end;
            return (
              <button
                key={p.label}
                aria-pressed={on}
                onClick={() => onChange({ startDate: p.start, endDate: p.end })}
                className={cn(
                  "h-9 flex-1 whitespace-nowrap rounded-md px-3.5 text-sm font-semibold transition-all lg:flex-none",
                  on ? "bg-white text-[#0F2C59] shadow-sm" : "text-slate-600 hover:text-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 lg:ml-auto">
          <input type="date" aria-label="From date" value={filters.startDate} max={filters.endDate || undefined}
            onChange={(e) => onChange({ startDate: e.target.value })} className={dateInput} />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" aria-label="To date" value={filters.endDate} min={filters.startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value })} className={dateInput} />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => onChange(c.clear)}
              aria-label={`Remove filter: ${c.label}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2C59]/10 py-1 pl-3 pr-2 text-xs font-semibold text-[#0F2C59] transition-colors hover:bg-[#0F2C59]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30"
            >
              {c.label}
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
          <button onClick={onClear} className="ml-1 text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loans table (desktop) and cards (phones)
// ---------------------------------------------------------------------------

function statusOf(row: LoanRow): { label: string; dot: string; text: string } {
  if (row.loan_status !== "disbursed") {
    const map: Record<string, { dot: string; text: string }> = {
      pending_processing: { dot: "#94A3B8", text: "text-slate-600" },
      approved: { dot: "#3B82F6", text: "text-blue-700" },
      rejected: { dot: "#E11D48", text: "text-rose-700" },
      written_off: { dot: "#475569", text: "text-slate-700" },
    };
    return { label: loanStatusLabel(row.loan_status), ...(map[row.loan_status] ?? { dot: "#94A3B8", text: "text-slate-600" }) };
  }
  const map: Record<string, { dot: string; text: string }> = {
    paid: { dot: "#10B981", text: "text-emerald-700" },
    partially_paid: { dot: "#F59E0B", text: "text-amber-700" },
    unpaid: { dot: "#64748B", text: "text-slate-700" },
    delinquent: { dot: "#DC2626", text: "text-red-700" },
    escalated: { dot: "#E11D48", text: "text-rose-700" },
    defaulted: { dot: "#9F1239", text: "text-rose-800" },
  };
  return { label: repaymentLabel(row.repayment_status), ...(map[row.repayment_status] ?? { dot: "#64748B", text: "text-slate-700" }) };
}

const isOpen = (r: LoanRow) => r.loan_status === "disbursed" && r.repayment_status !== "paid";

function balanceOf(r: LoanRow) {
  if (!isOpen(r)) return null;
  const outstanding = toNumber(r.outstanding_balance);
  return outstanding > 0 ? outstanding : toNumber(r.repayment_amount);
}

function dueNote(r: LoanRow): { text: string; tone: string } | null {
  if (!isOpen(r) || !r.due_date) return null;
  const diff = (Date.now() - new Date(r.due_date).getTime()) / 86400000;
  if (diff >= 1) { const d = Math.floor(diff); return { text: `${d} ${d === 1 ? "day" : "days"} overdue`, tone: "text-rose-700 font-semibold" }; }
  if (diff >= 0) return { text: "Due today", tone: "text-amber-700 font-semibold" };
  const ahead = Math.ceil(-diff);
  return ahead <= 7 ? { text: `Due in ${ahead} ${ahead === 1 ? "day" : "days"}`, tone: "text-amber-700" } : null;
}

function StatusDot({ row }: { row: LoanRow }) {
  const s = statusOf(row);
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold", s.text)} title={`${loanStatusLabel(row.loan_status)}, ${repaymentLabel(row.repayment_status)}`}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function Who({ row, companyName }: { row: LoanRow; companyName: string }) {
  return (
    <>
      <Link
        to={`/admin/applications/${row.id}`}
        className="font-semibold text-slate-900 underline-offset-2 transition-colors hover:text-[#0F2C59] hover:underline focus-visible:outline-none focus-visible:underline"
      >
        {formatName(row.applicant_name) || row.applicant_id || "Unknown"}
      </Link>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 sm:gap-x-2">
        <span className="font-medium text-slate-600">{companyName}</span>
        <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
        <span>{loanTypeLabel(row.loan_type)}</span>
        <span className="hidden h-3 w-px bg-slate-200 sm:block" aria-hidden />
        <span>Applied {fmtDate(row.created_at)}</span>
      </div>
    </>
  );
}

const money = "whitespace-nowrap break-normal text-right text-sm tabular-nums text-slate-700";

export function LoansTable({
  rows, loading, companyNameOf,
}: { rows: LoanRow[]; loading: boolean; companyNameOf: (code: string) => string }) {
  return (
    <>
      {/* desktop */}
      <div className={cn("hidden overflow-x-auto md:block transition-opacity", loading && "opacity-60")}>
        <table className="w-full min-w-[56rem] text-left">
          <thead>
            <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <th className="px-5 py-3 font-semibold">Borrower</th>
              <th className="px-3 py-3 text-right font-semibold">Applied</th>
              <th className="px-3 py-3 text-right font-semibold">Disbursed</th>
              <th className="px-3 py-3 text-right font-semibold">To repay</th>
              <th className="px-3 py-3 text-right font-semibold">Still owed</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const bal = balanceOf(r);
              const note = dueNote(r);
              return (
                <tr key={r.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-3.5"><Who row={r} companyName={companyNameOf(r.company)} /></td>
                  <td className={cn("px-3 py-3.5", money)}>{toNumber(r.amount_applied).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td className={cn("px-3 py-3.5", money)}>{toNumber(r.disbursement_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td className={cn("px-3 py-3.5", money)}>{toNumber(r.repayment_amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td className={cn("px-3 py-3.5", money, bal === null ? "text-slate-300" : "font-semibold text-slate-900")}>
                    {bal === null ? "–" : bal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5"><StatusDot row={r} /></td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-700">
                    {r.due_date ? fmtDate(r.due_date) : <span className="text-slate-300">{"–"}</span>}
                    {note && <div className={cn("text-xs", note.tone)}>{note.text}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* phones */}
      <ul className={cn("divide-y divide-slate-100 md:hidden transition-opacity", loading && "opacity-60")}>
        {rows.map((r) => {
          const bal = balanceOf(r);
          const note = dueNote(r);
          const cell = (label: string, value: string, strong = false) => (
            <div>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className={cn("text-sm tabular-nums", strong ? "font-semibold text-slate-900" : "text-slate-700")}>{value}</dd>
            </div>
          );
          return (
            <li key={r.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><Who row={r} companyName={companyNameOf(r.company)} /></div>
                <StatusDot row={r} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {cell("Applied", kes(toNumber(r.amount_applied), 2))}
                {cell("Disbursed", kes(toNumber(r.disbursement_amount), 2))}
                {cell("To repay", kes(toNumber(r.repayment_amount), 2))}
                {cell("Still owed", bal === null ? "–" : kes(bal, 2), bal !== null)}
              </dl>
              {(r.due_date || note) && (
                <p className="text-xs text-slate-600">
                  Due {fmtDate(r.due_date)}
                  {note && <span className={cn("ml-2", note.tone)}>{note.text}</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function TableSkeleton() {
  return (
    <div className="divide-y divide-slate-100" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4">
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72 max-w-full" /></div>
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100"><SearchX className="h-6 w-6 text-slate-400" /></span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{filtered ? "No loans match these filters" : "No loans yet"}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {filtered ? "Widen the dates or remove a filter to see more." : "Loans will appear here once applications come in."}
      </p>
      {filtered && (
        <button onClick={onClear} className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#0F2C59] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#143a73]">
          Clear all filters
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50"><AlertTriangle className="h-6 w-6 text-rose-600" /></span>
      <h3 className="mt-4 text-base font-bold text-slate-900">The loan list did not load</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      <button onClick={onRetry} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50">
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function pageWindow(page: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, page - 1, page, page + 1]);
  const pages = Array.from(keep).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  pages.forEach((p, i) => { if (i > 0 && p - pages[i - 1] > 1) out.push("gap"); out.push(p); });
  return out;
}

export function Pagination({
  page, pageSize, total, totalPages, onPage, onPageSize,
}: { page: number; pageSize: number; total: number; totalPages: number; onPage: (p: number) => void; onPageSize: (n: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30";
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <p>
          Showing <span className="font-semibold tabular-nums text-slate-900">{from}&ndash;{to}</span> of{" "}
          <span className="font-semibold tabular-nums text-slate-900">{total.toLocaleString("en-KE")}</span>
        </p>
        <label className="hidden items-center gap-2 sm:flex">
          <span className="text-slate-500">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className={cn("h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700", focusRing)}
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <nav aria-label="Pages" className="flex items-center gap-1">
        <button aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}
          className={cn(btn, "text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent")}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((p, i) =>
            p === "gap" ? <span key={`g${i}`} className="px-1 text-slate-400">&hellip;</span> : (
              <button key={p} onClick={() => onPage(p)} aria-current={p === page ? "page" : undefined}
                className={cn(btn, "tabular-nums", p === page ? "bg-[#0F2C59] text-white shadow-sm" : "text-slate-600 hover:bg-white")}>
                {p}
              </button>
            ),
          )}
        </div>
        <span className="px-2 text-sm font-semibold text-slate-600 sm:hidden">Page {page} of {totalPages}</span>
        <button aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
          className={cn(btn, "text-slate-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent")}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
