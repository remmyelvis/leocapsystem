// Facts the public pages share.
// New visitors need an account first, so the "Apply" buttons go to Register; returning people use Sign In.
export const APPLY_TO = "/register";
export const SIGN_IN_TO = "/login/applicant";
// Leocap Consultancy (tax, accounting and payroll for businesses) has its own site; the footer and the contact section link to it.
export const CONSULTANCY_URL = "https://home.leocapinvest.co.ke/";
// The contact details (email, phones, address) are editable content: see lib/siteContent and its useContact().

// Where a signed-in person's own portal starts.
export function portalFor(role?: string) {
  switch ((role ?? "").toUpperCase()) {
    case "ADMIN":
      return "/admin/dashboard";
    case "HR":
      return "/hr/dashboard";
    case "FINANCE":
      return "/finance/dashboard";
    default:
      return "/dashboard";
  }
}

export const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ME";
