import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { UserRole } from "@/types/user";

function getRoleHome(role: UserRole | undefined): string {
  switch (role) {
    case "ADMIN": return "/admin/dashboard";
    case "HR_IDEON": return "/hr/ideon";
    case "HR_NAKAMA": return "/hr/nakama";
    case "FINANCE_IDEON":
    case "FINANCE_NAKAMA": return "/finance";
    default: return "/dashboard";
  }
}

export default auth((req: NextRequest & { auth: { user?: { role?: UserRole } } | null }) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role as UserRole | undefined;

  const path = nextUrl.pathname;

  const isHRIdeon   = path.startsWith("/hr/ideon");
  const isHRNakama  = path.startsWith("/hr/nakama");
  const isHR        = path.startsWith("/hr") && !isHRIdeon && !isHRNakama;
  const isFinance   = path.startsWith("/finance");
  const isDashboard = path.startsWith("/dashboard");
  const isAdmin     = path.startsWith("/admin");

  const isAuthPage =
    path === "/login" ||
    path === "/login/applicant" ||
    path === "/login/admin" ||
    path === "/login/hr" ||
    path === "/login/finance" ||
    path === "/register";

  // Redirect already-authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
  }

  // /dashboard — applicant (USER) only
  if (isDashboard) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/applicant", nextUrl));
    if (userRole !== "USER") return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
  }

  // /admin/* — ADMIN only
  if (isAdmin) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/admin", nextUrl));
    if (userRole !== "ADMIN") return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
  }

  // /hr/ideon/* — HR_IDEON only
  if (isHRIdeon) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/applicant", nextUrl));
    if (userRole !== "HR_IDEON") return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
  }

  // /hr/nakama/* — HR_NAKAMA only
  if (isHRNakama) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/applicant", nextUrl));
    if (userRole !== "HR_NAKAMA") return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
  }

  // /hr/* (shared pages like /hr/dashboard, /hr/applications) — any HR role
  if (isHR) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/applicant", nextUrl));
    if (userRole !== "HR_IDEON" && userRole !== "HR_NAKAMA") {
      return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
    }
  }

  // /finance/* — any Finance role
  if (isFinance) {
    if (!isAuthenticated) return NextResponse.redirect(new URL("/login/applicant", nextUrl));
    if (userRole !== "FINANCE_IDEON" && userRole !== "FINANCE_NAKAMA") {
      return NextResponse.redirect(new URL(getRoleHome(userRole), nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/hr/:path*",
    "/finance/:path*",
    "/login",
    "/login/applicant",
    "/login/admin",
    "/login/hr",
    "/login/finance",
    "/register",
  ],
};
