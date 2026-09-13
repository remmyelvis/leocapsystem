

/**
 * useProfileCompletion
 *
 * Computes profile completion state from:
 *  1. Session data (name, email, phone)
 *  2. Server-fetched applicant details (id_number, kra_pin) via applicantProfileStore
 *  3. Server-fetched documents list via applicantProfileStore
 *
 * Personal details   → 50 %
 * Documents          → 50 %
 *
 * Documents required for EVERYONE:
 *   • id_copy
 *   • kra_certificate
 *
 * Additional document required for Ideon / Nakama users:
 *   • contract_document
 */

import { useMemo } from "react";
import { useSession } from "@/contexts/AuthContext";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { useHrProfileStore } from "@/store/hrProfileStore";
import { useFinanceProfileStore } from "@/store/financeProfileStore";
import type { UserRole } from "@/types/user";

// --------------- types -------------------------------------------------------

export interface DocumentMeta {
  /** machine key matching document_type from the API */
  key: DocumentKey;
  /** human-readable label */
  label: string;
  /** optional description shown below the label */
  description?: string;
  required: boolean;
}

export type DocumentKey =
  | "kra_certificate"
  | "id_copy"
  | "contract_document";

export interface ProfileCompletion {
  /** 0-100 */
  personalDetailsPercent: number;
  /** 0-100 */
  documentsPercent: number;
  /** overall 0-100 (each half contributes max 50) */
  overallPercent: number;
  /** true when both sections are 100 % */
  isComplete: boolean;
  /** whether every required personal detail field is filled */
  personalDetailsComplete: boolean;
  /** whether every required document has been uploaded */
  documentsComplete: boolean;
  /** the list of documents required for this user */
  requiredDocuments: DocumentMeta[];
  /** document_type strings uploaded on the server */
  uploadedDocumentTypes: string[];
  /** individual field checks */
  checks: {
    hasName: boolean;
    hasEmail: boolean;
    hasPhone: boolean;
    hasIdNumber: boolean;
    hasKraPin: boolean;
    hasPayrollNumber?: boolean;
  };
}

// --------------- helpers -----------------------------------------------------

function deriveCompany(company?: string, role?: UserRole): string | undefined {
  if (company) return company;
  if (role === "HR_IDEON" || role === "FINANCE_IDEON") return "ideon";
  if (role === "HR_NAKAMA" || role === "FINANCE_NAKAMA") return "nakama";
  return undefined;
}

function isIdeonOrNakama(applicantType?: string | null, company?: string): boolean {
  const t = (applicantType ?? company ?? "").toLowerCase();
  return t !== "personal" && t !== "";
}

// --------------- hook --------------------------------------------------------

export function useProfileCompletion(): ProfileCompletion {
  const { data: session } = useSession();
  
  const getApplicantProfile = useApplicantProfileStore((s) => s.getProfile);
  const getHrProfile = useHrProfileStore((s) => s.getProfile);
  const getFinanceProfile = useFinanceProfileStore((s) => s.getProfile);

  return useMemo(() => {
    const user = session?.user;
    const userId = user?.id ?? "";
    const role = user?.role;

    let getProfile: any = getApplicantProfile;
    if (role === "HR_IDEON" || role === "HR_NAKAMA") {
      getProfile = getHrProfile;
    } else if (role === "FINANCE_IDEON" || role === "FINANCE_NAKAMA") {
      getProfile = getFinanceProfile;
    }

    // Pull server-fetched data from the store (populated on dashboard load)
    const serverProfile = getProfile(userId);

    const name = serverProfile?.name ?? user?.name;
    const email = serverProfile?.email ?? user?.email;
    const phone = serverProfile?.phoneNumber ?? user?.phoneNumber;
    const idNumber = serverProfile?.idNumber ?? user?.idNumber;
    const kraPin = serverProfile?.kraPin ?? user?.kraPin;
    const payrollNumber = serverProfile?.payrollNumber ?? user?.payrollNumber;

    const company = deriveCompany(user?.company, user?.role as UserRole | undefined);
    const applicantType = serverProfile?.applicantType;

    // ── 1. Personal details ──────────────────────────────────────────────────
    const checks: {
      hasName: boolean;
      hasEmail: boolean;
      hasPhone: boolean;
      hasIdNumber: boolean;
      hasKraPin: boolean;
      hasPayrollNumber?: boolean;
    } = {
      hasName: Boolean(name),
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      hasIdNumber: Boolean(idNumber),
      hasKraPin: Boolean(kraPin),
    };

    if (isIdeonOrNakama(applicantType, company)) {
      checks.hasPayrollNumber = Boolean(payrollNumber);
    }

    const filledCount = Object.values(checks).filter(Boolean).length;
    const totalPersonalFields = Object.keys(checks).length;
    const personalDetailsPercent = Math.round((filledCount / totalPersonalFields) * 100);
    const personalDetailsComplete = filledCount === totalPersonalFields;

    // ── 2. Documents ─────────────────────────────────────────────────────────
    const requiredDocuments: DocumentMeta[] = [
      {
        key: "id_copy",
        label: "National ID Copy",
        description: "Upload a clear copy (front & back) of your national ID.",
        required: true,
      },
      {
        key: "kra_certificate",
        label: "KRA PIN Certificate",
        description: "Upload your KRA PIN certificate.",
        required: true,
      },
    ];

    if (isIdeonOrNakama(applicantType, company)) {
      requiredDocuments.push({
        key: "contract_document",
        label: "Contract Document",
        description: "Upload your original employment contract from your employer.",
        required: true,
      });
    }

    // Map server docs to their document_type strings
    const uploadedDocumentTypes = (serverProfile?.docs ?? []).map((d) => d.document_type);

    const uploadedRequired = requiredDocuments.filter((d) =>
      uploadedDocumentTypes.includes(d.key)
    );
    const documentsPercent = Math.round(
      (uploadedRequired.length / requiredDocuments.length) * 100
    );
    const documentsComplete = uploadedRequired.length === requiredDocuments.length;

    // ── 3. Overall ───────────────────────────────────────────────────────────
    const overallPercent =
      Math.round(personalDetailsPercent / 2) +
      Math.round(documentsPercent / 2);
    const isComplete = personalDetailsComplete && documentsComplete;

    return {
      personalDetailsPercent,
      documentsPercent,
      overallPercent,
      isComplete,
      personalDetailsComplete,
      documentsComplete,
      requiredDocuments,
      uploadedDocumentTypes,
      checks,
    };
  }, [session, getApplicantProfile, getHrProfile, getFinanceProfile]);
}
