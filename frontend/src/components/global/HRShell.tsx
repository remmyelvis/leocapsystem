

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { signOut } from "@/contexts/AuthContext";
import BrandLogo from "@/components/global/BrandLogo";
import UserMenu from "@/components/global/UserMenu";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types/user";
import { companyLabel as getCompanyLabel } from "@/lib/company";
import { Tip } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HRUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: string;
  companyName?: string;
}

interface HRShellProps {
  user: HRUser;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

const navItems = [
  {
    href: "/hr/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/hr/applications",
    label: "Company Applications",
    icon: FileText,
  },
  {
    href: "/hr/my-loans",
    label: "My Applications",
    icon: User,
  },
  {
    href: "/hr/apply",
    label: "Apply for Loan",
    icon: PlusCircle,
  },
  {
    href: "/hr/profile",
    label: "My Profile",
    icon: Users,
  },
] as const;

// ---------------------------------------------------------------------------
// Sidebar Content
// ---------------------------------------------------------------------------

function SidebarContent({
  collapsed,
  pathname,
  onNavClick,
  onToggle,
  showToggle,
}: {
  collapsed: boolean;
  pathname: string;
  onNavClick: () => void;
  onToggle?: () => void;
  showToggle?: boolean;
}) {
  return (
    <>
      {/* Logo + collapse toggle: a white band with the tight wordmark, or just the "A" when collapsed */}
      <div
        className={`flex items-center bg-white border-b border-slate-200 flex-shrink-0 h-16 ${
          collapsed ? "px-2 justify-center gap-1" : "pl-5 pr-3 justify-between"
        }`}
      >
        {collapsed ? (
          <BrandLogo src="/logo-mark.png" height="1.5rem" width="1.5rem" />
        ) : (
          <BrandLogo src="/logo-wordmark.png" height="2rem" />
        )}
        {showToggle && onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/hr/dashboard"
              ? pathname === href
              : pathname.startsWith(href);
          return (
            <Tip key={href} label={collapsed ? label : null} side="right">
              <Link
                to={href}
                onClick={onNavClick}
                aria-label={collapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-red-600 text-white"
                    : "text-emerald-100 hover:bg-emerald-800 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            </Tip>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4 flex-shrink-0 border-t border-emerald-800/50 pt-3">
        <Tip label={collapsed ? "Sign Out" : null} side="right">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-emerald-200 hover:bg-emerald-800 hover:text-white transition-colors w-full ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && "Sign Out"}
          </button>
        </Tip>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HRShell({ user, children }: HRShellProps) {
  const pathname = useLocation().pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Same compact sizing as the admin portal (root font and controls, see globals.css).
  useEffect(() => {
    document.documentElement.classList.add("admin-ui");
    return () => document.documentElement.classList.remove("admin-ui");
  }, []);

  const navProps = {
    pathname,
    onNavClick: () => setSidebarOpen(false),
  };

  const companyLabel = getCompanyLabel(user.company, user.companyName);

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      {/* ── Desktop sidebar (lg+) ── */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-emerald-900 flex-shrink-0 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent
          {...navProps}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          showToggle
        />
      </aside>

      {/* ── Tablet sidebar (md–lg): icon-only ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-emerald-900 flex-shrink-0">
        <SidebarContent {...navProps} collapsed={true} />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex flex-col w-64 bg-emerald-900 z-10">
            <SidebarContent {...navProps} collapsed={false} />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm z-40 sticky top-0 px-4 sm:px-6 h-16 flex items-center gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <span className="bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            HR Panel · {companyLabel}
          </span>

          <div className="flex-1" />

          <UserMenu 
            name={user.name}
            roleLabel="HR Manager"
            bgColorClass="bg-emerald-700"
            profileHref="/hr/profile"
          />
        </header>

        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
