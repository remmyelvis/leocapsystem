// All applicant-facing API calls in one place
import { apiCall } from "./apiClient";

export interface UpdateApplicantPayload {
  name?: string;
  email?: string;
  phone_number?: string;
  id_number?: string;
  kra_pin?: string;
  payroll_number?: string;
}

export interface RegisterApplicantPayload {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  applicant_type: string; // "ideon" | "nakama" | "personal"
  role?: string; // defaults to "applicant"; pass "hr" or "finance" for staff
}

export interface ApplicantUser {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  id_number: string | null;
  kra_pin: string | null;
  payroll_number?: string | null;
  role: string;
  applicant_type?: string;
  loan_limit?: number | null;
  interest_rate?: number | null;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  applicant: ApplicantUser;
  message: string;
}

export interface RegisterResponse {
  message: string;
  applicant: ApplicantUser;
}

export interface ApplicantDoc {
  id: string;
  applicant_id: string;
  document_type: string;
  filename: string;
  filetype: string;
  uploaded_at: string;
}

export interface ApplicantDetailsResponse {
  message: string;
  applicant: ApplicantUser;
  docs: ApplicantDoc[];
}

// Auth
export const applicantApi = {
  getApplicantDetails: (userId: string) =>
    apiCall<ApplicantDetailsResponse>(
      `/api/auth/applicant/get-applicant-details/${userId}`
    ),


  register: (payload: RegisterApplicantPayload) =>
    apiCall<RegisterResponse>("/api/auth/applicant/register", {
      method: "POST",
      body: {
        name: payload.name,
        email: payload.email,
        phone_number: payload.phone_number,
        password: payload.password,
        applicant_type: payload.applicant_type,
        role: payload.role ?? "applicant",
      },
      requiresAuth: false,
    }),

  login: (email: string, password: string) =>
    apiCall<LoginResponse>("/api/auth/applicant/login", {
      method: "POST",
      body: { email, password },
      requiresAuth: false,
    }),

  getProfile: (id: string) =>
    apiCall<ApplicantUser>(`/api/auth/applicant/update/${id}`, {
      method: "GET",
      skipProxy: true,
    }),

  updateProfile: (id: string, payload: Partial<RegisterApplicantPayload>) =>
    apiCall<ApplicantUser>(`/api/auth/applicant/update/${id}`, {
      method: "PATCH",
      body: payload,
      skipProxy: true,
    }),

  updateProfileFormData: (id: string, payload: UpdateApplicantPayload) => {
    const fd = new FormData();
    if (payload.name) fd.append("name", payload.name);
    if (payload.email) fd.append("email", payload.email);
    if (payload.phone_number) fd.append("phone_number", payload.phone_number);
    if (payload.id_number) fd.append("id_number", payload.id_number);
    if (payload.kra_pin) fd.append("kra_pin", payload.kra_pin);
    if (payload.payroll_number) fd.append("payroll_number", payload.payroll_number);
    return apiCall<ApplicantUser>(`/api/auth/applicant/update/${id}`, {
      method: "PATCH",
      isFormData: true,
      formData: fd,
      skipProxy: true,
    });
  },

  deleteApplicant: (id: string) =>
    apiCall<{ message: string }>(`/api/auth/applicant/delete/${id}`, {
      method: "DELETE",
    }),

  getApplicantDocuments: (applicantId: string) =>
    apiCall<ApplicantDoc[]>(
      `/api/applicant/documents/get-by-applicant/${applicantId}`,
      { method: "GET" }
    ),

  getStaffByRole: (role: "hr" | "finance") =>
    apiCall<{ applicants: ApplicantUser[] }>(
      `/api/auth/applicant/get-by-role/${role}`,
      { method: "GET" }
    ),

  forgotPassword: (email: string) =>
    apiCall<{ message: string }>(
      `/api/auth/applicant/forgot-password`,
      {
        method: "PUT",
        body: { email },
        requiresAuth: false,
      }
    ),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiCall<{ message: string }>(
      `/api/auth/applicant/change-password`,
      {
        method: "PUT",
        body: {
          temp_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: newPassword,
        },
      }
    ),
};

export const getAllApplicants = () =>
  apiCall<{ applicants: ApplicantUser[]; message: string }>(
    "/api/auth/applicant/get-all-applicants",
    { requiresAuth: true }
  );
