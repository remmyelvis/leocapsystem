import axiosInstance from './axiosInstance';
import axios, { AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "/api";

// ---------------------------------------------------------------------------
// Token Storage
// ---------------------------------------------------------------------------

// Store token in memory (also save to localStorage for persistence)
let authToken: string | null = null;
let userType: "applicant" | "admin" | null = null;

export function setToken(token: string, type: "applicant" | "admin" = "applicant") {
  authToken = token;
  userType = type;
  if (typeof window !== "undefined") {
    localStorage.setItem("leocap_token", token);
    localStorage.setItem("leocap_user_type", type);
  }
}

export function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    return localStorage.getItem("leocap_token");
  }
  return null;
}

export function getUserType(): "applicant" | "admin" | null {
  if (userType) return userType;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("leocap_user_type");
    return stored as "applicant" | "admin" | null;
  }
  return null;
}

export function clearToken() {
  authToken = null;
  userType = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("leocap_token");
    localStorage.removeItem("leocap_user_type");
  }
}

// ---------------------------------------------------------------------------
// Admin User Data Storage
// ---------------------------------------------------------------------------

export interface StoredAdminUser {
  id: string;
  name: string;
  email: string;
  number: string;
  role: string;
}

export function setAdminUser(user: StoredAdminUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem("leocap_admin_user", JSON.stringify(user));
  }
}

export function getAdminUser(): StoredAdminUser | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("leocap_admin_user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearAdminUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("leocap_admin_user");
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: object;
  isFormData?: boolean;
  formData?: FormData;
  requiresAuth?: boolean;
  skipProxy?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function apiCall<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    isFormData = false,
    formData,
    requiresAuth = true,
    skipProxy = false,
  } = options;

  const baseUrl = skipProxy
    ? (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000")
    : BASE_URL;

  console.log("[apiCall] Called with endpoint:", endpoint, "method:", method);

  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  // Debug logging for API calls
  const isAmendCall = endpoint.includes("/amend/");
  const isDocUpload = endpoint.includes("/applicant/update/");
  const shouldLog = isAmendCall || isDocUpload;
  if (shouldLog) {
    console.log("========== API CLIENT DEBUG ==========");
    console.log("[API] URL:", `${baseUrl}${endpoint}`);
    console.log("[API] Method:", method);
    console.log("[API] Headers:", headers);
    if (!isFormData) console.log("[API] Body:", body);
    if (isFormData && formData) console.log("[API] FormData keys:", Array.from(formData.keys()));
  }

  try {
    const config: AxiosRequestConfig = {
      url: `${baseUrl}${endpoint}`,
      method,
      headers,
      data: isFormData && formData ? formData : body,
    };

    const response = await axiosInstance(config);

    if (shouldLog) {
      console.log("[API] Response Status:", response.status);
    }

    if (response.status === 204) {
      if (shouldLog) console.log("[API] 204 No Content response");
      return { data: null, error: null, status: 204 };
    }

    if (shouldLog) {
      console.log("[API] Response Data:", response.data);
      console.log("=========================================");
    }

    return { data: response.data, error: null, status: response.status };
  } catch (err: any) {
    console.error("API call failed:", err);
    if (shouldLog) {
      console.log("[API] EXCEPTION:", err);
      console.log("=========================================");
    }

    if (axios.isAxiosError(err)) {
      const status = err.response?.status || 0;
      const errorData = err.response?.data || {};

      if (errorData instanceof Blob) {
        return { data: null, error: "Server returned an error.", status };
      }

      const errorMessage = errorData.message || errorData.error || err.message || "Something went wrong";
      return {
        data: null,
        error: errorMessage,
        status,
      };
    }

    return {
      data: null,
      error: "Network error. Please check your connection.",
      status: 0,
    };
  }
}

export async function downloadFile(
  endpoint: string,
  filename: string
): Promise<{ error: string | null }> {
  try {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: AxiosRequestConfig = {
      url: `${BASE_URL}${endpoint}`,
      method: "GET",
      headers,
      responseType: "blob",
    };

    const response = await axiosInstance(config);
    const blob = response.data;

    if (blob.type === "application/json" || blob.size < 2000) {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        if (json.error) return { error: json.error };
        if (json.message) return { error: json.message };
      } catch (e) {
        // fallback to normal download if parsing fails for some reason
      }
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { error: null };
  } catch (err: any) {
    console.error("Download failed:", err);
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data;
      if (data?.error) return { error: data.error };
      if (data?.message) return { error: data.message };
    }
    return { error: err.message || "Network error during download" };
  }
}

export async function previewFile(
  endpoint: string,
  contentType: string = "application/pdf"
): Promise<{ error: string | null }> {
  try {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: AxiosRequestConfig = {
      url: `${BASE_URL}${endpoint}`,
      method: "GET",
      headers,
      responseType: "blob",
    };

    const response = await axiosInstance(config);
    const blob = response.data;

    if (blob.type === "application/json" || blob.size < 2000) {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        if (json.error) return { error: json.error };
        if (json.message) return { error: json.message };
      } catch (e) {
        // fallback
      }
    }

    const typedBlob = new Blob([blob], { type: contentType });
    const url = window.URL.createObjectURL(typedBlob);

    window.open(url, "_blank");

    // Clean up the URL after a short delay to ensure it had time to load in the new tab
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);

    return { error: null };
  } catch (err: any) {
    console.error("Preview failed:", err);
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data;
      if (data?.error) return { error: data.error };
      if (data?.message) return { error: data.message };
    }
    return { error: err.message || "Network error during preview" };
  }
}

