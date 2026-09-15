

import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useSearchParams } from "react-router-dom";
import { signOut } from "@/contexts/AuthContext";
import { clearToken, clearAdminUser } from "@/lib/apiClient";
import BrandLogo from "@/components/global/BrandLogo";
import UserMenu from "@/components/global/UserMenu";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  Briefcase,
  Shield,
  Settings,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  UserCog,
  BarChart3,
  History,
  Search,
  Calculator,
} from "lucide-react";
import type { UserRole } from "@/types/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AdminShellProps {
  user: AdminUser;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/applications",
    label: "All Applications",
    icon: FileText,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/manage-applicants",
    label: "Manage Applicants",
    icon: Users,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/manage-companies",
    label: "Manage Companies",
    icon: Building2,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    typeParam: null,
    exact: false,
  },
  {
    href: "/admin/calculators",
    label: "Calculators",
    icon: Calculator,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/manage-staff",
    label: "Manage HR / Finance",
    icon: Briefcase,
    typeParam: null,
    exact: true,
  },
  {
    href: "/admin/settings",
    label: "Admin Panel",
    icon: Settings,
    typeParam: null,
    exact: false,
  },
];

function SidebarContent({
  collapsed,
  showToggle,
  onToggle,
  pathname,
  typeParam,
  onNavClick
}: {
  collapsed: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
  pathname: string;
  typeParam: string | null;
  onNavClick: () => void;
}) {
  const isActive = (basePath: string, itemTypeParam: string | null, exact: boolean) => {
    if (!pathname.startsWith(basePath)) return false;
    if (exact && itemTypeParam === null) {
      // For All Applications (exact, no type): only active when no type param
      if (basePath === "/admin/applications") return !typeParam;
    }
    if (itemTypeParam !== null) return typeParam === itemTypeParam;
    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  return (
    <>
      {/* Logo + collapse toggle */}
      <div
        className={`flex items-center border-b border-slate-800 flex-shrink-0 h-16 ${
          collapsed ? "px-3 justify-center" : "px-5"
        }`}
      >
        {!collapsed && (
          <BrandLogo size="sm" />
        )}
        {showToggle && onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-blue-800 transition-colors text-blue-300 flex-shrink-0"
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
        {navItems.map(({ href, label, icon: Icon, typeParam: tp, exact }) => {
          const active = isActive(href.split("?")[0], tp, exact);
          return (
            <Link
              key={href}
              to={href}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/50"
                  : "text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4 flex-shrink-0 border-t border-slate-800 pt-3">
        <button
          onClick={() => {
            clearToken();
            clearAdminUser();
            signOut({ callbackUrl: "/login" });
          }}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-blue-800 hover:text-white transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminShell({ user, children }: AdminShellProps) {
  const pathname = useLocation().pathname;
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navProps = {
    pathname,
    typeParam,
    onNavClick: () => setSidebarOpen(false),
  };

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      {/* ── Desktop sidebar (lg+): toggleable width ── */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-slate-950 shadow-2xl border-r border-slate-800/50 flex-shrink-0 transition-all duration-300 ${
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

      {/* ── Tablet sidebar (md–lg): always icon-only ── */}
      <aside className="hidden md:flex lg:hidden flex-col w-16 bg-slate-950 shadow-2xl border-r border-slate-800/50 flex-shrink-0">
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
          <aside className="relative flex flex-col w-64 bg-slate-950 shadow-2xl border-r border-slate-800/50 z-10">
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

          <span className="bg-slate-950 shadow-2xl border-r border-slate-800/50 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            Admin Panel
          </span>

          <div className="flex-1" />

          <UserMenu 
            name={user.name}
            roleLabel="Administrator"
            bgColorClass="bg-slate-950 shadow-2xl border-r border-slate-800/50"
            profileHref="/admin/profile"
            isAdmin
          />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
