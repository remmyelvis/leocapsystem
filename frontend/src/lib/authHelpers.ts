/**
 * Plain (non-React) auth helpers extracted from AuthContext so that
 * AuthContext.tsx only exports React components/hooks and remains
 * compatible with Vite Fast Refresh.
 */

export async function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  localStorage.removeItem("leocap_token");
  localStorage.removeItem("leocap_user_type");
  window.location.href = options?.callbackUrl || "/login";
}
