

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { signOut } from "@/contexts/AuthContext";
import BrandLogo from "@/components/global/BrandLogo";
import UserMenu from "@/components/global/UserMenu";
import {
  Home,
  PlusCircle,
  List,
  User,
  LogOut,
  Calculator
} from "lucide-react";
import type { UserRole } from "@/types/user";
import { formatName } from "@/lib/formatName";
import { Tip } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShellUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface DashboardShellProps {
  user: ShellUser;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

// `short` is the label under the icon in the phone's bottom bar: five tabs leave 64 px each at 320 px wide, and the full words ran into each other.
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/apply", label: "Apply", icon: PlusCircle },
  { href: "/dashboard/applications", label: "Applications", short: "Loans", icon: List },
  { href: "/dashboard/calculators", label: "Calculators", short: "Calculator", icon: Calculator },
  { href: "/dashboard/profile", label: "Profile", icon: User },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = useLocation().pathname;

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  // Same compact sizing as the admin portal (root font and controls, see globals.css).
  useEffect(() => {
    document.documentElement.classList.add("admin-ui");
    return () => document.documentElement.classList.remove("admin-ui");
  }, []);

  // Shared nav link renderer
  const renderNavLinks = (collapsed: boolean, onNav?: () => void) =>
    navItems.map(({ href, label, icon: Icon }) => {
      const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
      return (
        <Tip key={href} label={collapsed ? label : null} side="right">
          <Link
            to={href}
            onClick={onNav}
            aria-label={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={`tap-btn relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-white/10 text-white before:absolute before:bottom-2 before:left-0 before:top-2 before:w-[3px] before:rounded-r before:bg-red-500"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        </Tip>
      );
    });

  return (
    <div className="flex h-screen h-dvh bg-slate-50/50 overflow-hidden">
      {/* ── Desktop sidebar (md+): full labels ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-[#081430] flex-shrink-0">
        {/* Logo icon only */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-center flex-shrink-0">
          <BrandLogo src="/logo-mark.png" height="1.5rem" width="1.5rem" />
        </div>
        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {renderNavLinks(true)}
        </nav>
        {/* Sign out */}
        <div className="px-2 pb-4 border-t border-white/10 pt-3 flex-shrink-0">
          <Tip label="Sign Out" side="right">
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </Tip>
        </div>
      </aside>

      {/* ── Desktop sidebar (lg+): full with labels ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#081430] flex-shrink-0">
        <div className="h-16 pl-5 pr-3 bg-white border-b border-slate-200 flex items-center flex-shrink-0">
          <BrandLogo src="/logo-wordmark.png" height="2rem" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {renderNavLinks(false)}
        </nav>
        <div className="px-3 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors w-full"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm z-40 sticky top-0 px-4 sm:px-6 h-16 flex items-center gap-4 flex-shrink-0">
          <div className="flex flex-1 items-center md:hidden">
            <BrandLogo src="/logo-wordmark.png" height="30px" />
          </div>
          <div className="hidden flex-1 md:block" />
          <UserMenu 
            name={formatName(user.name)}
            roleLabel="Applicant"
            bgColorClass="bg-slate-900"
            profileHref="/dashboard/profile"
          />
        </header>

        {/* Page content — add bottom padding on mobile for bottom nav */}
        <main className="leo-room leo-room-nav relative flex-1 overflow-y-auto w-full">
          {children}
        </main>
        {/* a page can draw a bar here (the apply form's "you receive" and Submit): above the phone's tab bar, and the page above it ends where the bar starts */}
        <div id="shell-footer" className="mb-[48px] shrink-0 empty:hidden md:mb-0" />
      </div>

      {/* ── Mobile bottom nav (< md) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[48px] bg-white border-t border-gray-200 z-40 flex items-stretch">
        {navItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const short = "short" in item ? item.short : label;
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`relative min-w-0 flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-semibold transition-colors ${
                active ? "text-brand-blue before:absolute before:left-1/2 before:top-0 before:h-[3px] before:w-8 before:-translate-x-1/2 before:rounded-b-full before:bg-red-600" : "text-gray-500"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-brand-blue" : "text-gray-500"}`} />
              <span className="max-w-full truncate">{short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

