

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreakdownItem {
  label: string;
  value: string;
  highlight?: boolean;
  color?: "green" | "red" | "blue" | "orange" | "default";
  isDeduction?: boolean;
  isDivider?: boolean;
}

interface LoanBreakdownCardProps {
  title: string;
  items: BreakdownItem[];
  footer?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoanBreakdownCard({
  title,
  items,
  footer,
  className,
}: LoanBreakdownCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {/* Items */}
      <div className="p-5 space-y-3">
        {items.map((item, index) => {
          if (item.isDivider) {
            return (
              <div
                key={index}
                className="border-t border-dashed border-gray-200 my-4"
              />
            );
          }

          const colorClasses = {
            green: "text-emerald-600",
            red: "text-red-600",
            blue: "text-blue-600",
            orange: "text-orange-600",
            default: "text-gray-800",
          };

          const valueColorClass =
            colorClasses[item.color ?? "default"];

          return (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between",
                item.highlight && "py-2"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  item.highlight
                    ? "font-semibold text-gray-800"
                    : "text-gray-600",
                  item.isDeduction && "text-gray-500"
                )}
              >
                {item.isDeduction ? `Less: ${item.label}` : item.label}
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  item.highlight ? "text-base" : "text-sm",
                  valueColorClass,
                  item.isDeduction && "text-gray-600"
                )}
              >
                {item.isDeduction ? `(${item.value})` : item.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30">
          {footer}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper to create common breakdown items
// ---------------------------------------------------------------------------

export function createSalaryAdvanceBreakdown(
  averageSalary: number,
  loanAmount: number,
  processingFees: number,
  accessFees: number,
  legalCharge: number,
  disbursement: number,
  interest: number,
  repayment: number,
  formatFn: (n: number) => string
): BreakdownItem[] {
  return [
    {
      label: "Average Monthly Salary",
      value: formatFn(averageSalary),
      highlight: false,
    },
    {
      label: "Loan Applied For",
      value: formatFn(loanAmount),
      highlight: true,
      color: "blue",
    },
    {
      label: "Processing Fees (3%)",
      value: formatFn(processingFees),
      isDeduction: true,
    },
    {
      label: "Access Fees (2%)",
      value: formatFn(accessFees),
      isDeduction: true,
    },
    {
      label: "Legal Charge",
      value: formatFn(legalCharge),
      isDeduction: true,
    },
    { label: "", value: "", isDivider: true },
    {
      label: "You Will Receive (Disbursement)",
      value: formatFn(disbursement),
      highlight: true,
      color: "green",
    },
    {
      label: "Interest (10%)",
      value: formatFn(interest),
      color: "orange",
    },
    {
      label: "Total Repayment",
      value: formatFn(repayment),
      highlight: true,
      color: "red",
    },
  ];
}

export function createGeneralLoanBreakdown(
  loanAmount: number,
  processingFees: number,
  accessFees: number,
  legalFees: number,
  disbursement: number,
  interest: number,
  repayment: number,
  interestRate: number,
  formatFn: (n: number) => string
): BreakdownItem[] {
  const ratePercent = `${(interestRate * 100).toFixed(0)}%`;

  return [
    {
      label: "Loan Amount",
      value: formatFn(loanAmount),
      highlight: true,
      color: "blue",
    },
    {
      label: "Processing Fees (3%)",
      value: formatFn(processingFees),
      isDeduction: true,
    },
    {
      label: "Access Fees",
      value: formatFn(accessFees),
      isDeduction: true,
    },
    {
      label: "Legal Fees",
      value: formatFn(legalFees),
      isDeduction: true,
    },
    { label: "", value: "", isDivider: true },
    {
      label: "You Will Receive (Disbursement)",
      value: formatFn(disbursement),
      highlight: true,
      color: "green",
    },
    {
      label: `Interest (${ratePercent})`,
      value: formatFn(interest),
      color: "orange",
    },
    {
      label: "Total Repayment",
      value: formatFn(repayment),
      highlight: true,
      color: "red",
    },
  ];
}
