import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    withCredentials: true,  // always send cookies cross-origin
});

// flask-jwt-extended answers a missing, expired or invalid login with {"msg": "..."} (401, or 422 for a bad token).
// The app's own errors use "message" or "error", so this shape means the session is over, not that something else failed.
function sessionHasEnded(status: number | undefined, data: any): boolean {
  if (typeof data?.msg !== "string") return false;
  if (status === 401) return true;
  return status === 422 && /token|signature|segments|subject|decode/i.test(data.msg);
}

let signingOut = false;

// Returns true when the browser is being sent to the sign-in page. Admins have their own sign-in page; applicants,
// HR and finance staff all sign in on the applicant page, which sends each role to its own portal afterwards.
function sendToSignIn(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (path.startsWith("/login")) return false;
  if (!signingOut) {
    signingOut = true;
    ["leocap_token", "leocap_user_type", "leocap_admin_user"].forEach((k) => localStorage.removeItem(k));
    const isAdmin = path === "/admin" || path.startsWith("/admin/");
    window.location.assign(`${isAdmin ? "/login/admin" : "/login/applicant"}?session=expired`);
  }
  return true;
}

// Intercept error responses where responseType is "blob" so we can
// read the JSON error body before Axios throws, making it accessible
// in catch blocks via err.response.data
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const response = error.response;
    if (response && response.data instanceof Blob) {
      try {
        const text = await response.data.text();
        const json = JSON.parse(text);
        // Replace the blob with the parsed JSON object
        error.response.data = json;
      } catch {
        // Not valid JSON — leave original blob data
      }
    }
    // An expired login sends the user to sign in; the request never settles so no "failed to load" message flashes first.
    if (sessionHasEnded(response?.status, response?.data) && sendToSignIn()) {
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
