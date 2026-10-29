import { AlertCircle } from "lucide-react";
import { money } from "@/lib/nextStep";

/** Under an amount field: the most this person can ask for (set by an admin), and a warning when they ask for more. The server refuses it anyway; this says so first. */
export default function LimitNote({ limit, amount }: { limit?: number | null; amount?: number }) {
  if (!limit || limit <= 0) return null;
  const over = typeof amount === "number" && !isNaN(amount) && amount > limit;
  return over ? (
    <p role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-orange-600">
      <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
      That is more than your limit of {money(limit)}. Please ask for {money(limit)} or less.
    </p>
  ) : (
    <p className="mt-1.5 text-xs text-slate-500">Your limit is {money(limit)}.</p>
  );
}
