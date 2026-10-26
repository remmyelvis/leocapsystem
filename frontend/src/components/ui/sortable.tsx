import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";

// Sorting for the app's tables: a column header that sorts (a real button, announced to screen readers) and a menu that does
// the same on phones, where a table becomes cards. Each table says which columns sort and which way a first click goes
// (the most useful way: names A to Z, money high to low, dates newest or soonest first); clicking again flips it.
// The rows themselves are sorted by lib/sortRows.ts (a table whose rows are paged sorts on the server instead).

export type SortDir = "asc" | "desc";
export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}

export interface SortSpec {
  label: string;
  /** The direction a first click picks. */
  first: SortDir;
  /** How each direction reads in the hint and the menu. */
  asc: string;
  desc: string;
  /** Header text when it is shorter than the label. */
  short?: string;
}
export type SortSpecs<K extends string> = Record<K, SortSpec>;

/** What clicking a column header does: a new column starts in its most useful direction, the same column flips. */
export function nextSort<K extends string>(specs: SortSpecs<K>, current: SortState<K>, key: K): SortState<K> {
  return current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: specs[key].first };
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30 focus-visible:border-[#0F2C59]";

export function SortSelect<K extends string>({
  specs, sort, onSort, label = "Sort",
}: { specs: SortSpecs<K>; sort: SortState<K>; onSort: (s: SortState<K>) => void; label?: string }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-500">
      <span className="hidden sm:inline">Sort</span>
      <select
        aria-label={label}
        value={`${sort.key}:${sort.dir}`}
        onChange={(e) => { const [key, dir] = e.target.value.split(":"); onSort({ key: key as K, dir: dir as SortDir }); }}
        className={cn("h-7 min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-700", focusRing)}
      >
        {(Object.keys(specs) as K[]).flatMap((key) =>
          ([specs[key].first, specs[key].first === "asc" ? "desc" : "asc"] as SortDir[]).map((dir) => (
            <option key={`${key}:${dir}`} value={`${key}:${dir}`}>{specs[key].label}: {specs[key][dir]}</option>
          )),
        )}
      </select>
    </label>
  );
}

export function SortHeader<K extends string>({
  specs, col, sort, onSort, align = "left", className,
}: { specs: SortSpecs<K>; col: K; sort: SortState<K>; onSort: (s: SortState<K>) => void; align?: "left" | "right"; className?: string }) {
  const active = sort.key === col;
  const Arrow = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const meta = specs[col];
  return (
    <th
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("py-0 font-semibold", align === "right" && "text-right", className)}
    >
      <Tip label={`Sort by ${meta.label.toLowerCase()}${active ? ` (${meta[sort.dir === "asc" ? "desc" : "asc"].toLowerCase()} next)` : ""}`} side="bottom">
      <button
        onClick={() => onSort(nextSort(specs, sort, col))}
        className={cn(
          "group inline-flex items-center gap-1 whitespace-nowrap py-2 uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:text-[#0F2C59]",
          align === "right" && "flex-row-reverse",
          active ? "text-slate-900" : "text-slate-500 hover:text-slate-800",
        )}
      >
        {meta.short ?? meta.label}
        <Arrow className={cn("h-3 w-3 shrink-0", active ? "text-[#0F2C59]" : "opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60")} />
      </button>
      </Tip>
    </th>
  );
}
