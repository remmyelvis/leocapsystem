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

export async function signIn(provider?: string, options?: any) {
  if (options?.redirect !== false) {
    window.location.href = options?.callbackUrl || "/login";
  }
  return { error: null, ok: true, status: 200, url: null };
}
