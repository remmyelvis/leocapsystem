import { apiCall } from "./apiClient";

export interface CreateApplicationPayload {
  employment_type: string;        // "employed" | "self_employed"
  company: string;                // "nakama" | "ideon" | "personal" (the backend uses the applicant's own company)
  employer_name?: string;         // who the applicant works for
  employment_nature: string;
  payroll_number: string;
  designation: string;
  month_one: string;              // API expects strings
  month_two: string;
  month_three: string;
  loan_type: string;              // "salary_advance" | "personal"
  amount_applied: string;
  processing_fees: string;
  legal_fees: string;
  access_fees?: string;           // Optional - for salary advance
  interest_rate: string;
  disbursement_amount: string;
  total_repayment_amount: string; // Backend uses total_repayment_amount
  is_first_time_applicant: string;
  loan_purpose: string;
  mpesa_statement_passcode?: string;
  bank_statement_passcode?: string;
  payslip_passcode?: string;
}

export interface ApplicationResponse {
  id: string;
  applicant_id: string;
  employment_type: string;
  company: string;
  loan_type: string;
  amount_applied: number;
  processing_fees: number;
  legal_fees: number;
  access_fees: number;
  disbursement_amount: number;
  total_repayment_amount: number;
  loan_status: string;
  month_one: number;
  month_two: number;
  month_three: number;
  created_at: string;
  updated_at: string;
}

export interface GetAllApplicationItem {
  application: ApplicationResponse;
  bio_data: {
    full_name: string;
    email: string;
    phone_number: string;
    id_number: string;
  };
}

export interface CreateApplicationResponse {
  message: string;
  id?: string;
  application: {
    id: string;
    applicant_id: string;
    company: string;
    loan_type: string;
    loan_status: string;
    amount_applied: string;
    processing_fees: string;
    legal_fees: string;
    disbursement_amount: string;
    total_repayment_amount: string;
    month_one: string;
    month_two: string;
    month_three: string;
    created_at: string;
  };
}

export const applicationApi = {
  create: (payload: CreateApplicationPayload, files?: { bankStatement?: File | null; mpesaStatement?: File | null; payslip?: File | null; contractDocument?: File | null }) => {
    // Backend requires multipart/form-data, not JSON
    const formData = new FormData();

    // Append all text fields
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Append optional document files
    if (files?.bankStatement) formData.append("bank_statement", files.bankStatement);
    if (files?.mpesaStatement) formData.append("mpesa_statement", files.mpesaStatement);
    if (files?.payslip) formData.append("payslip", files.payslip);
    if (files?.contractDocument) formData.append("contract_document", files.contractDocument);
    
    return apiCall<CreateApplicationResponse>("/api/applications", {
      method: "POST",
      isFormData: true,
      formData,
    });
  },

  getAll: () =>
    apiCall<GetAllApplicationItem[]>("/api/applications/get-all"),

  getHrAll: () =>
    apiCall<GetAllApplicationItem[]>("/api/applications/get-hr-all"),

  financeAmend: (id: string, payload: { amount_applied: string }) =>
    apiCall(`/api/applications/finance/amend/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  getOne: (id: string) =>
    apiCall<ApplicationResponse>(`/api/applications/get-one/${id}`),

  update: (id: string, payload: Partial<CreateApplicationPayload>) =>
    apiCall<ApplicationResponse>(`/api/applications/update/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  /**
   * Confirm the interest rate set by admin (changes status to rate_confirmed)
   * Uses dedicated endpoint: PATCH /api/applications/rate-confirmed/:id
   */
  confirmRate: async (id: string) => {
    console.log("[ConfirmRate] Calling PATCH /api/applications/rate-confirmed/" + id);
    const response = await apiCall<{ message: string; application?: Record<string, unknown> }>(`/api/applications/rate-confirmed/${id}`, {
      method: "PATCH",
    });
    console.log("[ConfirmRate] Response:", response);
    return response;
  },

  /**
   * Decline/reject the interest rate set by admin (changes status to rate_declined)
   * Uses dedicated endpoint: PATCH /api/applications/rate-declined/:id
   */
  declineRate: async (id: string) => {
    console.log("[DeclineRate] Calling PATCH /api/applications/rate-declined/" + id);
    const response = await apiCall<{ message: string; application?: Record<string, unknown> }>(`/api/applications/rate-declined/${id}`, {
      method: "PATCH",
    });
    console.log("[DeclineRate] Response:", response);
    return response;
  },

  uploadDocument: (applicationId: string, file: File) => {
    const formData = new FormData();
    formData.append("application_id", applicationId);
    formData.append("file", file);
    return apiCall(`/api/application/documents/${applicationId}`, {
      method: "POST",
      isFormData: true,
      formData,
    });
  },

  getDocuments: (applicationId: string) =>
    apiCall(`/api/application/documents/get-by-application/${applicationId}`),

  downloadDocument: (docId: string) =>
    apiCall(`/api/application/documents/download/${docId}`),
};

export interface ReportFilters {
  company?: string;
  employment_type?: string;
  loan_status?: string;
  repayment_status?: string;
  hr_status?: string;
  created_at?: string;
  page?: number;
  page_size?: number;
}

export interface ReportApplication {
  id: string;
  applicant_id: string;
  company: string;
  employment_type: string;
  loan_type: string;
  loan_status: string;
  amount_applied: number;
  processing_fees: number;
  disbursement_amount: number;
  total_repayment_amount: number;
  created_at: string;
  updated_at: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
}

export interface ReportResponse {
  applications: ReportApplication[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export const reportsApi = {
  getApplicationsReport: (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.company) params.append("company", filters.company);
    if (filters.employment_type) params.append("employment_type", filters.employment_type);
    if (filters.loan_status) params.append("loan_status", filters.loan_status);
    if (filters.repayment_status) params.append("repayment_status", filters.repayment_status);
    if (filters.hr_status) params.append("hr_status", filters.hr_status);
    if (filters.created_at) params.append("created_at", filters.created_at);
    params.append("page", String(filters.page ?? 1));
    params.append("page_size", String(filters.page_size ?? 10));

    return apiCall<ReportResponse>(
      `/api/reports/applications/get-all/?${params.toString()}`,
      { method: "GET" }
    );
  },

  getDisbursedIdeon: () =>
    apiCall<ReportApplication[]>(
      `/api/reports/applications/get-all/disbursed/ideon`,
      { method: "GET" }
    ),

  getDisbursedNakama: () =>
    apiCall<ReportApplication[]>(
      `/api/reports/applications/get-all/disbursed/nakama`,
      { method: "GET" }
    ),
};
