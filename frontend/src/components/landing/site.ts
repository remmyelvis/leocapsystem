// Facts the public pages share.
// New visitors need an account first, so the "Apply" buttons go to Register; returning people use Sign In.
export const APPLY_TO = "/register";
export const SIGN_IN_TO = "/login/applicant";
// Where an applicant sees how their applications are doing (the top strip's "Track application" lands here after sign-in).
export const APPLICATIONS_TO = "/dashboard/applications";
// Leocap Consultancy (tax, accounting and payroll for businesses) has its own site; the footer and the contact section link to it.
export const CONSULTANCY_URL = "https://home.leocapinvest.co.ke/";
// The contact details (email, phones, address) are editable content: see lib/siteContent and its useContact().
// The business's official registrations, exactly as its own certificates state them (checked 30 Oct 2026). Shown in the footer, on the
// privacy page and in the page's structured data. NOT a lending licence: none is claimed here, and one may only be added from a real
// licence document. The proprietors' names and personal addresses on the certificates are deliberately not published.
export const REGISTRATION = {
  legalName: "LEOCAP INVEST",
  // Business Registration Service, under the Registration of Business Names Act (Cap. 499); registered 9 July 2020.
  businessNumber: "BN-8MCJ9DR",
  // Office of the Data Protection Commissioner: registered as a data controller (the certificate runs for two years, so renew it).
  dataControllerId: "827-486A-00F0",
  postalAddress: "P.O. Box 184-00100 GPO, Nairobi",
} as const;

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
