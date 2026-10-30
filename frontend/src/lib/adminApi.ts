// Admin-facing API calls (uses /api/auth/* endpoints for User/Admin management)
import { apiCall, SIGN_IN_TIMEOUT_MS } from "./apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterAdminPayload {
  name: string;
  email: string;
  number: string; // phone number
  password: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  number: string;
  role: string;
  created_at?: string;
}

export interface AdminLoginResponse {
  access_token: string;
  user: AdminUser;
  message: string;
}

export interface AdminRegisterResponse {
  message: string;
  user: AdminUser;
}

// Application response types for admin view
export interface ApplicationBioData {
  full_name: string;
  email: string;
  phone_number: string;
  id_number: string;
  applicant_type?: string;
}

export interface ApplicationDocument {
  id: string;
  document_passcode?: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
}

export interface ApplicationDetails {
  date_submitted: string;
  designation: string;
  employment_nature: string;
  employer_name?: string | null;
  month_one: string;
  month_two: string;
  month_three: string;
  payroll_number: string;
  // Extended fields from full application
  id?: string;
  applicant_id?: string;
  employment_type?: string;
  company?: string;
  loan_type?: string;
  amount_applied?: string;
  processing_fees?: string;
  legal_fees?: string;
  access_fees?: string;
  interest_rate?: string;
  disbursement_amount?: string;
  repayment_amount?: string;
  loan_status?: string;
  repayment_status?: string;
  outstanding_balance?: string;
  balance_owed?: number | string; // what is owed right now (the loan page only)
  /** The borrower's OTHER loans that are part paid, late or in default (the loan page, admins only). */
  /** What the borrower accepted when applying (null for an application made before acceptances were recorded). Admins only. */
  agreement?: AgreementSummary | null;
  owing_elsewhere?: { id: string; balance_owed: number; repayment_status: string; due_date: string | null }[];
  disbursed_at?: string | null; // when the loan was disbursed; null for loans that were disbursed before this was recorded
  disbursed_at_source?: "entered" | "history" | null; // a date typed in by an admin, or the one the loan's change history has
  created_at?: string;
  documents?: ApplicationDocument[];
}

export interface AgreementSummary {
  reference: string;
  key: string;
  version: number;
  title: string | null;
  accepted_at: string;
  ip_address: string | null;
  device: string | null;
  /** The record still matches its seal. */
  verified: boolean;
}

export interface AdminApplicationItem {
  application: ApplicationDetails;
  bio_data: ApplicationBioData;
}

export interface SingleApplicationResponse {
  application: ApplicationDetails;
  bio_data: ApplicationBioData;
}

// ---------------------------------------------------------------------------
// Super Admin Configuration
// ---------------------------------------------------------------------------

export const SUPER_ADMIN_EMAIL = "admin@leocapinvest.co.ke";

export function isSuperAdmin(email: string | undefined | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

// ---------------------------------------------------------------------------
// Admin Auth API
// ---------------------------------------------------------------------------

export const adminApi = {
  /**
   * Register a new admin user.
   * Only accessible by logged-in admins.
   */
  register: (payload: RegisterAdminPayload) =>
    apiCall<AdminRegisterResponse>("/api/auth/users/register", {
      method: "POST",
      body: {
        name: payload.name,
        email: payload.email,
        number: payload.number,
        password: payload.password,
        role: "admin",
      },
      requiresAuth: false,
    }),

  login: (email: string, password: string) =>
    apiCall<AdminLoginResponse>("/api/auth/users/login", {
      method: "POST",
      body: { email, password },
      requiresAuth: false,
      timeoutMs: SIGN_IN_TIMEOUT_MS,
    }),

  updateProfile: (id: string, payload: Partial<Omit<RegisterAdminPayload, "password">>) =>
    apiCall<AdminUser>(`/api/auth/users/update/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  listAdmins: () => apiCall<{ users: AdminUser[] }>("/api/auth/users/get-all"),

  deleteAdmin: (id: string) =>
    apiCall<{ message: string }>(`/api/auth/users/delete/${id}`, {
      method: "DELETE",
    }),
};

// ---------------------------------------------------------------------------
// Admin Applications API (for viewing loan applications)
// ---------------------------------------------------------------------------

export const adminApplicationsApi = {
  /**
   * Get all loan applications.
   * Returns array of { application, bio_data } objects.
   */
  getAll: () =>
    apiCall<AdminApplicationItem[]>("/api/applications/get-all"),

  /**
   * Get a single application by ID.
   */
  getOne: (applicationId: string) =>
    apiCall<SingleApplicationResponse>(`/api/applications/get-one/${applicationId}`),

  /**
   * Amend/update application (For HR and Admin).
   * This is the correct endpoint for admins to update applications.
   */
  amendApplication: (applicationId: string, updates: Record<string, string>) =>
    apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/amend/${applicationId}`, {
      method: "PATCH",
      body: updates,
    }),

  /**
   * Approve an application.
   */
  approve: (applicationId: string) =>
    apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/approve/${applicationId}`, {
      method: "PATCH",
    }),

  /**
   * Reject an application.
   */
  reject: (applicationId: string, message?: string) =>
    apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/reject/${applicationId}`, {
      method: "PATCH",
      body: message ? { message } : undefined,
    }),

  /**
   * Mark application as disbursed.
   */
  disburse: (applicationId: string) =>
    apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/disbursed/${applicationId}`, {
      method: "PATCH",
    }),

  /**
   * Update application status (legacy - use specific endpoints above instead).
   */
  updateStatus: (applicationId: string, status: string, message?: string) => {
    // Map status to the correct endpoint
    if (status.toLowerCase() === "approved") {
      return adminApplicationsApi.approve(applicationId);
    } else if (status.toLowerCase() === "declined" || status.toLowerCase() === "rejected") {
      return adminApplicationsApi.reject(applicationId, message);
    } else if (status.toLowerCase() === "disbursed") {
      return adminApplicationsApi.disburse(applicationId);
    }
    // Fallback to amend endpoint
    return adminApplicationsApi.amendApplication(applicationId, { loan_status: status });
  },

  /**
   * Set interest rate for a personal loan application using amend endpoint.
   * Also updates loan_status to "rate_set" so applicant can review.
   * Sends calculated breakdown values since backend doesn't store interest_rate.
   */
  setInterestRate: (applicationId: string, interestRate: number, loanAmount: number) => {
    // Calculate breakdown values based on the rate
    const processingFeeRate = 0.03; // 3%
    const legalFees = 1000; // Fixed KES 1000

    const processingFees = loanAmount * processingFeeRate;
    const disbursementAmount = loanAmount - processingFees - legalFees;
    const interestAmount = loanAmount * interestRate;
    const totalRepayment = loanAmount + interestAmount;

    return apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/amend/${applicationId}`, {
      method: "PATCH",
      body: {
        interest_rate: interestRate.toString(),
        loan_status: "rate_set",
        // Send calculated values that the backend will persist
        processing_fees: processingFees.toFixed(2),
        legal_fees: legalFees.toString(),
        disbursement_amount: disbursementAmount.toFixed(2),
        repayment_amount: totalRepayment.toFixed(2),
      },
    });
  },

  /**
   * Set all loan terms (amount, fees, rate) for a loan application.
   * Allows admin to edit all editable fields before notifying applicant.
   * Interest rate should be passed as DECIMAL (e.g., 0.10 for 10%)
   */
  setLoanTerms: (applicationId: string, terms: {
    loanAmount: number;
    interestRate: number;  // Decimal format: 0.10 = 10%
    processingFees: number;
    legalFees: number;
    accessFees?: number;
    disbursementAmount: number;
    repaymentAmount: number;
  }) => {
    const body = {
      amount_applied: terms.loanAmount.toString(),
      interest_rate: terms.interestRate.toString(),  // Send as decimal (0.10 for 10%)
      processing_fees: terms.processingFees.toFixed(2),
      legal_fees: terms.legalFees.toString(),
      access_fees: terms.accessFees?.toFixed(2) || "0",
      disbursement_amount: terms.disbursementAmount.toFixed(2),
      total_repayment_amount: terms.repaymentAmount.toFixed(2),
      loan_status: "rate_set",
    };


    return apiCall<{ message: string; application?: ApplicationDetails }>(`/api/applications/amend/${applicationId}`, {
      method: "PATCH",
      body,
    });
  },
};

// ---------------------------------------------------------------------------
// Applicants API
// ---------------------------------------------------------------------------

export interface ManageApplicant {
  id: string;
  applicant_type: string;
  created_at: string;
  email: string;
  id_number: string;
  interest_rate: number | null;
  kra_pin: string;
  loan_limit: number | null;
  name: string;
  phone_number: string;
  role: string;
  applicant_status?: string;
}

export interface ApplicantDetailsResponse {
  applicant: ManageApplicant;
  docs: {
    id: string;
    applicant_id: string;
    document_type: string;
    filename: string;
    filetype: string;
    uploaded_at: string;
    document_passcode?: string | null;
    status?: string; // "pending" until reviewed, then "accepted" (a rejected document is deleted)
    admin_comment?: string | null;
  }[];
  message: string;
}

export const adminApplicantsApi = {
  getAll: () =>
    apiCall<{ applicants: ManageApplicant[] }>("/api/auth/applicant/get-all-applicants"),

  getOne: (applicantId: string) =>
    apiCall<ApplicantDetailsResponse>(`/api/auth/applicant/get-applicant-details/${applicantId}`),

  suspend: (applicantId: string) =>
    apiCall<{ message: string }>(`/api/auth/applicant/suspend/${applicantId}`, {
      method: "PATCH",
    }),

  activate: (applicantId: string) =>
    apiCall<{ message: string }>(`/api/auth/applicant/activate/${applicantId}`, {
      method: "PATCH",
    }),
};
