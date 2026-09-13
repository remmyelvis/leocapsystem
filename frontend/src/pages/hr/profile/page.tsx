

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Lock,
  Save,
  Upload,
  User,
  X,
} from "lucide-react";
import { applicantApi } from "@/lib/applicantApi";
import type { ApplicantDoc } from "@/lib/applicantApi";
import { useHrProfileStore } from "@/store/hrProfileStore";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { ProfileProgressBar } from "@/components/profile/ProfileCompletion";
import { ChangePasswordSection } from "@/components/profile/ChangePassword";
import { apiCall } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .or(z.literal("")),
  idNumber: z
    .string()
    .regex(/^\d{7,8}$/, "ID number must be 7 or 8 digits")
    .or(z.literal("")),
  kraPin: z
    .string()
    .regex(/^[Aa]\d{9}[A-Za-z]$/, "KRA PIN format: A followed by 9 digits and a letter")
    .or(z.literal("")),
  payrollNumber: z
    .string()
    .min(1, "Payroll number is required")
    .or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-colors placeholder:text-gray-300 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";
const errorClass = "text-red-500 text-xs mt-1.5 flex items-center gap-1";

const ACCEPTED_DOC_TYPES = ["application/pdf"];
const MAX_DOC_SIZE_MB = 9;

// ---------------------------------------------------------------------------
// Document definitions
// ---------------------------------------------------------------------------

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
    description: "Upload a clear copy (front & back) of your national ID.",
  },
  {
    key: "kra_certificate",
    serverType: "kra_certificate",
    label: "KRA PIN Certificate",
    description: "Upload your KRA PIN certificate.",
  },
];

const IDEON_NAKAMA_DOC: DocDef = {
  key: "contract_document",
  serverType: "contract_document",
  label: "Contract Document",
  description: "Upload your original employment contract from your employer.",
};

function getRequiredDocs(applicantType: string): DocDef[] {
  const t = applicantType.toLowerCase();
  if (t === "ideon" || t === "nakama") {
    return [...BASE_DOCS, IDEON_NAKAMA_DOC];
  }
  return BASE_DOCS;
}

// ---------------------------------------------------------------------------
// DocumentRow – self-contained card for one document
// ---------------------------------------------------------------------------

function DocumentRow({
  doc,
  serverDoc,
  disabled,
  onFileSelect,
  selectedFile,
}: {
  doc: DocDef;
  serverDoc: ApplicantDoc | undefined;
  disabled: boolean;
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

  // Disabled state
  if (disabled) {
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 opacity-60">
        <div className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-400">
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-500">{doc.label}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{doc.description}</p>
          <p className="text-xs text-slate-400 mt-1 italic">
            Complete your personal information first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${isUploaded
        ? "border-emerald-200 bg-emerald-50/40"
        : selectedFile
          ? "border-blue-200 bg-blue-50/40"
          : "border-dashed border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50"
        }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isUploaded ? "bg-emerald-100 text-emerald-600" : selectedFile ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-600"
          }`}
      >
        {isUploaded ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <FileText className="h-5 w-5" />
        )}
      </div>

      {/* Info */}
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

      {/* Action */}
      {!isUploaded && (
        <div className="flex-shrink-0">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl text-xs font-semibold border-slate-200"
          >
            {selectedFile ? (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
                Change
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
                Select File
              </>
            )}
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HRProfilePage() {
  const { data: session, status, update } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const completion = useProfileCompletion();
  const loading = status === "loading";

  const userId = session?.user?.id ?? "";
  const getProfile = useHrProfileStore((s) => s.getProfile);
  const setProfile = useHrProfileStore((s) => s.setProfile);
  const serverProfile = getProfile(userId);

  const role = session?.user?.role;
  const companyLabel = role === "HR_IDEON" ? "Ideon Limited" : "Nakama";

  // ---------------------------------------------------------------------------
  // Fetch applicant details from backend → store
  // ---------------------------------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!userId) return;

    const [detailsResponse, docsResponse] = await Promise.all([
      applicantApi.getApplicantDetails(userId),
      applicantApi.getApplicantDocuments(userId),
    ]);

    const { data: detailsData } = detailsResponse;
    const { data: docsData } = docsResponse;

    if (detailsData?.applicant) {
      setProfile({
        userId,
        name: detailsData.applicant.name ?? "",
        email: detailsData.applicant.email ?? "",
        phoneNumber: detailsData.applicant.phone_number ?? "",
        idNumber: detailsData.applicant.id_number ?? null,
        kraPin: detailsData.applicant.kra_pin ?? null,
        payrollNumber: detailsData.applicant.payroll_number ?? null,
        applicantType: detailsData.applicant.applicant_type ?? "",
        docs: Array.isArray(docsData) ? docsData : [],
        fetchedAt: new Date().toISOString(),
      });
    }
  }, [userId, setProfile]);

  // Fetch on mount when session is ready
  useEffect(() => {
    if (userId) refreshProfile();
  }, [userId, refreshProfile]);

  // ---------------------------------------------------------------------------
  // Form
  // ---------------------------------------------------------------------------
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  // Hydrate form: prefer server data from store, fall back to session
  useEffect(() => {
    if (!session?.user) return;
    resetProfile({
      name: serverProfile?.name ?? session.user.name ?? "",
      email: serverProfile?.email ?? session.user.email ?? "",
      phone: serverProfile?.phoneNumber ?? session.user.phoneNumber ?? "",
      idNumber: serverProfile?.idNumber ?? session.user.idNumber ?? "",
      kraPin: serverProfile?.kraPin ?? session.user.kraPin ?? "",
      payrollNumber: serverProfile?.payrollNumber ?? session.user.payrollNumber ?? "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, serverProfile, editing]);

  // ---------------------------------------------------------------------------
  // Save personal info
  // ---------------------------------------------------------------------------
  const onSaveProfile = async (data: ProfileForm) => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await applicantApi.updateProfileFormData(userId, {
        name: data.name,
        email: data.email,
        phone_number: data.phone || undefined,
        id_number: data.idNumber || undefined,
        kra_pin: data.kraPin || undefined,
        payroll_number: data.payrollNumber || undefined,
      });

      if (error) {
        toast.error(error);
        return;
      }

      // Update session JWT
      await update({
        name: data.name,
        email: data.email,
        phoneNumber: data.phone,
        idNumber: data.idNumber,
        kraPin: data.kraPin,
        payrollNumber: data.payrollNumber,
      });

      // Re-fetch server profile to sync store
      await refreshProfile();

      toast.success("Personal info updated!");
      setEditing(false);
      window.location.reload();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------
  const applicantType = serverProfile?.applicantType ?? "";
  const requiredDocs = getRequiredDocs(applicantType);
  const serverDocs = serverProfile?.docs ?? [];
  const allDocsReady = requiredDocs.length > 0 && requiredDocs.every(doc => {
    const isUploaded = serverDocs.some(d => d.document_type === doc.serverType);
    return isUploaded || !!selectedFiles[doc.key];
  });
  const hasFilesToUpload = Object.keys(selectedFiles).length > 0;
  const showUploadButton = allDocsReady && hasFilesToUpload;

  const handleFileSelect = (key: string, file: File) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleUploadAll = async () => {
    if (!userId || uploadingDocs) return;
    setUploadingDocs(true);
    try {
      const fd = new FormData();
      Object.entries(selectedFiles).forEach(([key, file]) => {
        fd.append(key, file);
      });
      fd.append("name", serverProfile?.name || "");
      fd.append("email", serverProfile?.email || "");
      fd.append("phone_number", serverProfile?.phoneNumber || "");
      fd.append("kra_pin", serverProfile?.kraPin || "");
      fd.append("id_number", serverProfile?.idNumber || "");
      fd.append("payroll_number", serverProfile?.payrollNumber || "");

      const response = await apiCall(`/api/auth/applicant/update/${userId}`, {
        method: "PATCH",
        isFormData: true,
        formData: fd,
        requiresAuth: false,
        skipProxy: true,
      });

      if (response.error) {
        toast.error(response.error || "Upload failed. Please try again.");
        return;
      }

      toast.success("Documents uploaded successfully");
      setSelectedFiles({});
      await refreshProfile();
      window.location.reload();
    } catch (err) {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingDocs(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-6 w-full space-y-6">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const user = session?.user;
  const displayName = user?.name ?? "HR Manager";

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">
          View and update your personal information and documents.
        </p>
      </div>

      {/* Avatar + name */}
      <div className="bg-gradient-to-r from-emerald-900 to-emerald-700 rounded-xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-black select-none flex-shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-xl font-black text-white">{displayName}</p>
          <p className="text-emerald-200 text-sm mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-white/20 text-white font-bold px-2.5 py-1 rounded-full">
              HR Manager
            </span>
            <span className="text-xs bg-white/10 text-white font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {companyLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <ProfileProgressBar
        personalPercent={completion.personalDetailsPercent}
        documentsPercent={completion.documentsPercent}
        overallPercent={completion.overallPercent}
      />

      {/* Personal Information */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="text-base font-black text-slate-900">Personal Information</h2>
            {completion.personalDetailsComplete && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="rounded-xl border-slate-200 text-sm font-semibold"
            >
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                resetProfile();
              }}
              className="rounded-xl border-slate-200 text-sm font-semibold text-slate-500"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>

        <div className="p-6">
          {editing ? (
            <form
              onSubmit={handleProfileSubmit(onSaveProfile)}
              className="space-y-5"
              noValidate
            >
              <div>
                <label className={labelClass}>Full Name</label>
                <input {...registerProfile("name")} type="text" className={inputClass} />
                {profileErrors.name && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {profileErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  {...registerProfile("email")}
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                />
                {profileErrors.email && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {profileErrors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    {...registerProfile("phone")}
                    type="tel"
                    placeholder="0712345678"
                    className={inputClass}
                  />
                  {profileErrors.phone && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>National ID Number</label>
                  <input
                    {...registerProfile("idNumber")}
                    type="text"
                    placeholder="12345678"
                    className={inputClass}
                  />
                  {profileErrors.idNumber && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.idNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>KRA PIN</label>
                  <input
                    {...registerProfile("kraPin")}
                    type="text"
                    placeholder="A123456789Z"
                    className={inputClass}
                  />
                  {profileErrors.kraPin && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.kraPin.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Payroll Number</label>
                  <input
                    {...registerProfile("payrollNumber")}
                    type="text"
                    placeholder="e.g. EMP-0001"
                    className={inputClass}
                  />
                  {profileErrors.payrollNumber && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {profileErrors.payrollNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Full Name", value: serverProfile?.name ?? user?.name },
                { label: "Email Address", value: serverProfile?.email ?? user?.email },
                { label: "Phone Number", value: serverProfile?.phoneNumber ?? user?.phoneNumber ?? "Not set" },
                {
                  label: "National ID Number",
                  value: serverProfile?.idNumber ?? user?.idNumber ?? "Not set",
                },
                {
                  label: "KRA PIN",
                  value: serverProfile?.kraPin ?? user?.kraPin ?? "Not set",
                },
                {
                  label: "Payroll Number",
                  value: serverProfile?.payrollNumber ?? user?.payrollNumber ?? "Not set",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      value === "Not set" ? "text-gray-300" : "text-slate-800"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <h2 className="text-base font-black text-slate-900">Documents</h2>
          {completion.documentsComplete && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {serverDocs.length} / {requiredDocs.length} uploaded
          </span>
        </div>

        <div className="p-6 space-y-3">
          {!completion.personalDetailsComplete && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-2">
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>Save your personal information above to unlock document uploads.</span>
            </div>
          )}

          {/* Show loading placeholder if we don't have applicant type yet */}
          {!serverProfile && userId ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleUploadAll(); }}>
              <div className="flex flex-col gap-3">
                {requiredDocs.map((doc) => {
                  const serverDoc = serverDocs.find((d) => d.document_type === doc.serverType);
                  return (
                    <DocumentRow
                      key={doc.key}
                      doc={doc}
                      serverDoc={serverDoc}
                      disabled={!completion.personalDetailsComplete}
                      onFileSelect={handleFileSelect}
                      selectedFile={selectedFiles[doc.key]}
                    />
                  );
                })}
              </div>
              {showUploadButton && (
                <div className="mt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={uploadingDocs}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingDocs ? "Uploading..." : "Upload all documents"}
                  </Button>
                </div>
              )}
            </form>
          )}

          {/* Summary */}
          {serverProfile && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {requiredDocs.map((doc) => {
                  const uploaded = serverDocs.some(
                    (d) => d.document_type === doc.serverType
                  );
                  return (
                    <span
                      key={doc.key}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        uploaded
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {uploaded ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {doc.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <ChangePasswordSection />
    </div>
  );
}
