import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Search, BookOpen, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function FinancialAnalysisPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const fetchAnalysis = async () => {
    try {
      const token = localStorage.getItem("leocap_token") || "";
      const res = await fetch(`/api/statements/analysis/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [params.id]);

  const handleUpload = async () => {
    if (!file) return toast.error("Select a statement PDF");
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
    formData.append("source", "mpesa");

    try {
      const token = localStorage.getItem("leocap_token") || "";
      const res = await fetch("/api/statements/upload", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success("Statement analyzed successfully!");
        fetchAnalysis();
      } else {
        toast.error(data.error || "Failed to analyze");
      }
    } catch (e) {
      toast.error("Upload failed");
    }
    setIsUploading(false);
  };

  return (
    <div className="p-6 w-full max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Financial Flow & CRB Analysis</h1>
          <p className="text-sm text-slate-500">M-Pesa & Bank Statement Engine</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4">Upload Statement</h2>
        <div className="flex gap-4 items-center">
          <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="border p-2 rounded w-64" />
          <input type="text" placeholder="PDF Password (if locked)" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 rounded w-64" />
          <Button onClick={handleUpload} disabled={isUploading || !file}>
            {isUploading ? "Analyzing..." : "Analyze M-Pesa PDF"}
          </Button>
        </div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-emerald-600">Income Detection</h2>
            {analysis.income_detection?.length > 0 ? (
              analysis.income_detection.map((inc: any, i: number) => (
                <div key={i} className="mb-4 p-4 border rounded bg-slate-50">
                  <p className="font-bold">{inc.employer}</p>
                  <p>Average: KES {inc.average_salary.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">Confidence: {inc.confidence.toFixed(1)}%</p>
                  <p className="text-sm text-slate-500">{inc.consistency}</p>
                </div>
              ))
            ) : <p>No recurring income detected.</p>}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 text-blue-600">M-Pesa Metrics</h2>
            {analysis.mpesa_metrics ? (
              <div className="space-y-2">
                <p>Total Inflows: <b>KES {analysis.mpesa_metrics.total_inflows.toLocaleString()}</b></p>
                <p>Total Outflows: <b>KES {analysis.mpesa_metrics.total_outflows.toLocaleString()}</b></p>
                <p>Dependency Ratio: <b>{analysis.mpesa_metrics.dependency_ratio.toFixed(1)}%</b></p>
                <p>Fuliza Count: <b>{analysis.mpesa_metrics.fuliza_count}</b></p>
                <p>PayBill/Till Count: <b>{analysis.mpesa_metrics.paybill_till_count}</b></p>
                <p>Total Transactions: <b>{analysis.mpesa_metrics.transaction_count}</b></p>
              </div>
            ) : <p>No M-Pesa data available.</p>}
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2">
            <h2 className="text-lg font-bold mb-4">Parsed Transactions</h2>
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-2 border-b">Date</th>
                    <th className="p-2 border-b">Description</th>
                    <th className="p-2 border-b">Category</th>
                    <th className="p-2 border-b">In</th>
                    <th className="p-2 border-b">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.recent_transactions?.map((t: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="p-2">{t.description}</td>
                      <td className="p-2 font-medium text-amber-600">
                        {t.is_internal_transfer ? "Internal Transfer" : t.category}
                      </td>
                      <td className="p-2 text-emerald-600">{t.money_in > 0 ? t.money_in : ''}</td>
                      <td className="p-2 text-red-600">{t.money_out > 0 ? t.money_out : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}