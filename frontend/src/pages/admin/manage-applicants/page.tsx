

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
  Users,
  Upload,
  Download,
  FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ManageApplicantsPage() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState<ManageApplicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof ManageApplicant>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to suspend this applicant? This action cannot be undone.")) return;

    setIsDeleting(id);
    try {
      const response = await adminApplicantsApi.delete(id);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Applicant suspended successfully.");
        fetchApplicants();
      }
    } catch {
      toast.error("Failed to suspend applicant.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSort = (field: keyof ManageApplicant) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filteredApplicants = applicants.filter(
    (app) =>
      app.applicant_status !== "suspended" &&
      ((app.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.id_number ?? "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

    const sortedApplicants = useMemo(() => {
    return [...filteredApplicants].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (aValue < bValue) return sortDir === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredApplicants, sortField, sortDir]);

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

  return (
    <div className="p-6 w-full max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-blue" />
            Manage Applicants
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View, search, and manage registered applicants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchApplicants} disabled={isLoading} variant="outline" className="rounded-xl">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="bg-white p-6 rounded-xl ring-1 ring-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-blue-600" /> Bulk Employee Upload
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="file"
            accept=".csv, .xlsx"
            onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            className="flex-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={handleBulkUpload} disabled={uploading || !bulkFile} className="bg-brand-blue hover:bg-slate-800 w-full md:w-auto">
              {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
            <Button variant="outline" onClick={downloadTemplate} className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" /> Template
            </Button>
          </div>
        </div>
        {uploadResults && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
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
      <div className="bg-white p-4 rounded-xl ring-1 ring-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or ID number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-shadow"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
          {sortedApplicants.length} applicant{sortedApplicants.length !== 1 && "s"} found
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("name")}>
                  Name {sortField === "name" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("email")}>
                  Email {sortField === "email" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("id_number")}>
                  ID Number {sortField === "id_number" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("applicant_type")}>
                  Type {sortField === "applicant_type" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("created_at")}>
                  Joined {sortField === "created_at" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-4 font-black text-slate-900 uppercase tracking-wide text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-brand-blue" />
                    </div>
                  </td>
                </tr>
              ) : sortedApplicants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No applicants found.
                  </td>
                </tr>
              ) : (
                sortedApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{app.name}</td>
                    <td className="px-6 py-4 text-slate-600">{app.email}</td>
                    <td className="px-6 py-4 text-slate-600">{app.id_number}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-brand-blue capitalize">
                        {app.applicant_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/manage-applicants/${app.id}`)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadDossier(app.id, app.name)}
                          disabled={downloadingDossier === app.id}
                          className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-40"
                          title="Export Debt Collection Dossier"
                        >
                          {downloadingDossier === app.id
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <FileDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          disabled={isDeleting === app.id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Suspend Applicant"
                        >
                          {isDeleting === app.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!isLoading && filteredApplicants.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
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
