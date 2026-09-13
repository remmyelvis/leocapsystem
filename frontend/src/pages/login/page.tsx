import { Link } from "react-router-dom";
import { Shield, User } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";

export default function LoginPortalPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-10">

        <p className="text-slate-500 text-sm mt-2">Please select a sign-in option</p>
      </div>

      {/* Portal cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
        {/* Applicant Portal */}
        <Link to="/login/applicant"
          className="group flex-1 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="h-1.5 bg-brand-blue" />
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <User className="h-7 w-7 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Applicant Login</h2>
              <p className="text-slate-400 text-xs mt-1">Apply for a loan or track your applications</p>
            </div>
            <span className="inline-flex items-center gap-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors">
              Sign In →
            </span>
          </div>
        </Link>

        {/* Admin Portal */}
        <Link to="/login/admin"
          className="group flex-1 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="h-1.5 bg-slate-700" />
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <Shield className="h-7 w-7 text-gray-700" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Admin Login</h2>
              <p className="text-slate-400 text-xs mt-1">Manage loan applications and accounts</p>
            </div>
            <span className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors">
              Sign In →
            </span>
          </div>
        </Link>
      </div>

      {/* Back to home */}
      <p className="text-center text-slate-500 text-sm mt-10">
        <Link to="/" className="hover:text-slate-900 transition-colors">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}
