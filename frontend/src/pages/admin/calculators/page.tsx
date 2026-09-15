import React, { useState } from "react";
import { Calculator, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/lib/apiClient";

export default function CalculatorsPage() {
  const [activeModule, setActiveModule] = useState("1");

  return (
    <div className="p-6 w-full space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-600" /> Loan Simulators & Calculators
          </h1>
          <p className="text-slate-500 text-sm mt-1">Unified toolkit for all loan calculations and simulations</p>
        </div>
        <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl w-max gap-1">
          {[
            { id: "1", label: "Personal Loan" },
            { id: "2", label: "Salary Advance" },
            { id: "3", label: "Gross Loan" },
            { id: "4", label: "Amortization" },
            { id: "5", label: "Comparison" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveModule(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeModule === tab.id
                  ? "bg-white text-brand-blue shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200">
        {activeModule === "1" && <PersonalLoanModule />}
        {activeModule === "2" && <SalaryAdvanceModule />}
        {activeModule === "3" && <GrossLoanModule />}
        {activeModule === "4" && <LoanEngineModule />}
        {activeModule === "5" && <CompareLoansModule />}
      </div>
    </div>
  );
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PersonalLoanModule() {
  const [amount, setAmount] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [legalFee, setLegalFee] = useState(1000);

  const processing = (Number(amount) || 0) * 0.03;
  const admin = includeAdmin ? (Number(amount) || 0) * 0.02 : 0;
  const disbursement = (Number(amount) || 0) - legalFee - processing - admin;
  const repayment = (Number(amount) || 0) * (1 + (Number(rate) || 0) / 100);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">1 Month Loan Calculator (Personal)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Loan Amount</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={amount === "" ? "" : amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Rate (%)</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={rate === "" ? "" : rate} onChange={e => setRate(Number(e.target.value))} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Legal Fees (1000 or 500)</label>
            <select value={legalFee} onChange={e => setLegalFee(Number(e.target.value))} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
              <option value="1000">1,000</option>
              <option value="500">500</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={includeAdmin} onChange={e => setIncludeAdmin(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
            <span className="text-sm font-semibold text-gray-700">Include Admin & Access Fees (2%)</span>
          </label>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-slate-600">Processing Fees (3%)</span><span className="font-bold">{KES.format(processing)}</span></div>
          {includeAdmin && <div className="flex justify-between text-sm"><span className="text-slate-600">Admin Fees (2%)</span><span className="font-bold">{KES.format(admin)}</span></div>}
          <div className="flex justify-between text-sm"><span className="text-slate-600">Legal Fees</span><span className="font-bold">{KES.format(legalFee)}</span></div>
          <hr className="border-blue-200" />
          <div className="flex justify-between"><span className="font-bold text-gray-700">Disbursement (Net)</span><span className="font-black text-emerald-600 text-lg">{KES.format(disbursement)}</span></div>
          <div className="flex justify-between"><span className="font-bold text-gray-700">Repayment (Gross)</span><span className="font-black text-amber-600 text-lg">{KES.format(repayment)}</span></div>
        </div>
      </div>
    </div>
  );
}

function SalaryAdvanceModule() {
  const [m1, setM1] = useState<number | "">("");
  const [m2, setM2] = useState<number | "">("");
  const [m3, setM3] = useState<number | "">("");

  const avg = ((Number(m1) || 0) + (Number(m2) || 0) + (Number(m3) || 0)) / 3;
  const repayment = avg / 3;
  const loanAmount = repayment / 1.1;
  const processing = loanAmount * 0.03;
  const access = loanAmount * 0.02;
  const legal = 500;
  const disbursement = loanAmount - processing - access - legal;
  const interest = repayment - loanAmount;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Salary Advance Simulator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <label className="block text-xs font-bold text-slate-500 uppercase">Net Salary Month {i}</label>
              <input type="number" onWheel={(e) => e.currentTarget.blur()} value={i===1 ? m1 : i===2 ? m2 : m3} onChange={e => {
                const v = Number(e.target.value);
                if (i===1) setM1(v); else if (i===2) setM2(v); else setM3(v);
              }} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
            </div>
          ))}
        </div>
        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-slate-600">Max Loan Amount</span><span className="font-bold">{KES.format(loanAmount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-600">Processing Fees (3%)</span><span className="font-bold">{KES.format(processing)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-600">Access Fees (2%)</span><span className="font-bold">{KES.format(access)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-600">Legal Charge</span><span className="font-bold">{KES.format(legal)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-slate-600">Interest (10%)</span><span className="font-bold">{KES.format(interest)}</span></div>
          <hr className="border-purple-200" />
          <div className="flex justify-between"><span className="font-bold text-gray-700">Disbursement</span><span className="font-black text-emerald-600 text-lg">{KES.format(disbursement)}</span></div>
          <div className="flex justify-between"><span className="font-bold text-gray-700">Repayment</span><span className="font-black text-amber-600 text-lg">{KES.format(repayment)}</span></div>
        </div>
      </div>
    </div>
  );
}

function GrossLoanModule() {
  const [net, setNet] = useState<number | "">("");
  const [type, setType] = useState("personal");

  const gross = type === "personal" ? ((Number(net) || 0) + 1000) / 0.97 : ((Number(net) || 0) + 500) / 0.95;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Gross Loan Calculator</h2>
      <p className="text-sm text-slate-500">Calculate the required gross loan amount to receive a specific net disbursement.</p>
      <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase">Desired Net Amount</label>
          <input type="number" onWheel={(e) => e.currentTarget.blur()} value={net === "" ? "" : net} onChange={e => setNet(Number(e.target.value))} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase">Loan Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full mt-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
            <option value="personal">Personal Loan</option>
            <option value="salary">Salary Advance</option>
          </select>
        </div>
      </div>
      <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 max-w-2xl text-center">
        <p className="text-sm text-emerald-800 font-bold mb-2">Required Gross Loan Amount</p>
        <p className="text-4xl font-black text-emerald-600">{KES.format(gross)}</p>
      </div>
    </div>
  );
}

function LoanEngineModule() {
  const [amount, setAmount] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">("");
  const [method, setMethod] = useState("flat");
  const [result, setResult] = useState<any>(null);

  const calculate = async () => {
    try {
      const res = await apiCall<any>("/api/loans/calculate", {
        method: "POST",
        body: { amount: Number(amount)||0, interest_rate: Number(rate)||0, duration_months: Number(duration)||0, method, rate_type: "monthly", processing_fee_rate: 3, access_fee_rate: 0, legal_fee: 0 }
      });
      if (res.data) setResult(res.data.breakdown || res.data);
    } catch (e) { toast.error("Calculation failed"); }
  };

  const downloadAmortization = (format: "pdf" | "excel") => {
    window.open(`${import.meta.env.VITE_BACKEND_URL}/api/loans/amortization/${format}?amount=${Number(amount)||0}&interest_rate=${Number(rate)||0}&duration_months=${Number(duration)||0}&method=${method}&rate_type=monthly&processing_fee_rate=3&access_fee_rate=0&legal_fee=0`, '_blank');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Advanced Loan Engine & Amortization</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={amount === "" ? "" : amount} onChange={e => setAmount(Number(e.target.value))} placeholder="Amount" className="flex-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={rate === "" ? "" : rate} onChange={e => setRate(Number(e.target.value))} placeholder="Rate %" className="flex-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={duration} onChange={e => setDuration(Number(e.target.value))} placeholder="Months" className="flex-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium" />
        <select value={method} onChange={e => setMethod(e.target.value)} className="flex-1 border-slate-200 rounded-lg p-2 bg-slate-50 font-medium">
          <option value="flat">Flat Rate</option>
          <option value="reducing_balance">Reducing Balance</option>
        </select>
        <Button onClick={calculate} className="bg-brand-blue hover:bg-slate-800">Calculate</Button>
      </div>

      {result && (
        <div className="mt-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border text-center"><p className="text-xs font-bold text-slate-500 uppercase">Total Repayment</p><p className="text-xl font-black text-slate-900">{KES.format(result.total_repayment)}</p></div>
            <div className="bg-slate-50 p-4 rounded-xl border text-center"><p className="text-xs font-bold text-slate-500 uppercase">Total Interest</p><p className="text-xl font-black text-slate-900">{KES.format(result.total_interest)}</p></div>
            <div className="bg-slate-50 p-4 rounded-xl border text-center"><p className="text-xs font-bold text-slate-500 uppercase">Monthly Installment</p><p className="text-xl font-black text-slate-900">{KES.format(result.monthly_installment)}</p></div>
          </div>
          
          <div className="flex gap-2 justify-end mb-4">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => downloadAmortization("excel")}><Download className="h-4 w-4 mr-2" /> Excel</Button>
            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => downloadAmortization("pdf")}><Download className="h-4 w-4 mr-2" /> PDF</Button>
          </div>

          <div className="w-full overflow-x-auto">
<table className="w-full text-sm text-left">
            <thead className="bg-slate-50"><tr><th className="px-4 py-2">Month</th><th className="px-4 py-2 text-right">Principal</th><th className="px-4 py-2 text-right">Interest</th><th className="px-4 py-2 text-right">Balance</th></tr></thead>
            <tbody className="divide-y">{result.schedule.map((row: any) => (
              <tr key={row.month} className="hover:bg-slate-50"><td className="px-4 py-2">{row.month}</td><td className="px-4 py-2 text-right">{KES.format(row.principal_payment)}</td><td className="px-4 py-2 text-right">{KES.format(row.interest_payment)}</td><td className="px-4 py-2 text-right">{KES.format(row.closing_balance)}</td></tr>
            ))}</tbody>
          </table>
</div>
        </div>
      )}
    </div>
  );
}

function CompareLoansModule() {
  const [a, setA] = useState<{amount: number | "", rate: number | "", duration: number | ""}>({ amount: "", rate: "", duration: "" });
  const [b, setB] = useState<{amount: number | "", rate: number | "", duration: number | ""}>({ amount: "", rate: "", duration: "" });
  const [resA, setResA] = useState<any>(null);
  const [resB, setResB] = useState<any>(null);

  const compare = async () => {
    try {
      const [r1, r2] = await Promise.all([
        apiCall<any>("/api/loans/calculate", { method: "POST", body: { amount: Number(a.amount)||0, interest_rate: Number(a.rate)||0, duration_months: Number(a.duration)||0, method: "flat", rate_type: "monthly", processing_fee_rate: 0, access_fee_rate: 0, legal_fee: 0 } }),
        apiCall<any>("/api/loans/calculate", { method: "POST", body: { amount: Number(b.amount)||0, interest_rate: Number(b.rate)||0, duration_months: Number(b.duration)||0, method: "flat", rate_type: "monthly", processing_fee_rate: 0, access_fee_rate: 0, legal_fee: 0 } })
      ]);
      if (r1.data) setResA(r1.data.breakdown || r1.data);
      if (r2.data) setResB(r2.data.breakdown || r2.data);
    } catch { toast.error("Comparison failed"); }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">Side-by-Side Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-blue-50 p-6 rounded-xl border border-blue-100">
          <h3 className="font-bold text-brand-blue text-lg">Scenario A</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Amount</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={a.amount === "" ? "" : a.amount} onChange={e => setA({...a, amount: e.target.value ? Number(e.target.value) : ""})} className="w-full border-blue-200 rounded-lg p-2 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interest Rate (%)</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={a.rate === "" ? "" : a.rate} onChange={e => setA({...a, rate: e.target.value ? Number(e.target.value) : ""})} className="w-full border-blue-200 rounded-lg p-2 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Months)</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={a.duration === "" ? "" : a.duration} onChange={e => setA({...a, duration: e.target.value ? Number(e.target.value) : ""})} className="w-full border-blue-200 rounded-lg p-2 bg-white" />
          </div>
        </div>
        <div className="space-y-4 bg-purple-50 p-6 rounded-xl border border-purple-100">
          <h3 className="font-bold text-purple-800 text-lg">Scenario B</h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loan Amount</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={b.amount === "" ? "" : b.amount} onChange={e => setB({...b, amount: e.target.value ? Number(e.target.value) : ""})} className="w-full border-purple-200 rounded-lg p-2 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Interest Rate (%)</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={b.rate === "" ? "" : b.rate} onChange={e => setB({...b, rate: e.target.value ? Number(e.target.value) : ""})} className="w-full border-purple-200 rounded-lg p-2 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Months)</label>
            <input type="number" onWheel={(e) => e.currentTarget.blur()} value={b.duration === "" ? "" : b.duration} onChange={e => setB({...b, duration: e.target.value ? Number(e.target.value) : ""})} className="w-full border-purple-200 rounded-lg p-2 bg-white" />
          </div>
        </div>
      </div>
      <div className="flex justify-center"><Button onClick={compare} className="bg-gray-900 px-8 py-6 text-lg"><ArrowRight className="mr-2"/> Run Comparison</Button></div>
      {resA && resB && (
        <div className="w-full overflow-x-auto">
<table className="w-full text-sm mt-6 border rounded-xl overflow-hidden">
          <thead className="bg-slate-100"><tr className="text-left"><th className="p-4">Metric</th><th className="p-4">Scenario A</th><th className="p-4">Scenario B</th><th className="p-4">Difference (B - A)</th></tr></thead>
          <tbody className="divide-y bg-white">
            <tr><td className="p-4 font-bold">Total Repayment</td><td className="p-4">{KES.format(resA.total_repayment)}</td><td className="p-4">{KES.format(resB.total_repayment)}</td><td className={`p-4 font-bold ${resB.total_repayment > resA.total_repayment ? 'text-red-600' : 'text-emerald-600'}`}>{KES.format(resB.total_repayment - resA.total_repayment)}</td></tr>
            <tr><td className="p-4 font-bold">Total Interest</td><td className="p-4">{KES.format(resA.total_interest)}</td><td className="p-4">{KES.format(resB.total_interest)}</td><td className={`p-4 font-bold ${resB.total_interest > resA.total_interest ? 'text-red-600' : 'text-emerald-600'}`}>{KES.format(resB.total_interest - resA.total_interest)}</td></tr>
            <tr><td className="p-4 font-bold">Monthly Installment</td><td className="p-4">{KES.format(resA.monthly_installment)}</td><td className="p-4">{KES.format(resB.monthly_installment)}</td><td className={`p-4 font-bold ${resB.monthly_installment > resA.monthly_installment ? 'text-red-600' : 'text-emerald-600'}`}>{KES.format(resB.monthly_installment - resA.monthly_installment)}</td></tr>
          </tbody>
        </table>
</div>
      )}
    </div>
  );
}
