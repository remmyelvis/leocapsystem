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
    const [source, setSource] = useState("mpesa");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [uploadId, setUploadId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("combined");

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
    formData.append("source", source);
    formData.append("applicant_id", params.id || "");

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
        toast.success("Document uploaded securely!");
        setUploadId(data.upload_id);
      } else {
        toast.error(data.error || "Failed to upload");
      }
    } catch (e) {
      toast.error("Upload failed");
    }
    setIsUploading(false);
  };

  const handleAnalyze = async () => {
    if (!uploadId) return toast.error("Please upload a document first");
    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem("leocap_token") || "";
      const res = await fetch(`/api/statements/analyze/${uploadId}`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success("Analysis complete!");
        fetchAnalysis();
      } else {
        toast.error(data.error || "Failed to analyze");
      }
    } catch (e) {
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
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

      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
        <h2 className="text-lg font-bold mb-4">1. Upload Statement</h2>
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <select value={source} onChange={(e) => setSource(e.target.value)} className="border p-2 rounded w-48 bg-slate-50 text-slate-700">
            <option value="mpesa">M-Pesa Statement</option>
            <option value="bank">Bank Statement</option>
          </select>
          <input type="file" accept=".pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setUploadId(null); }} className="border p-2 rounded w-64" />
          <input type="text" placeholder="PDF Password (if locked)" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 rounded w-64" />
          <Button onClick={handleUpload} disabled={isUploading || !file || uploadId !== null} className="bg-slate-800 hover:bg-slate-900">
            {isUploading ? "Uploading..." : uploadId ? "Uploaded ?" : "Upload Document"}
          </Button>
        </div>
        
        <h2 className="text-lg font-bold mb-4 pt-6 border-t border-slate-100">2. Run Analysis</h2>
        <div className="flex gap-4 items-center">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !uploadId} className="w-64 bg-emerald-600 hover:bg-emerald-700">
            {isAnalyzing ? "Processing AI Analysis..." : "Run AI Analysis"}
          </Button>
          {!uploadId && <p className="text-sm text-slate-400">Please upload a document first to enable analysis.</p>}
        </div>
      </div>

      {analysis && analysis.credit_analysis && (
        <div className="space-y-6">
          
          {/* Tabs */}
          <div className="flex space-x-2 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('combined')}
              className={`px-4 py-2 font-bold ${activeTab === 'combined' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Combined Score
            </button>
            {analysis.credit_analysis.mpesa && (
              <button 
                onClick={() => setActiveTab('mpesa')}
                className={`px-4 py-2 font-bold ${activeTab === 'mpesa' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                M-Pesa Analysis
              </button>
            )}
            {analysis.credit_analysis.bank && (
              <button 
                onClick={() => setActiveTab('bank')}
                className={`px-4 py-2 font-bold ${activeTab === 'bank' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Bank Analysis
              </button>
            )}
          </div>
          
          {/* Active Tab Content */}
          {(() => {
            const currentData = analysis.credit_analysis[activeTab];
            if (!currentData) return null;
            
            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{activeTab === 'combined' ? 'Combined Financial Risk Score' : activeTab === 'mpesa' ? 'M-Pesa Risk Score' : 'Bank Risk Score'}</h2>
                      <p className="text-slate-400 text-sm">Conservative statement analysis algorithm</p>
                    </div>
                    <div className="text-right">
                      <span className="text-5xl font-black text-emerald-400">{currentData.score}</span>
                      <span className="text-xl text-slate-400"> / 400</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-700">
                     <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Score Factors</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {currentData.scoring_details?.map((d: any, i: number) => (
                         <div key={i} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                           <span className="text-sm text-slate-300">{d.factor}</span>
                           <span className={`text-sm font-bold ${String(d.impact).startsWith('+') ? 'text-emerald-400' : String(d.impact).startsWith('-') ? 'text-rose-400' : 'text-slate-400'}`}>
                             {d.impact}
                           </span>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                    <h3 className="font-bold text-slate-800 mb-4">Active Credit Facilities</h3>
                    {currentData.active_credit_facilities?.length > 0 ? (
                      <ul className="space-y-2">
                        {currentData.active_credit_facilities.map((cf: string, i: number) => (
                          <li key={i} className="text-sm px-3 py-2 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg font-medium">{cf}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">None detected</p>
                    )}
                  </div>

                  {activeTab !== 'bank' ? (
                    <>
                      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                        <h3 className="font-bold text-slate-800 mb-4">Utility Payments</h3>
                        <div className="space-y-4">
                          <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                            <p className="text-xs text-sky-600 uppercase tracking-wider font-semibold">Frequency</p>
                            <p className="text-xl font-bold text-sky-900">{currentData.utilities?.count || 0} payments</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Spent</p>
                            <p className="text-lg font-bold text-slate-800">KES {(currentData.utilities?.total || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                        <h3 className="font-bold text-slate-800 mb-4">Living Expenses (Shopping)</h3>
                        <div className="space-y-4">
                          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                            <p className="text-xs text-orange-600 uppercase tracking-wider font-semibold">Frequency</p>
                            <p className="text-xl font-bold text-orange-900">{currentData.shopping?.count || 0} visits</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Spent</p>
                            <p className="text-lg font-bold text-slate-800">KES {(currentData.shopping?.total || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                        <h3 className="font-bold text-slate-800 mb-4">Bank Charges & Fees</h3>
                        <div className="space-y-4">
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                            <p className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Frequency</p>
                            <p className="text-xl font-bold text-amber-900">{currentData.bank_fees?.count || 0} charges</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Spent</p>
                            <p className="text-lg font-bold text-slate-800">KES {(currentData.bank_fees?.total || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                        <h3 className="font-bold text-slate-800 mb-4">Transfers Out (M-Pesa / EFT)</h3>
                        <div className="space-y-4">
                          <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                            <p className="text-xs text-purple-600 uppercase tracking-wider font-semibold">Frequency</p>
                            <p className="text-xl font-bold text-purple-900">{currentData.transfers_out?.count || 0} transfers</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Transferred</p>
                            <p className="text-lg font-bold text-slate-800">KES {(currentData.transfers_out?.total || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                    <h3 className="font-bold text-slate-800 mb-4">Frequent Income Sources</h3>
                    <ul className="divide-y divide-slate-100">
                      {currentData.frequent_inflows.map((inf: any, i: number) => (
                        <li key={i} className="py-3 flex justify-between text-sm items-center">
                          <span className="font-semibold text-slate-700 truncate pr-4">{inf.name}</span>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{inf.count}x</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
                    <h3 className="font-bold text-slate-800 mb-4">Frequent Outflow Destinations</h3>
                    <ul className="divide-y divide-slate-100">
                      {currentData.frequent_outflows.map((out: any, i: number) => (
                        <li key={i} className="py-3 flex justify-between text-sm items-center">
                          <span className="font-semibold text-slate-700 truncate pr-4">{out.name}</span>
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{out.count}x</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <details className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
            <summary className="p-4 font-bold text-slate-700 cursor-pointer select-none hover:bg-slate-50 rounded-2xl outline-none">View Raw Parsed Transactions</summary>
            <div className="p-4 pt-0">
               <div className="bg-white rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="p-4">Date</th>
                        <th className="p-4">Details</th>
                        <th className="p-4">Category</th>
                        <th className="p-4 text-right">Money Out</th>
                        <th className="p-4 text-right">Money In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.recent_transactions?.map((tx: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm">
                            <p className="font-medium text-slate-800">{tx.description || tx.memo}</p>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {tx.category || "Uncategorized"}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium text-right text-slate-900">
                            {tx.money_out > 0 ? tx.money_out.toLocaleString() : "-"}
                          </td>
                          <td className="p-4 text-sm font-medium text-right text-emerald-600">
                            {tx.money_in > 0 ? tx.money_in.toLocaleString() : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
