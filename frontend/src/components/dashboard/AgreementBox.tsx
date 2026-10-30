import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { agreementText } from "@/lib/agreementText";
import type { AgreementInForce } from "@/hooks/useAgreement";

/** The scrolling box with the loan agreement in the application forms. It shows what the server says is in force and nothing else. */
export default function AgreementBox({ agreement, employer, maxHeight = "max-h-64" }: { agreement: UseQueryResult<AgreementInForce>; employer?: string; maxHeight?: string }) {
  if (agreement.isError) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-900">
        <p>We could not load the loan agreement, so the application cannot be sent yet. Please check your connection and try again.</p>
        <Button type="button" onClick={() => agreement.refetch()} className="mt-3 h-[44px] rounded-lg bg-red-700 px-4 text-[13px] font-bold text-white hover:bg-red-800">
          Try again
        </Button>
      </div>
    );
  }
  if (!agreement.data) {
    return (
      <div role="status" aria-label="Loading the loan agreement" className={`space-y-2.5 rounded-lg border border-slate-200 bg-slate-50 p-4 ${maxHeight}`}>
        {[90, 70, 85, 60, 80].map((w) => (
          <div key={w} className="h-3 animate-pulse rounded bg-slate-200" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 ${maxHeight} overflow-y-auto`} tabIndex={0} aria-label="Loan agreement">
      <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">{agreementText(agreement.data.data, employer)}</pre>
    </div>
  );
}
