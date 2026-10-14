import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
};

// ---------------------------------------------------------------------------
// Helpers — for Server Components and API Route Handlers only
// ---------------------------------------------------------------------------

/**
 * Reads the current authenticated user from the leocap_user HttpOnly cookie.
 * Returns null if the cookie is absent or cannot be decoded.
 */
export function getServerSession(): SessionUser | null {
  const cookieStore = cookies();
  const raw = cookieStore.get("leocap_user")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw)) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Reads the raw auth token (JWT) from the leocap_token HttpOnly cookie.
 * Returns null if absent.
 */
export function getAuthToken(): string | null {
  const cookieStore = cookies();
  return cookieStore.get("leocap_token")?.value ?? null;
}
