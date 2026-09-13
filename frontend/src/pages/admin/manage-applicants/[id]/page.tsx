

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApplicantsApi, ApplicantDetailsResponse, adminApplicationsApi, AdminApplicationItem } from "@/lib/adminApi";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  RefreshCw,
  Upload,
  CheckCircle2,
  Trash2,
  Download,
} from "lucide-react";
import { previewFile, apiCall, downloadFile } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface DocDef {
  key: string;
  serverType: string;
  label: string;
  description: string;
}

const BASE_DOCS: DocDef[] = [
  {
    key: "id_copy",
    serverType: "id_copy",
    label: "National ID Copy",
    description: "Upload a clear copy (front & back) of the national ID.",
  },
  {
    key: "kra_certificate",
    serverType: "kra_certificate",
    label: "KRA PIN Certificate",
    description: "Upload the KRA PIN certificate.",
  },
];

const IDEON_NAKAMA_DOC: DocDef = {
  key: "contract_document",
  serverType: "contract_document",
  label: "Contract Document",
  description: "Upload the original employment contract.",
};

function getRequiredDocs(applicantType: string): DocDef[] {
  const t = applicantType?.toLowerCase() || "";
  if (t === "ideon" || t === "nakama") {
    return [...BASE_DOCS, IDEON_NAKAMA_DOC];
  }
  return BASE_DOCS;
}

const ACCEPTED_DOC_TYPES = ["application/pdf"];
const MAX_DOC_SIZE_MB = 9;

function DocumentRow({
  doc,
  serverDoc,
  onFileSelect,
  selectedFile,
}: {
  doc: DocDef;
  serverDoc: any;
  onFileSelect: (key: string, file: File) => void;
  selectedFile: File | undefined;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploaded = Boolean(serverDoc);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      toast.error("Only PDF files are accepted.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_DOC_SIZE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onFileSelect(doc.key, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
        isUploaded
          ? "border-emerald-200 bg-emerald-50/40"
          : selectedFile
          ? "border-blue-200 bg-blue-50/40"
          : "border-dashed border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50"
      }`}
    >
      <div
        className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUploaded
            ? "bg-emerald-100 text-emerald-600"
            : selectedFile
            ? "bg-blue-100 text-blue-600"
            : "bg-blue-50 text-blue-600"
        }`}
      >
        {isUploaded ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{doc.label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{doc.description}</p>
        {isUploaded && serverDoc ? (
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {serverDoc.filename} &middot;{" "}
            {new Date(serverDoc.uploaded_at).toLocaleDateString("en-KE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        ) : selectedFile ? (
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {selectedFile.name} (Ready to upload)
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">PDF only · max {MAX_DOC_SIZE_MB} MB</p>
        )}
      </div>

      {!isUploaded && (
        <div className="flex-shrink-0">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl text-xs font-semibold border-slate-200"
          >
            <Upload className="mr-1.5 h-3 w-3" />
            {selectedFile ? "Change" : "Select File"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-900">
        {value || "N/A"}
      </span>
    </div>
  );
}

export default function ApplicantDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const [data, setData] = useState<ApplicantDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState<any>(null);

  
  const [applicantLoans, setApplicantLoans] = useState<AdminApplicationItem[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [statementEntries, setStatementEntries] = useState<any[] | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [downloadingStatement, setDownloadingStatement] = useState(false);
  const [statementStartDate, setStatementStartDate] = useState("");
  const [statementEndDate, setStatementEndDate] = useState("");
  const [statementRequestDate, setStatementRequestDate] = useState(new Date().toISOString().split("T")[0]);

  const handleGetStatement = async () => {
    setLoadingStatement(true);
    try {
      let url = `/api/applicant/statement/${params.id}`;
      const queryParams = new URLSearchParams();
      if (statementStartDate) queryParams.append("start_date", statementStartDate);
      if (statementEndDate) queryParams.append("end_date", statementEndDate);
      if (statementRequestDate) queryParams.append("request_date", statementRequestDate);
      const queryString = queryParams.toString();
      if (queryString) url += `?${queryString}`;

      const response = await apiCall(url);
      
      // Fetch loans
      setLoadingLoans(true);
      try {
        console.log("Fetching loans for applicant:", params.id);
        const loansRes = await adminApplicationsApi.getAll();
        console.log("Loans API response:", loansRes);
        if (!loansRes.error && loansRes.data) {
          console.log("Total loans fetched:", loansRes.data.length);
          const filtered = loansRes.data.filter(a => a.application.applicant_id === params.id || a.application.applicant_id === response.data?.applicant?.id || a.bio_data?.email === response.data?.applicant?.email);
          console.log("Filtered loans:", filtered.length, filtered);
          filtered.sort((a,b) => new Date(b.application.created_at || b.application.date_submitted || 0).getTime() - new Date(a.application.created_at || a.application.date_submitted || 0).getTime());
          setApplicantLoans(filtered);
        } else {
          console.error("Loans API error:", loansRes.error);
        }
      } catch (e) {
        console.error("Error fetching loans:", e);
      } finally {
        setLoadingLoans(false);
      }

      if (response.error) {
        toast.error(response.error);
      } else {
        let entries = [];
        if (Array.isArray(response.data)) {
          entries = response.data;
        } else if (response.data && typeof response.data === 'object') {
          const arrayVal = Object.values(response.data).find(val => Array.isArray(val));
          if (arrayVal) entries = arrayVal as any[];
        }
        setStatementEntries(entries);
        toast.success("Statement entries loaded");
      }
    } catch (error) {
      toast.error("Failed to load statement entries");
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleDownloadStatement = async () => {
    setDownloadingStatement(true);
    let url = `/api/applicant/statement/download/${params.id}`;
    const queryParams = new URLSearchParams();
    if (statementStartDate) queryParams.append("start_date", statementStartDate);
    if (statementEndDate) queryParams.append("end_date", statementEndDate);
    const queryString = queryParams.toString();
    if (queryString) url += `?${queryString}`;

    const { error } = await downloadFile(url, `statement_${params.id}.pdf`);
    setDownloadingStatement(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Statement downloaded");
    }
  };

  const handleFileSelect = (key: string, file: File) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleUploadAll = async () => {
    if (!data?.applicant || uploadingDocs) return;
    setUploadingDocs(true);
    try {
      const fd = new FormData();
      Object.entries(selectedFiles).forEach(([key, file]) => {
        fd.append(key, file);
      });
      // The update profile endpoint requires some fields
      fd.append("name", data.applicant.name || "");
      fd.append("email", data.applicant.email || "");
      fd.append("phone_number", data.applicant.phone_number || "");
      fd.append("kra_pin", data.applicant.kra_pin || "");
      fd.append("id_number", data.applicant.id_number || "");

      const response = await apiCall(`/api/auth/applicant/update/${params.id}`, {
        method: "PATCH",
        isFormData: true,
        formData: fd,
        requiresAuth: true,
        skipProxy: true,
      });

      
      // Fetch loans
      setLoadingLoans(true);
      try {
        console.log("Fetching loans for applicant:", params.id);
        const loansRes = await adminApplicationsApi.getAll();
        console.log("Loans API response:", loansRes);
        if (!loansRes.error && loansRes.data) {
          console.log("Total loans fetched:", loansRes.data.length);
          const filtered = loansRes.data.filter(a => a.application.applicant_id === params.id || a.application.applicant_id === response.data?.applicant?.id || a.bio_data?.email === response.data?.applicant?.email);
          console.log("Filtered loans:", filtered.length, filtered);
          filtered.sort((a,b) => new Date(b.application.created_at || b.application.date_submitted || 0).getTime() - new Date(a.application.created_at || a.application.date_submitted || 0).getTime());
          setApplicantLoans(filtered);
        } else {
          console.error("Loans API error:", loansRes.error);
        }
      } catch (e) {
        console.error("Error fetching loans:", e);
      } finally {
        setLoadingLoans(false);
      }

      if (response.error) {
        toast.error(response.error || "Upload failed. Please try again.");
        return;
      }

      toast.success("Documents uploaded successfully");
      setSelectedFiles({});
      fetchDetails();
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingDocs(false);
    }
  };


  const handleVerifyDocument = async (docId: string, status: string) => {
    const comment = prompt(`Please enter a comment for ${status} document (sent to applicant if rejected):`);
    if (comment === null) return;
    
    toast.info(`Marking document as ${status}...`);
    try {
      const res = await apiCall(`/api/applicant/documents/verify/${docId}`, {
        method: "POST",
        body: JSON.stringify({ status, comment }),
      });
      if (!res.error) {
        toast.success(`Document ${status} successfully`);
        fetchDetails();
      } else {
        toast.error(res.error);
      }
    } catch(e) {
      toast.error("Failed to verify document");
    }
  };

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    setApplicantLoans([]);
    setStatementEntries([]);
    try {
      const response = await adminApplicantsApi.getOne(params.id);
      try {
        const riskRes = await apiCall(`/api/applicants/${params.id}/risk-profile`);
        if (!riskRes.error && riskRes.data) {
          setRiskProfile(riskRes.data);
        }
      } catch(e) {
        console.error("Risk profile error", e);
      }

      
      // Fetch loans
      setLoadingLoans(true);
      try {
        console.log("Fetching loans for applicant:", params.id);
        const loansRes = await adminApplicationsApi.getAll();
        console.log("Loans API response:", loansRes);
        if (!loansRes.error && loansRes.data) {
          console.log("Total loans fetched:", loansRes.data.length);
          const filtered = loansRes.data.filter(a => a.application.applicant_id === params.id || a.application.applicant_id === response.data?.applicant?.id || a.bio_data?.email === response.data?.applicant?.email);
          console.log("Filtered loans:", filtered.length, filtered);
          filtered.sort((a,b) => new Date(b.application.created_at || b.application.date_submitted || 0).getTime() - new Date(a.application.created_at || a.application.date_submitted || 0).getTime());
          setApplicantLoans(filtered);
        } else {
          console.error("Loans API error:", loansRes.error);
        }
      } catch (e) {
        console.error("Error fetching loans:", e);
      } finally {
        setLoadingLoans(false);
      }

      if (response.error) {
        setError(response.error);
        toast.error(response.error);
      } else if (response.data) {
        setData(response.data);
      }
    } catch {
      setError("Failed to load applicant details.");
      toast.error("Failed to load applicant details.");
    } finally {
      setIsLoading(false);
    }
  };

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;
    setDeletingDocId(docId);
    try {
      const response = await apiCall(`/api/applicant/documents/delete/${docId}`, {
        method: "DELETE",
        requiresAuth: true,
      });

      
      // Fetch loans
      setLoadingLoans(true);
      try {
        console.log("Fetching loans for applicant:", params.id);
        const loansRes = await adminApplicationsApi.getAll();
        console.log("Loans API response:", loansRes);
        if (!loansRes.error && loansRes.data) {
          console.log("Total loans fetched:", loansRes.data.length);
          const filtered = loansRes.data.filter(a => a.application.applicant_id === params.id || a.application.applicant_id === response.data?.applicant?.id || a.bio_data?.email === response.data?.applicant?.email);
          console.log("Filtered loans:", filtered.length, filtered);
          filtered.sort((a,b) => new Date(b.application.created_at || b.application.date_submitted || 0).getTime() - new Date(a.application.created_at || a.application.date_submitted || 0).getTime());
          setApplicantLoans(filtered);
        } else {
          console.error("Loans API error:", loansRes.error);
        }
      } catch (e) {
        console.error("Error fetching loans:", e);
      } finally {
        setLoadingLoans(false);
      }

      if (response.error) {
        toast.error(response.error || "Failed to delete document.");
      } else {
        toast.success("Document deleted successfully.");
        fetchDetails();
      }
    } catch (error) {
      toast.error("Failed to delete document.");
    } finally {
      setDeletingDocId(null);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-6 w-full max-w-[800px] mx-auto flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  if (error || !data?.applicant) {
    return (
      <div className="p-6 w-full max-w-[800px] mx-auto text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Applicant Not Found</h2>
        <p className="text-slate-500">{error || "The requested applicant could not be found."}</p>
        <Button onClick={() => navigate(-1)} className="rounded-xl">Go Back</Button>
      </div>
    );
  }

  const { applicant, docs } = data;

  return (
    <div className="p-6 w-full max-w-[800px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            {applicant.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Applicant Details
          </p>
        </div>
      </div>

      {riskProfile && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 mb-6">
          <div className={`p-4 border-b bg-${riskProfile.color}-50 border-${riskProfile.color}-100 flex justify-between items-center`}>
            <div>
              <div className="flex items-center gap-4">
                <h2 className={`text-lg font-black text-${riskProfile.color}-900`}>Credit Risk Profile</h2>
                <Button 
                  onClick={async () => {
                    toast.info("Generating CRB Report...");
                    try {
                      await downloadFile(`/api/applicants/${params.id}/risk-profile?format=pdf`, `CRB_Grade_Report_${applicant.name.replace(' ', '_')}.pdf`);
                      toast.success("CRB Report downloaded successfully");
                    } catch(e) {
                      toast.error("Failed to download CRB Report");
                    }
                  }}
                  variant="outline" 
                  size="sm"
                  className={`bg-white border-${riskProfile.color}-200 text-${riskProfile.color}-700 hover:bg-${riskProfile.color}-100`}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CRB Report PDF
                </Button>
              </div>
              <p className={`text-xs text-${riskProfile.color}-700 mt-1`}>Automated algorithmic assessment</p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black text-${riskProfile.color}-600`}>{riskProfile.score} / {riskProfile.max_score}</div>
              <div className={`text-sm font-bold text-${riskProfile.color}-800`}>{riskProfile.tier} ({riskProfile.risk_level})</div>
            </div>
          </div>
          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Factor Evaluated</th>
                  <th className="py-3 px-4 w-32 text-right">Score Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskProfile.factors.map((factor: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-700 flex items-center gap-2">
                      {factor.type === 'positive' ? (
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      ) : factor.type === 'negative' ? (
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                      {factor.factor}
                    </td>
                    <td className={`py-3 px-4 text-sm font-bold text-right ${factor.type === 'positive' ? 'text-emerald-600' : factor.type === 'negative' ? 'text-red-600' : 'text-slate-500'}`}>
                      {factor.impact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-brand-blue" />
            Personal Information
          </h2>
          <div className="space-y-1">
            <Field label="Full Name" value={applicant.name} />
            <Field label="Email Address" value={
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {applicant.email}
              </span>
            } />
            <Field label="Phone Number" value={
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                {applicant.phone_number}
              </span>
            } />
            <Field label="ID Number" value={
              <span className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                {applicant.id_number}
              </span>
            } />
          </div>
        </div>

        {/* Additional Details */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-brand-blue" />
            Additional Details
          </h2>
          <div className="space-y-1">
            <Field label="KRA PIN" value={applicant.kra_pin} />
            <Field label="Applicant Type" value={
              <span className="capitalize">{applicant.applicant_type}</span>
            } />
            <Field label="Role" value={
              <span className="capitalize">{applicant.role}</span>
            } />
            <Field label="Joined" value={
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                {new Date(applicant.created_at).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            } />
          </div>
        </div>
      </div>

      
      {/* Applications / Loans List */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-brand-blue" />
          Loan Applications
        </h2>
        {loadingLoans ? (
          <div className="flex justify-center p-4"><RefreshCw className="h-6 w-6 animate-spin text-brand-blue" /></div>
        ) : applicantLoans.length > 0 ? (
          <div className="space-y-3">
            {applicantLoans.map((item) => (
              <div key={item.application.id} className="flex flex-col sm:flex-row justify-between p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="mb-3 sm:mb-0">
                  <p className="font-bold text-slate-800 text-sm">
                    {item.application.loan_type?.replace(/_/g, ' ')} <span className="text-xs text-slate-500 font-normal">#{item.application.id?.substring(0,8)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex gap-3">
                    <span>Applied: {new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(item.application.amount_applied || 0))}</span>
                    <span>Status: <span className="font-bold text-slate-700 capitalize">{item.application.loan_status?.replace(/_/g, ' ')}</span></span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/admin/applications/${item.application.id}`} className="text-xs bg-white border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    View Details
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200 font-bold"
                    onClick={() => downloadFile(`/api/applications/${item.application.id}/dossier`, `Debt_Collection_Profile_${(data?.applicant?.name || "Applicant").replace(/ /g, "_")}_${item.application.id?.substring(0,8)}.pdf`)}
                  >
                    <Download className="h-3 w-3 mr-1.5" />
                    Export Dossier
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm font-medium">
            No loan applications found.
          </div>
        )}
      </div>

      {/* Statement Actions */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-brand-blue" />
          Applicant Statement
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Start Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={statementStartDate}
              onChange={(e) => setStatementStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-brand-blue"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">End Date <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={statementEndDate}
              onChange={(e) => setStatementEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-brand-blue"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Request Date</label>
            <input 
              type="date" 
              value={statementRequestDate}
              onChange={(e) => setStatementRequestDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={handleGetStatement} disabled={loadingStatement} variant="outline" className="rounded-xl flex-1">
            {loadingStatement ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            View Statement Entries
          </Button>
          <Button 
            onClick={handleDownloadStatement} 
            disabled={!statementStartDate || !statementEndDate || downloadingStatement}
            className="bg-blue-900 hover:bg-slate-800 text-white rounded-xl flex-1 disabled:opacity-50"
          >
            {downloadingStatement ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {downloadingStatement ? "Downloading..." : "Download PDF Statement"}
          </Button>
        </div>

        {statementEntries && (
          <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-gray-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3 sticky top-0 bg-slate-50">Date</th>
                  <th className="px-6 py-3 sticky top-0 bg-slate-50">Memo</th>
                  <th className="px-6 py-3 text-right sticky top-0 bg-slate-50">Debit</th>
                  <th className="px-6 py-3 text-right sticky top-0 bg-slate-50">Credit</th>
                  <th className="px-6 py-3 text-right sticky top-0 bg-slate-50">Balance</th>
                </tr>
              </thead>
              <tbody>
                {!Array.isArray(statementEntries) || statementEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-slate-500">
                      No statement entries found.
                    </td>
                  </tr>
                ) : (
                  statementEntries.map((entry, idx) => (
                    <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">{entry.memo || entry.description || 'N/A'}</td>
                      <td className="px-6 py-4 text-right text-red-600">
                        {entry.debit !== undefined ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(entry.debit)) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600">
                        {entry.credit !== undefined ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(entry.credit)) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {entry.balance !== undefined ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(entry.balance)) : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Documents */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-6">
          <Upload className="h-4 w-4 text-brand-blue" />
          Upload Documents
        </h2>
        
        <form onSubmit={(e) => { e.preventDefault(); handleUploadAll(); }}>
          <div className="flex flex-col gap-3">
            {getRequiredDocs(applicant.applicant_type).map((doc) => {
              const serverDoc = docs?.find((d) => d.document_type === doc.serverType);
              return (
                <DocumentRow
                  key={doc.key}
                  doc={doc}
                  serverDoc={serverDoc}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFiles[doc.key]}
                />
              );
            })}
          </div>
          {Object.keys(selectedFiles).length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                disabled={uploadingDocs}
                className="bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingDocs ? "Uploading..." : "Upload documents"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Uploaded Documents */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2 mb-6">
          <FileText className="h-4 w-4 text-brand-blue" />
          Uploaded Documents
        </h2>

        {docs && docs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  toast.info("Opening document preview...");
                  previewFile(
                    `/api/applicant/documents/download/${doc.id}`,
                    doc.filetype === "pdf" ? "application/pdf" : "application/pdf"
                  ).catch((err) => {
                    toast.error("Failed to preview document");
                    console.error(err);
                  });
                }}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-4 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <div className="p-3 bg-blue-100 rounded-xl text-brand-blue flex-shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate w-full" title={doc.filename}>
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                    {doc.document_type.replace(/_/g, " ")} • {doc.filetype.toUpperCase()}
                  </p>
                  {doc.document_passcode && (
                    <p className="text-xs font-mono text-slate-600 mt-1 bg-white inline-block px-1.5 py-0.5 rounded border border-slate-200">
                      Passcode: {doc.document_passcode}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 z-10 items-end" onClick={(e) => e.stopPropagation()}>
                  {doc.status === 'accepted' ? (
                    <span className="text-xs text-green-600 font-bold px-2 py-1 bg-green-100 rounded">Accepted</span>
                  ) : doc.status === 'rejected' ? (
                    <span className="text-xs text-red-600 font-bold px-2 py-1 bg-red-100 rounded">Rejected</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline" className="h-6 px-3 text-[10px] border-green-200 text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleVerifyDocument(doc.id, 'accepted'); }}>Accept</Button>
                      <Button size="sm" variant="outline" className="h-6 px-3 text-[10px] border-red-200 text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleVerifyDocument(doc.id, 'rejected'); }}>Reject</Button>
                    </div>
                  )}
                  {doc.admin_comment && <p className="text-[9px] text-slate-500 italic mt-1 max-w-[100px] text-right truncate" title={doc.admin_comment}>{doc.admin_comment}</p>}
                </div>
                <div className="flex-shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    disabled={deletingDocId === doc.id}
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                  >
                    {deletingDocId === doc.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">No documents uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}
