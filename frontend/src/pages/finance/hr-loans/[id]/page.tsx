

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { ArrowLeft, Pencil, Save, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMockApplicationWithOverrides,
  updateMockAmount,
  type MockApplication,
} from "@/lib/mockStaff";
import type { UserRole } from "@/types/user";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Declined: "bg-red-100 text-red-700",
    Disbursed: "bg-blue-100 text-blue-700",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  const display =
    typeof value === "number" ? KES.format(value) : String(value);
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-slate-800 font-medium">{display}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-5">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {children}
      </div>
    </div>
  );
}

export default function FinanceHRLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const { data: session } = useSession();
  const _role = session?.user?.role as UserRole | undefined;
  const userId = session?.user?.id ?? "";

  const [app, setApp] = useState<MockApplication | null>(null);
  const [editingAmount, setEditingAmount] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const found = getMockApplicationWithOverrides(params.id);
    if (found) {
      setApp(found);
      setNewAmount(found.amountApplied.toString());
    }
  }, [params.id]);

  if (!app) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Application not found.
      </div>
    );
  }

  // Finance can only edit HR loan amounts (not their own)
  const isOwnApplication = app.submitterId === userId;
  const isHRLoan =
    app.submitterRole === "hr_ideon" || app.submitterRole === "hr_nakama";
  const canEditAmount = isHRLoan && !isOwnApplication;

  const handleSaveAmount = async () => {
    const parsed = parseFloat(newAmount.replace(/,/g, ""));
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    updateMockAmount(app.id, parsed);
    setApp((prev) => (prev ? { ...prev, amountApplied: parsed } : prev));
    setEditingAmount(false);
    setSaving(false);
    toast.success("Amount updated successfully.");
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900">
            {app.customerName}
          </h1>
          <p className="text-slate-400 text-sm">{app.email}</p>
        </div>
        <span
          className={`text-sm font-bold px-3 py-1.5 rounded-full ${statusBadge(
            app.status
          )}`}
        >
          {app.status}
        </span>
      </div>

      {/* Read-only notice if it's not an HR loan */}
      {!canEditAmount && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            {isOwnApplication
              ? "This is your own loan application. The amount can only be modified by the HR Manager."
              : "This application's amount cannot be edited from the Finance portal."}
          </p>
        </div>
      )}

      {/* Amount card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Loan Amount
          </h2>
          {canEditAmount && !editingAmount && (
            <button
              onClick={() => setEditingAmount(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Amount
            </button>
          )}
        </div>

        {editingAmount ? (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold pointer-events-none">
                KES
              </span>
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                type="number"
                min="1"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-violet-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600 transition-colors"
              />
            </div>
            <Button
              onClick={handleSaveAmount}
              disabled={saving}
              className="bg-violet-700 hover:bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <button
              onClick={() => {
                setEditingAmount(false);
                setNewAmount(app.amountApplied.toString());
              }}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        ) : (
          <p className="text-3xl font-black text-slate-900">
            {KES.format(app.amountApplied)}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Processing</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {KES.format(app.processingFees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Legal</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {KES.format(app.legalFees)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Disbursement</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {KES.format(app.disbursementAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Repayment</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {KES.format(app.repaymentAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Details */}
      <Section title="Applicant Details">
        <Field label="Full Name" value={app.customerName} />
        <Field label="Email" value={app.email} />
        <Field label="Phone" value={app.phone} />
        <Field label="ID Number" value={app.idNumber} />
        <Field label="Company" value={app.company} />
        <Field label="Designation" value={app.designation} />
      </Section>

      <Section title="Employment & Payroll">
        <Field label="Nature of Employment" value={app.employmentNature} />
        <Field label="Payroll Number" value={app.payrollNumber} />
        <Field label="Month 1 Basic Pay" value={app.monthOne} />
        <Field label="Month 2 Basic Pay" value={app.monthTwo} />
        <Field label="Month 3 Basic Pay" value={app.monthThree} />
        <Field
          label="Date Submitted"
          value={new Date(app.submittedAt).toLocaleDateString("en-KE", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
      </Section>
    </div>
  );
}
