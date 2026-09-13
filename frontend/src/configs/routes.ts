export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  LOANS: "/loans",
  LOAN_DETAIL: (id: string) => `/loans/${id}`,
  LOAN_NEW: "/loans/new",
} as const;
