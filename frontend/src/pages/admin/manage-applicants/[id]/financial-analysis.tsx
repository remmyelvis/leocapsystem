import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Upload, Search, BookOpen, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiCall, downloadFile } from "@/lib/apiClient";

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
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("combined");
  const [loanAsk, setLoanAsk] = useState<string>("");
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);


  const fetchHistory = async () => {
    const res = await apiCall<any[]>(`/api/statements/list/${params.id}`);
    if (res.data) setHistory(res.data);
  };

  const fetchAnalysis = async () => {
    const url = loanAsk ? `/api/statements/analysis/${params.id}?loan_ask=${loanAsk}` : `/api/statements/analysis/${params.id}`;
    const res = await apiCall<any>(url);
    if (res.data) setAnalysis(res.data);
  };

  useEffect(() => {
    fetchAnalysis();
    fetchHistory();
  }, [params.id]);

  const handleUpload = async () => {
    if (!file) return toast.error("Select a statement PDF");
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);
    formData.append("source", source);
    formData.append("applicant_id", params.id || "");

    const res = await apiCall<{ upload_id: number }>("/api/statements/upload", { method: "POST", isFormData: true, formData });
    if (res.error || !res.data) {
      toast.error(res.error || "Failed to upload");
    } else {
      toast.success("Document uploaded securely!");
      setUploadId(res.data.upload_id);
      fetchHistory();
    }
    setIsUploading(false);
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Delete this statement and the transactions read from it? This cannot be undone.")) return;
    const res = await apiCall(`/api/statements/${id}`, { method: "DELETE" });
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Statement deleted");
    fetchHistory();
    fetchAnalysis();
  };


  const handleChat = async () => {
    if (!chatQuery.trim()) return;
    
    const userMsg = chatQuery;
    setChatHistory(prev => [...prev, {role: 'user', text: userMsg}]);
    setChatQuery("");
    setIsChatting(true);
    
    const res = await apiCall<{ answer: string }>(`/api/statements/chat/${params.id}`, { method: "POST", body: { message: userMsg } });
    if (res.data) {
      setChatHistory(prev => [...prev, {role: 'ai', text: res.data!.answer}]);
    } else {
      toast.error(res.error || "Failed to get answer");
    }
    setIsChatting(false);
  };

  const handleAnalyze = async () => {
    if (!uploadId) return toast.error("Please upload a document first");
    setIsAnalyzing(true);

    const res = await apiCall(`/api/statements/analyze/${uploadId}`, { method: "POST" });
    if (res.error) {
      toast.error(res.error || "Failed to analyze");
    } else {
      toast.success("Analysis complete!");
      fetchAnalysis();
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Financial Flow & CRB Analysis</h1>
            <p className="text-sm text-slate-500">M-Pesa & Bank Statement Engine</p>
          </div>
        </div>
        {analysis && (
          <Button 
            onClick={async () => {
              const { error } = await downloadFile(`/api/statements/export_report/${params.id}?loan_ask=${loanAsk || 0}`, `Credit_Risk_Profile_${params.id}.pdf`);
              if (error) toast.error(error || "Failed to export PDF");
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download className="mr-2 h-4 w-4" /> Export PDF Report
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
        <h2 className="text-[13px] font-bold mb-3">1. Upload Statement & Loan Request</h2>
          <div className="mb-3">
            <label className="block text-[13px] font-medium text-slate-700 mb-1">Loan Ask Amount (KES) - Optional, used to guide affordability analysis</label>
            <input 
              type="number" 
              placeholder="e.g. 50000" 
              value={loanAsk} 
              onChange={(e) => setLoanAsk(e.target.value)} 
              className="border px-2.5 py-1.5 text-[13px] rounded-lg w-full sm:w-64 text-slate-700 bg-white" 
            />
          </div>
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <select value={source} onChange={(e) => setSource(e.target.value)} className="border px-2.5 py-1.5 text-[13px] rounded-lg w-full sm:w-48 bg-slate-50 text-slate-700">
            <option value="mpesa">M-Pesa Statement</option>
            <option value="bank">Bank Statement</option>
          </select>
          <input type="file" accept=".pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setUploadId(null); }} className="border px-2.5 py-1.5 text-[13px] rounded-lg w-full sm:w-64" />
          <input type="text" placeholder="PDF Password (if locked)" value={password} onChange={(e) => setPassword(e.target.value)} className="border px-2.5 py-1.5 text-[13px] rounded-lg w-full sm:w-64" />
          <Button onClick={handleUpload} disabled={isUploading || !file || uploadId !== null} className="bg-slate-800 hover:bg-slate-900 w-full sm:w-auto">
            {isUploading ? "Uploading..." : uploadId ? "Uploaded ✓" : "Upload Document"}
          </Button>
        </div>
        
        <h2 className="text-[13px] font-bold mb-3 pt-4 border-t border-slate-100">2. Run Analysis</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
          <Button onClick={handleAnalyze} disabled={isAnalyzing || !uploadId} className="w-full sm:w-64 bg-emerald-600 hover:bg-emerald-700">
            {isAnalyzing ? "Processing AI Analysis..." : "Run AI Analysis"}
          </Button>
          {!uploadId && <p className="text-sm text-slate-400">Please upload a document first to enable analysis.</p>}
        </div>
      </div>

      
      {/* Statement History */}
      {history.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm mb-6">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3">Uploaded Statements</h3>
          <div className="space-y-3">
            {history.map((stmt: any) => (
              <div key={stmt.id} className="flex flex-wrap items-center justify-between gap-2 p-3 border border-slate-100 rounded-lg">
                <div>
                  <p className="font-semibold text-sm">{stmt.filename}</p>
                  <p className="text-xs text-slate-500">Uploaded: {new Date(stmt.uploaded_at).toLocaleString()}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(stmt.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Output */}
      {analysis && analysis.credit_analysis && (
        <>
        {analysis.gemini_narrative && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100 shadow-sm mb-6">
            <h3 className="text-[13px] font-bold text-indigo-900 mb-2 flex items-center gap-2">
              AI Executive Summary
            </h3>
            <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
              {analysis.gemini_narrative}
            </p>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border border-slate-200/60">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-[13px] font-bold">Analysis Results</h2>
            <div className="flex gap-2">
              {analysis.credit_analysis.mpesa && (
                <Button variant={activeTab === 'mpesa' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('mpesa')}>
                  M-Pesa Analysis
                </Button>
              )}
              {analysis.credit_analysis.bank && (
                <Button variant={activeTab === 'bank' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('bank')}>
                  Bank Analysis
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-5">
            {(() => {
              const currentData = analysis.credit_analysis[activeTab];
              if (!currentData) return <p className="text-slate-500 italic">No data available for this source.</p>;
              
              return (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col md:flex-row gap-4 mb-5">
                    <div className="flex-1 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                      <p className="text-slate-500 text-[13px] font-medium mb-1">Credit Score</p>
                      <h3 className={`text-3xl font-bold ${currentData.score > 250 ? 'text-emerald-600' : currentData.score > 150 ? 'text-amber-500' : 'text-red-500'}`}>
                        {currentData.score}
                      </h3>
                      <p className="text-slate-400 text-sm mt-2">Max 400</p>
                    </div>
                    <div className="flex-[2] bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-blue-900 text-[13px] font-medium mb-2">Score Factors</p>
                      <ul className="space-y-2">
                        {(currentData.scoring_details ?? currentData.details)?.map((d: any, i: number) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-700">{d.factor}</span>
                            <span className={`font-bold ${String(d.impact).startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{d.impact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {currentData.advanced_metrics && (
                    <div className="mb-5 p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <h3 className="text-[13px] font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Risk Indicators & Affordability
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentData.advanced_metrics.loan_ask_analysis && (
                          <div className="bg-white p-4 rounded-lg border border-blue-100">
                            <h4 className="font-bold text-blue-900 mb-2">Loan Affordability Analysis</h4>
                            <ul className="text-sm space-y-1 text-blue-800">
                              <li><strong>Loan Ask:</strong> KES {currentData.advanced_metrics.loan_ask_analysis.amount_requested.toLocaleString()}</li>
                              <li><strong>Statement Duration:</strong> {currentData.advanced_metrics.loan_ask_analysis.statement_months} months</li>
                              <li><strong>Avg Monthly Inflow:</strong> KES {currentData.advanced_metrics.loan_ask_analysis.avg_monthly_inflow.toLocaleString()}</li>
                              <li><strong>Est. Monthly Retention (33%):</strong> KES {currentData.advanced_metrics.loan_ask_analysis.avg_monthly_retention?.toLocaleString()}</li>
                              <li><strong>Ask to Retention Ratio:</strong> {currentData.advanced_metrics.loan_ask_analysis.ratio_to_retention}x</li>
                              <li><strong>Risk Rating:</strong> {currentData.advanced_metrics.loan_ask_analysis.affordability}</li>
                            </ul>
                          </div>
                        )}
                      
                        {currentData.advanced_metrics.heavy_credit_dependency_flags?.length > 0 && (
                          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <h4 className="font-bold text-amber-800 mb-2">Heavy Credit Dependency</h4>
                            <p className="text-sm text-amber-900 mb-2">Distress flags (arrears, penalties, etc): {currentData.advanced_metrics.heavy_credit_dependency_flags.length}</p>
                            <ul className="text-xs space-y-1">
                              {currentData.advanced_metrics.heavy_credit_dependency_flags.slice(0,3).map((h: any, i: number) => (
                                <li key={i} className="text-amber-900">{h.date ? h.date.split('T')[0] : ''}: {h.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {currentData.advanced_metrics.gambling_instances?.length > 0 && (
                          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <h4 className="font-bold text-red-800 mb-2">Gambling Detected</h4>
                            <p className="text-sm text-red-900 mb-2">Found {currentData.advanced_metrics.gambling_instances.length} instances.</p>
                            <ul className="text-xs space-y-1">
                              {currentData.advanced_metrics.gambling_instances.slice(0,3).map((g: any, i: number) => (
                                <li key={i} className="text-red-900">{g.date ? g.date.split('T')[0] : ''}: {g.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {currentData.advanced_metrics.lipa_mdogo_mdogo_instances?.length > 0 && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h4 className="font-bold text-blue-800 mb-2">Asset Financing (Lipa Mdogo Mdogo)</h4>
                            <ul className="text-xs space-y-1">
                              {currentData.advanced_metrics.lipa_mdogo_mdogo_instances.slice(0,3).map((l: any, i: number) => (
                                <li key={i} className="text-blue-900">{l.date ? l.date.split('T')[0] : ''}: {l.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                          <h4 className="text-[13px] font-bold text-slate-800 mb-2">Extremes</h4>
                          <ul className="text-sm space-y-1 text-slate-600">
                            <li>Highest Balance: {currentData.advanced_metrics.highest_balance?.toLocaleString()}</li>
                            <li>Lowest Balance: {currentData.advanced_metrics.lowest_balance?.toLocaleString()}</li>
                            <li>Highest Money In: {currentData.advanced_metrics.highest_money_in?.toLocaleString()}</li>
                            <li>Highest Money Out: {currentData.advanced_metrics.highest_money_out?.toLocaleString()}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Top Entities Paid</h4>
                      <div className="space-y-2">
                        {currentData.frequent_outflows?.map((f: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                            <span className="font-medium text-slate-700 truncate mr-2">{f.name}</span>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{f.count} txns</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Top Entities Received From</h4>
                      <div className="space-y-2">
                        {currentData.frequent_inflows?.map((f: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                            <span className="font-medium text-slate-700 truncate mr-2">{f.name}</span>
                            <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">{f.count} txns</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        
        {/* Chat with Statement */}
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm mt-5">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3 flex items-center gap-2">
            Chat with this Statement
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded-lg h-64 overflow-y-auto p-4 mb-4 space-y-4">
            {chatHistory.length === 0 ? (
              <p className="text-slate-400 text-sm italic text-center mt-20">Ask Gemini anything about this applicant's financial history...</p>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-500 p-3 rounded-lg text-sm italic">
                  Gemini is thinking...
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 p-2 border border-slate-300 rounded-md text-sm" 
              placeholder="e.g. Do they have any late night gambling transactions?"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            />
            <Button onClick={handleChat} disabled={isChatting || !chatQuery.trim()}>Ask</Button>
          </div>
        </div>
        
        </>
      )}
      
      {/* Recent Transactions Table */}
      {analysis && analysis.recent_transactions && (
        <div className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm mt-6">
          <h3 className="text-[13px] font-bold text-slate-800 mb-3">Sample Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">In</th>
                  <th className="px-4 py-3 text-right">Out</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {analysis.recent_transactions?.map((tx: any, i: number) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">{tx.date?.split('T')[0]}</td>
                    <td className="px-4 py-2">{tx.description}</td>
                    <td className="px-4 py-2 text-right text-emerald-600">{tx.money_in > 0 ? tx.money_in.toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 text-right text-red-500">{tx.money_out > 0 ? tx.money_out.toLocaleString() : '-'}</td>
                    <td className="px-4 py-2 text-right font-medium">{tx.balance?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
    </div>
  );
}
