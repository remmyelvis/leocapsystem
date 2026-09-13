import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { signOut } from "@/contexts/AuthContext";
import { clearToken, clearAdminUser } from "@/lib/apiClient";
import { User, LogOut } from "lucide-react";

interface UserMenuProps {
  name: string;
  roleLabel: string;
  bgColorClass: string;
  profileHref: string;
  isAdmin?: boolean;
}

export default function UserMenu({ name, roleLabel, bgColorClass, profileHref, isAdmin }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    if (isAdmin) {
      clearToken();
      clearAdminUser();
    }
    signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 focus:outline-none hover:opacity-80 transition-opacity"
      >
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-gray-800 leading-tight">
            {name}
          </p>
          <p className="text-xs text-gray-400 leading-tight">
            {roleLabel}
          </p>
        </div>
        <div className={`w-9 h-9 rounded-full ${bgColorClass} flex items-center justify-center text-white text-sm font-black select-none flex-shrink-0`}>
          {name.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 overflow-hidden">
          <Link 
            to={profileHref} 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User className="h-4 w-4 text-gray-400" />
            Go to profile
          </Link>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
