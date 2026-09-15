

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

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/apply", label: "Apply", icon: PlusCircle },
  { href: "/dashboard/applications", label: "Applications", icon: List },
  { href: "/dashboard/calculators", label: "Calculators", icon: Calculator },
  { href: "/dashboard/profile", label: "Profile", icon: User },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = useLocation().pathname;

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  // Shared nav link renderer
  const renderNavLinks = (collapsed: boolean, onNav?: () => void) =>
    navItems.map(({ href, label, icon: Icon }) => {
      const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
      return (
        <Link
          key={href}
          to={href}
          onClick={onNav}
          title={collapsed ? label : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            collapsed ? "justify-center" : ""
          } ${
            active
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/50 shadow-sm"
              : "text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300"
          }`}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </Link>
      );
    });

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      {/* ── Desktop sidebar (md+): full labels ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-slate-900 flex-shrink-0">
        {/* Logo icon only */}
        <div className="h-16 border-b border-slate-800 flex items-center justify-center flex-shrink-0">
          <BrandLogo size="sm" />
        </div>
        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {renderNavLinks(true)}
        </nav>
        {/* Sign out */}
        <div className="px-2 pb-4 border-t border-slate-800 pt-3 flex-shrink-0">
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* ── Desktop sidebar (lg+): full with labels ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <BrandLogo size="sm" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {renderNavLinks(false)}
        </nav>
        <div className="px-3 pb-4 flex-shrink-0 border-t border-slate-800 pt-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors w-full"
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
          <div className="flex-1" />
          <UserMenu 
            name={user.name}
            roleLabel={user.role.toLowerCase()}
            bgColorClass="bg-slate-900"
            profileHref="/dashboard/profile"
          />
        </header>

        {/* Page content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav (< md) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 flex items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-semibold transition-colors ${
                active ? "text-blue-900" : "text-gray-400"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-brand-blue" : "text-gray-400"}`} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

