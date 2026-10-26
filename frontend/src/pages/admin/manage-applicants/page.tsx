

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { adminApplicantsApi, ManageApplicant } from "@/lib/adminApi";
import { apiCall, downloadFile } from "@/lib/apiClient";
import {
  Search,
  RefreshCw,
  Eye,
  Ban,
  RotateCcw,
  Users,
  Upload,
  Download,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatName } from "@/lib/formatName";
import { formatDate } from "@/lib/formatDate";
import { Tip } from "@/components/ui/tooltip";
import { SortHeader, SortSelect, type SortSpecs, type SortState } from "@/components/ui/sortable";
import { sortRows, timeOf } from "@/lib/sortRows";

type SortKey = "name" | "email" | "id_number" | "applicant_type" | "created_at";
const SORTS: SortSpecs<SortKey> = {
  name: { label: "Name", first: "asc", asc: "A to Z", desc: "Z to A" },
  email: { label: "Email", first: "asc", asc: "A to Z", desc: "Z to A" },
  id_number: { label: "ID Number", first: "asc", asc: "Lowest first", desc: "Highest first" },
  applicant_type: { label: "Type", first: "asc", asc: "A to Z", desc: "Z to A" },
  created_at: { label: "Joined", first: "desc", asc: "Oldest first", desc: "Newest first" },
};
const DEFAULT_SORT: SortState<SortKey> = { key: "created_at", dir: "desc" };
const SORT_BY: Record<SortKey, (a: ManageApplicant) => string | number | null> = {
  name: (a) => formatName(a.name),
  email: (a) => a.email,
  id_number: (a) => a.id_number,
  applicant_type: (a) => a.applicant_type,
  created_at: (a) => timeOf(a.created_at),
};

const thCls = "px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap";

function TypeBadge({ type }: { type?: string | null }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-brand-blue capitalize whitespace-nowrap">
      {type || "—"}
    </span>
  );
}

export default function ManageApplicantsPage() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<ManageApplicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>(DEFAULT_SORT);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showSuspended, setShowSuspended] = useState(false);
  const [downloadingDossier, setDownloadingDossier] = useState<string | null>(null);

  const handleDownloadDossier = async (applicantId: string, applicantName: string) => {
    setDownloadingDossier(applicantId);
    try {
      const { error } = await downloadFile(
        `/api/applicants/${applicantId}/dossier`,
        `Debt_Collection_Profile_${applicantName.replace(/ /g, '_')}.pdf`
      );
      if (error) {
        toast.error(error || "Failed to generate dossier");
      } else {
        toast.success("Dossier downloaded successfully");
      }
    } finally {
      setDownloadingDossier(null);
    }
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      const response = await adminApplicantsApi.getAll();
      if (response.error) {
        toast.error(response.error);
      } else if (response.data) {
        setApplicants(response.data.applicants || []);
      }
    } catch {
      toast.error("Failed to load applicants.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showSuspended, sort]);

  const handleStatusChange = async (app: ManageApplicant, suspend: boolean) => {
    const name = formatName(app.name) || "this applicant";
    const question = suspend
      ? `Suspend ${name}? They will not be able to sign in until you reactivate them. Their loans and documents are kept.`
      : `Reactivate ${name}? They will be able to sign in again.`;
    if (!confirm(question)) return;

    setIsDeleting(app.id);
    try {
      const response = suspend ? await adminApplicantsApi.suspend(app.id) : await adminApplicantsApi.activate(app.id);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(suspend ? `${name} suspended.` : `${name} reactivated.`);
        fetchApplicants();
      }
    } catch {
      toast.error(suspend ? "Failed to suspend applicant." : "Failed to reactivate applicant.");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredApplicants = applicants.filter(
    (app) =>
      (app.applicant_status === "suspended") === showSuspended &&
      ((app.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.id_number ?? "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Newest first, then the chosen column (rows that tie on it stay newest first)
  const sortedApplicants = useMemo(
    () => sortRows(sortRows(filteredApplicants, DEFAULT_SORT, SORT_BY), sort, SORT_BY),
    [filteredApplicants, sort],
  );

  // Calculate paginated slice
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedApplicants.slice(start, start + itemsPerPage);
  }, [sortedApplicants, currentPage]);

  const totalPages = Math.ceil(sortedApplicants.length / itemsPerPage);

  // ... Bulk Upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file to upload");
      return;
    }
    setUploading(true);
    setUploadResults(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkFile);

      const res = await apiCall<any>("/api/auth/applicant/bulk-upload", {
        method: "POST",
        isFormData: true,
        body: formData as any,
      });

      if (res.success && res.data) {
        setUploadResults(res.data);
        toast.success(`Successfully uploaded ${res.data.created} applicants`);
        fetchApplicants();
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      setBulkFile(null);
    }
  };

  const downloadTemplate = () => {
    window.open(`${import.meta.env.VITE_BACKEND_URL}/api/auth/applicant/bulk-upload/template`, "_blank");
  };

  const actions = (app: ManageApplicant) => {
    const suspended = app.applicant_status === "suspended";
    return (
    <>
      <Tip label="View details">
        <button
          onClick={() => navigate(`/admin/manage-applicants/${app.id}`)}
          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label="View details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </Tip>
      <Tip label="Export debt collection dossier">
        <button
          onClick={() => handleDownloadDossier(app.id, formatName(app.name))}
          disabled={downloadingDossier === app.id}
          className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-40"
          aria-label="Export debt collection dossier"
        >
          {downloadingDossier === app.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        </button>
      </Tip>
      <Tip label={suspended ? "Reactivate applicant" : "Suspend applicant"}>
        <button
          onClick={() => handleStatusChange(app, !suspended)}
          disabled={isDeleting === app.id}
          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${suspended ? "text-emerald-600 hover:bg-emerald-50" : "text-red-600 hover:bg-red-50"}`}
          aria-label={suspended ? "Reactivate applicant" : "Suspend applicant"}
        >
          {isDeleting === app.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : suspended ? <RotateCcw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
        </button>
      </Tip>
    </>
    );
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-blue shrink-0" />
            Manage Applicants
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            View, search, and manage registered applicants.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button onClick={fetchApplicants} disabled={isLoading} variant="outline" className="rounded-lg">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white p-4 rounded-lg ring-1 ring-slate-200 shadow-sm">
        <h2 className="text-[13px] font-bold text-slate-900 mb-3 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-blue-600" /> Bulk Employee Upload
        </h2>
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            className="flex-1 block w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={handleBulkUpload} disabled={uploading || !bulkFile} className="bg-brand-blue hover:bg-slate-800 flex-1 md:flex-none">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="flex-1 md:flex-none">
              <Download className="h-4 w-4 mr-2" /> Template
            </Button>
          </div>
        </div>
        {uploadResults && (
          <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm">
            <p className="font-bold text-emerald-600">Successfully created: {uploadResults.created}</p>
            <p className="text-amber-600 font-medium">Skipped (duplicates): {uploadResults.skipped_duplicates}</p>
            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="mt-2 text-red-600">
                <p className="font-bold">Errors ({uploadResults.errors.length}):</p>
                <ul className="list-disc pl-5 max-h-32 overflow-y-auto">
                  {uploadResults.errors.map((err: any, i: number) => (
                    <li key={i}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-lg ring-1 ring-slate-200 shadow-sm flex flex-col md:flex-row gap-3 md:gap-4 md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-shadow"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-3 gap-y-2 w-full md:w-auto">
          <div className="xl:hidden">
            <SortSelect specs={SORTS} sort={sort} onSort={setSort} label="Sort applicants" />
          </div>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[13px] font-semibold" role="group" aria-label="Applicant status">
            {([["Active", false], ["Suspended", true]] as [string, boolean][]).map(([label, value]) => (
              <button
                key={label}
                onClick={() => setShowSuspended(value)}
                aria-pressed={showSuspended === value}
                className={`px-3 py-1.5 whitespace-nowrap transition-colors ${showSuspended === value ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
            {sortedApplicants.length} applicant{sortedApplicants.length !== 1 && "s"}
          </div>
        </div>
      </div>

      {/* Table (wide screens) / cards (narrower ones: six columns do not fit) */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="px-6 py-12 flex items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-brand-blue" /></div>
        ) : sortedApplicants.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">No applicants found.</div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    {(Object.keys(SORTS) as SortKey[]).map((col) => (
                      <SortHeader key={col} specs={SORTS} col={col} sort={sort} onSort={setSort} className="px-4 text-left text-[11px] font-bold" />
                    ))}
                    <th className={`${thCls} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((app) => (
                    <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">{formatName(app.name) || "—"}</td>
                      <td className="px-4 py-2 text-slate-600 max-w-[260px]"><Tip label={app.email} whenClipped><span className="block truncate">{app.email}</span></Tip></td>
                      <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{app.id_number || "—"}</td>
                      <td className="px-4 py-2"><TypeBadge type={app.applicant_type} /></td>
                      <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{formatDate(app.created_at)}</td>
                      <td className="px-4 py-2"><div className="flex items-center justify-end gap-1">{actions(app)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="xl:hidden divide-y divide-slate-100">
              {paginated.map((app) => (
                <li key={app.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900 break-words">{formatName(app.name) || "—"}</p>
                    <TypeBadge type={app.applicant_type} />
                  </div>
                  <p className="text-sm text-slate-600 break-all">{app.email}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {app.id_number ? `ID ${app.id_number} · ` : ""}Joined {formatDate(app.created_at)}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">{actions(app)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredApplicants.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 px-4 sm:px-6 py-3 bg-slate-50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredApplicants.length)}</span> of <span className="font-medium text-slate-900">{filteredApplicants.length}</span> results
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
