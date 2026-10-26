import type { SortState } from "@/components/ui/sortable";

// Sorts the rows of a table that is held in the browser (a paged table sorts on the server instead).
// Text is compared the way a person reads it (case and accents ignored, "2" before "10"); money and dates are compared as numbers.
// A blank value (no due date, no amount) goes LAST in both directions, so it never hides the rows that have something to compare.
// Rows that tie keep the order they came in, which is newest first everywhere, so the order never shuffles.

export type SortValue = string | number | null | undefined;

const blank = (v: SortValue) => v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

export function sortRows<T, K extends string>(rows: readonly T[], sort: SortState<K>, by: Record<K, (row: T) => SortValue>): T[] {
  const read = by[sort.key];
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = read(a);
    const y = read(b);
    const noX = blank(x);
    const noY = blank(y);
    if (noX || noY) return noX === noY ? 0 : noX ? 1 : -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { sensitivity: "base", numeric: true });
    return c * sign;
  });
}

/** A date as a number for sortRows (blank when there is none or it cannot be read). */
export const timeOf = (iso?: string | null) => (iso ? Date.parse(iso) : null);
