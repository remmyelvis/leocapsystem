import { useState } from "react";
import { Download, LayoutList, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiCall, downloadFile } from "@/lib/apiClient";

const AVAILABLE_COLUMNS = [
  { id: "applicant_name", label: "Applicant Name" },
  { id: "phone_number", label: "Phone Number" },
  { id: "company", label: "Company" },
  { id: "loan_type", label: "Loan Type" },
  { id: "amount_applied", label: "Amount Applied" },
  { id: "disbursement_amount", label: "Disbursement Amount" },
  { id: "repayment_amount", label: "Repayment Amount" },
  { id: "loan_status", label: "Loan Status" },
  { id: "repayment_status", label: "Repayment Status" },
  { id: "due_date", label: "Due Date" },
  { id: "created_at", label: "Date Applied" },
];

export default function CustomReportBuilder() {
  const [selectedCols, setSelectedCols] = useState<string[]>([
    "applicant_name", "company", "disbursement_amount", "loan_status"
  ]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const toggleColumn = (id: string) => {
    setSelectedCols(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedCols.length === 0) {
      toast.error("Please select at least one column");
      return;
    }
    
    setIsExporting(true);
    try {
      const payload = {
        columns: selectedCols,
        filters: {
          company: companyFilter,
          status: statusFilter,
          start_date: startDate,
          end_date: endDate
        }
      };
      
      const res = await apiCall<Blob>("/api/reports/custom/excel", {
        method: "POST",
        body: payload,
        responseType: "blob"
      });
      
      if (res.data) {
        downloadFile(res.data, "Custom_Report.xlsx");
        toast.success("Custom report exported successfully!");
      } else {
        toast.error("Failed to generate report.");
      }
    } catch (e: any) {
      toast.error("Export failed: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Custom Report Builder</h1>
          <p className="text-slate-500">Select columns and filters to generate a dynamic Excel report.</p>
        </div>
        <Button onClick={handleExport} disabled={isExporting || selectedCols.length === 0} className="bg-brand-blue hover:bg-slate-800 text-white">
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Generating..." : "Export Excel"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center border-b pb-2">
            <Filter className="w-4 h-4 mr-2 text-blue-600" /> Filters
          </h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Company</label>
            <select 
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
            >
              <option value="all">All Companies</option>
              <option value="nakama">Nakama</option>
              <option value="ideon">Ideon</option>
              <option value="sleek_fit_studio_ltd">Sleek Fit Studio Ltd</option>
              <option value="joy_flowers">Joy Flowers</option>
            </select>
            
            <label className="text-sm font-medium text-gray-700 mt-2 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
            
            <label className="text-sm font-medium text-gray-700 mt-2 block">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Loan Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Any Status</option>
              <option value="disbursed">Disbursed</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {/* Columns Selection */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center border-b pb-2">
            <LayoutList className="w-4 h-4 mr-2 text-blue-600" /> Data Columns
          </h3>
          <p className="text-xs text-slate-500 mb-2">Select the fields to include in your export:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_COLUMNS.map((col) => (
              <label key={col.id} className="flex items-center space-x-3 p-2 rounded hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                <input 
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedCols.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

