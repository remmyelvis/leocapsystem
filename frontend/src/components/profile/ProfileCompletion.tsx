

/**
 * Shared profile-completion UI components used across all loan-applicant
 * portals (Applicant, HR, Finance).
 */

import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Lock,
  Trash2,
  Upload,
  User,
  UserCircle,
} from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useDocumentStore } from "@/store/documentStore";
import { apiCall } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_DOC_TYPES = ["application/pdf"];
const MAX_DOC_SIZE_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Progress bar color helper
// ---------------------------------------------------------------------------

function barColor(percent: number): string {
  if (percent === 100) return "bg-emerald-500";
  if (percent >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function textColor(percent: number): string {
  if (percent === 100) return "text-emerald-600";
  if (percent >= 50) return "text-amber-500";
  return "text-red-500";
}

// ---------------------------------------------------------------------------
// ProfileProgressBar
// ---------------------------------------------------------------------------

export function ProfileProgressBar({
  personalPercent,
  documentsPercent,
  overallPercent,
}: {
  personalPercent: number;
  documentsPercent: number;
  overallPercent: number;
}) {
  const isComplete = overallPercent === 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-900">Profile Completion</h2>
          <p className={`text-xs mt-0.5 font-medium ${isComplete ? "text-emerald-600" : "text-gray-400"}`}>
            {isComplete
              ? "Profile complete ✅ You can apply for loans"
              : "Complete your profile to apply for loans"}
          </p>
        </div>
        <span className={`text-2xl font-black ${textColor(overallPercent)}`}>
          {overallPercent}%
        </span>
      </div>

      {/* Overall bar */}
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(overallPercent)}`}
          style={{ width: `${overallPercent}%` }}
        />
      </div>

      {/* Two halves */}
      <div className="grid grid-cols-2 gap-4">
        {/* Personal details */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <User className="h-3 w-3" />
              Personal Details
            </span>
            <span className={`text-xs font-bold ${personalPercent === 100 ? "text-emerald-600" : "text-gray-400"}`}>
              {personalPercent === 100 ? (
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </span>
              ) : (
                `${Math.round(personalPercent / 2)}% of 50%`
              )}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(personalPercent)}`}
              style={{ width: `${personalPercent}%` }}
            />
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Documents
            </span>
            <span className={`text-xs font-bold ${documentsPercent === 100 ? "text-emerald-600" : "text-gray-400"}`}>
              {documentsPercent === 100 ? (
                <span className="flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Done
                </span>
              ) : (
                `${Math.round(documentsPercent / 2)}% of 50%`
              )}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(documentsPercent)}`}
              style={{ width: `${documentsPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentUploadCard
// ---------------------------------------------------------------------------

export function DocumentUploadCard({
  docKey,
  label,
  description,
  userId,
  disabled = false,
}: {
  docKey: string;
  label: string;
  description?: string;
  userId: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const addDocument = useDocumentStore((s) => s.addDocument);
  const removeDocument = useDocumentStore((s) => s.removeDocument);
  const documents = useDocumentStore((s) => s.documents);

  const existing = documents.find((d) => d.key === docKey);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setUploading(true);
      try {
        const fd = new FormData();
        fd.append(docKey, file);

        const { error } = await apiCall(`/api/auth/applicant/update/${userId}`, {
          method: "PATCH",
          isFormData: true,
          formData: fd,
          skipProxy: true,
        });

        if (error) {
          toast.error(error || "Upload failed. Please try again.");
          return;
        }

        addDocument({
          key: docKey,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
        toast.success(`${label} uploaded successfully`);
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [docKey, label, userId, addDocument]
  );

  const handleRemove = () => {
    removeDocument(docKey);
    toast.success(`${label} removed`);
  };

  // ── Disabled (personal info incomplete) ──────────────────────────────────
  if (disabled) {
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 opacity-60">
        <div className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400">
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-500">{label}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1 italic">
            Complete your personal information first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
        existing
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-gray-200 border-dashed border-2 bg-gray-50/50 hover:bg-gray-50"
      }`}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          existing ? "bg-emerald-100 text-emerald-600" : "bg-blue-50 text-blue-600"
        }`}
      >
        {existing ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <FileText className="h-5 w-5" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800">{label}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
        {existing ? (
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {existing.fileName} &middot; {formatBytes(existing.fileSize)}
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-1">PDF only · max {MAX_DOC_SIZE_MB} MB</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {existing ? (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50"
            >
              Replace
            </button>
            <button
              onClick={handleRemove}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              aria-label="Remove document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-gray-200 text-xs font-semibold"
          >
            {uploading ? (
              <>
                <span className="mr-1.5 h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
                Upload
              </>
            )}
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

// Keep old name as alias for backward compat
export const DocumentUploadRow = DocumentUploadCard;

// ---------------------------------------------------------------------------
// DocumentsSection
// ---------------------------------------------------------------------------

export function DocumentsSection({
  checkIconColor = "text-emerald-500",
  userId = "",
  personalInfoComplete = false,
}: {
  checkIconColor?: string;
  userId?: string;
  personalInfoComplete?: boolean;
}) {
  const completion = useProfileCompletion();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <h2 className="text-base font-black text-gray-900">Documents</h2>
        {completion.documentsComplete && (
          <CheckCircle2 className={`h-4 w-4 ${checkIconColor}`} />
        )}
      </div>

      <div className="p-6 space-y-3">
        {!personalInfoComplete && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-4">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span>Save your personal information above to unlock document uploads.</span>
          </div>
        )}

        {completion.requiredDocuments.map((doc) => (
          <DocumentUploadCard
            key={doc.key}
            docKey={doc.key}
            label={doc.label}
            description={doc.description}
            userId={userId}
            disabled={!personalInfoComplete}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfileIncompleteBanner  (for dashboards)
// ---------------------------------------------------------------------------

export function ProfileIncompleteBanner({
  profileHref,
}: {
  profileHref: string;
}) {
  const completion = useProfileCompletion();

  if (completion.isComplete) return null;

  // Build a checklist of what's missing
  const missingItems: string[] = [];
  if (!completion.checks.hasIdNumber) missingItems.push("National ID number");
  if (!completion.checks.hasKraPin) missingItems.push("KRA PIN");
  completion.requiredDocuments.forEach((doc) => {
    if (!completion.uploadedDocumentTypes.includes(doc.key)) {
      missingItems.push(doc.label);
    }
  });

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
      <UserCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">
          Complete your profile before applying for a loan
        </p>

        {/* Progress bar */}
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${completion.overallPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-amber-700 whitespace-nowrap">
            {completion.overallPercent}%
          </span>
        </div>

        {/* Sub-bars */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {/* Personal details */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <User className="h-3 w-3" /> Personal
              </span>
              <span className="text-xs font-bold text-amber-700">
                {completion.personalDetailsPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completion.personalDetailsPercent === 100
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${completion.personalDetailsPercent}%` }}
              />
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Documents
              </span>
              <span className="text-xs font-bold text-amber-700">
                {completion.documentsPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completion.documentsPercent === 100
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
                style={{ width: `${completion.documentsPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist of missing items */}
        {missingItems.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missingItems.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link to={profileHref}
        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
      >
        Complete Profile
      </Link>
    </div>
  );
}


// ---------------------------------------------------------------------------
// ProfileApplyGate  (full-page block shown on apply pages)
// ---------------------------------------------------------------------------

export function ProfileApplyGate({
  profileHref,
}: {
  profileHref: string;
}) {
  const completion = useProfileCompletion();

  return (
    <div className="p-6 w-full max-w-lg mx-auto mt-10 space-y-6">
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-amber-100 flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-black text-gray-900">
            Complete Your Profile First
          </h2>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            You need to complete your profile before you can apply for a loan.
            Please fill in your personal details and upload all required
            documents.
          </p>

          {/* Progress */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Personal Details</span>
                <span className="text-xs font-bold text-gray-500">
                  {completion.personalDetailsPercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(completion.personalDetailsPercent)}`}
                  style={{ width: `${completion.personalDetailsPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Documents</span>
                <span className="text-xs font-bold text-gray-500">
                  {completion.documentsPercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(completion.documentsPercent)}`}
                  style={{ width: `${completion.documentsPercent}%` }}
                />
              </div>
            </div>
          </div>

          <Link to={profileHref}>
            <Button className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl">
              Go to My Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
