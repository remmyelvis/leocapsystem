import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";

// Small building blocks shared by the editors. Sizes follow the other admin pages (13px text, compact controls).

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:bg-slate-50";

export const card = "rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-900/5";

export function Field({ label, hint, htmlFor, children, count }: { label: string; hint?: ReactNode; htmlFor?: string; children: ReactNode; count?: { n: number; max: number } }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700">
          {label}
        </label>
        {count && <Counter n={count.n} max={count.max} />}
      </div>
      {children}
      {hint && <p className="mt-1 text-[12px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

/** How much of the allowed length is used; it turns amber near the limit and red over it. */
export function Counter({ n, max }: { n: number; max: number }) {
  const tone = n > max ? "font-semibold text-red-600" : n > max * 0.9 ? "text-amber-700" : "text-slate-500";
  return (
    <span className={`text-[12px] tabular-nums ${tone}`} aria-live="off">
      {n} / {max}
    </span>
  );
}

export function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-800">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30" />
      <span>{children}</span>
    </label>
  );
}

export function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <Tip label={label} wrap>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 disabled:cursor-default disabled:opacity-35 ${
          danger ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        {children}
      </button>
    </Tip>
  );
}

/** Move up, move down and remove, for one row of a list. */
export function RowTools({ index, count, onMove, onRemove, what }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void; what: string }) {
  return (
    <div className="flex flex-shrink-0 items-center">
      <IconButton label={`Move ${what} up`} onClick={() => onMove(index - 1)} disabled={index === 0}>
        <ArrowUp className="h-4 w-4" />
      </IconButton>
      <IconButton label={`Move ${what} down`} onClick={() => onMove(index + 1)} disabled={index === count - 1}>
        <ArrowDown className="h-4 w-4" />
      </IconButton>
      <IconButton label={`Remove ${what}`} onClick={onRemove} danger>
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export function AddButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

export const patchItem = <T,>(list: T[], index: number, patch: Partial<T>): T[] => list.map((item, i) => (i === index ? { ...item, ...patch } : item));

export const dropItem = <T,>(list: T[], index: number): T[] => list.filter((_, i) => i !== index);

/** A key for a list row that stays with the row when rows are moved (it is not sent to the server). */
let counter = 0;
export const newKey = () => `row-${++counter}`;

// ─── Status and dates ─────────────────────────────────────────────────────────

const STATUS = {
  "built-in": { text: "Built-in text", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  published: { text: "Published", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  draft: { text: "Unpublished changes", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  return <span className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ${STATUS[status].cls}`}>{STATUS[status].text}</span>;
}

/** "25 Oct 2026, 14:03" in the viewer's own time. */
export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
