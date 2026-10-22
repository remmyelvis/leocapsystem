// Facts the public pages share.
// New visitors need an account first, so the "Apply" buttons go to Register; returning people use Sign In.
export const APPLY_TO = "/register";
export const SIGN_IN_TO = "/login/applicant";
export const EMAIL = "info@leocapinvest.co.ke";
export const PHONES = [
  { label: "+254 722 221 502", href: "tel:+254722221502" },
  { label: "+254 721 834 959", href: "tel:+254721834959" },
];
export const ADDRESS = "Applewood Adams, Along Ngong Road, Nairobi";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Applewood+Adams+Ngong+Road+Nairobi";

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
