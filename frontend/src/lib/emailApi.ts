// Email API functions for admin-to-applicant communication
import { apiCall } from "./apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Email {
  id: string;
  application_id: string;
  confirmation_text: string;
  created_at: string;
  updated_at?: string;
}

export interface EmailDocument {
  id: string;
  email_id: string;
  filename: string;
  file_url?: string;
  created_at: string;
}

export interface CreateEmailPayload {
  confirmation_text: string;
}

export interface CreateEmailResponse {
  message: string;
  email?: Email;
}

export interface GetEmailResponse {
  email: Email;
  documents?: EmailDocument[];
}

// ---------------------------------------------------------------------------
// Email API
// ---------------------------------------------------------------------------

export const emailApi = {
  /**
   * Create an email for an application (Admin only)
   * Correct endpoint: POST /api/application/emails/create-email/:application_id
   */
  create: (applicationId: string, formData: FormData) =>
    apiCall<CreateEmailResponse>(`/api/application/emails/create-email/${applicationId}`, {
      method: "POST",
      isFormData: true,
      formData,
    }),

  /**
   * Get a specific email by ID
   */
  getOne: (emailId: string) =>
    apiCall<GetEmailResponse>(`/api/application/emails/get-email/${emailId}`),

  /**
   * Get all emails for an application.
   * Correct endpoint: GET /api/application/emails/get-emails-per-application/:application_id
   */
  getByApplication: (applicationId: string) =>
    apiCall<Email[]>(`/api/application/emails/get-emails-per-application/${applicationId}`),

  /**
   * Update an email
   */
  update: (emailId: string, payload: Partial<CreateEmailPayload>) =>
    apiCall<{ message: string }>(`/api/application/emails/edit-email/${emailId}`, {
      method: "PATCH",
      body: payload,
    }),

  /**
   * Delete an email
   */
  delete: (emailId: string) =>
    apiCall<{ message: string }>(`/api/application/emails/delete-email/${emailId}`, {
      method: "DELETE",
    }),

  // ---------------------------------------------------------------------------
  // Email Document APIs
  // ---------------------------------------------------------------------------

  /**
   * Upload a document/attachment to an email (Admin only)
   */
  uploadDocument: (emailId: string, file: File) => {
    const formData = new FormData();
    formData.append("email_id", emailId);
    formData.append("file", file);
    return apiCall<{ message: string; document?: EmailDocument }>(
      `/api/application/emails/confirmation-document/${emailId}`,
      {
        method: "POST",
        isFormData: true,
        formData,
      }
    );
  },

  /**
   * Get all documents for an email
   */
  getDocumentsByEmail: (emailId: string) =>
    apiCall<EmailDocument[]>(
      `/api/application/emails/confirmation-document/get-by-email/${emailId}`
    ),

  /**
   * Get a specific document
   */
  getDocument: (docId: string) =>
    apiCall<EmailDocument>(
      `/api/application/emails/confirmation-document/get-one/${docId}`
    ),

  /**
   * Get download URL for a document
   * Opens in new tab or triggers download
   */
  getDownloadUrl: (docId: string) => {
    // Return the direct download URL - browser will handle the download
    return `/api/proxy/api/email/confirmation-document/download/${docId}`;
  },

  /**
   * Delete a document (Admin only)
   */
  deleteDocument: (docId: string) =>
    apiCall<{ message: string }>(
      `/api/application/emails/confirmation-document/delete/${docId}`,
      {
        method: "DELETE",
      }
    ),
};
