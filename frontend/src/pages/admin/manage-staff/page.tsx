import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Loader2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { applicantApi, getAllApplicants } from "@/lib/applicantApi";
import { apiCall } from "@/lib/apiClient";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role: "hr" | "finance";
  applicant_type: string;
  created_at: string;
}

export default function ManageStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  const [formRole, setFormRole] = useState<"hr" | "finance" | null>(null);
  const [applicantType, setApplicantType] = useState<string>("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    password: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, staffRes] = await Promise.all([
        apiCall("/api/companies?all=true"),
        getAllApplicants()
      ]);
      
      if (compRes.data && Array.isArray(compRes.data.companies)) {
        setCompanies(compRes.data.companies);
        if (compRes.data.companies.length > 0) {
          setApplicantType(compRes.data.companies[0].code);
        }
      } else if (compRes.data && Array.isArray(compRes.data)) {
        setCompanies(compRes.data);
        if (compRes.data.length > 0) {
          setApplicantType(compRes.data[0].code);
        }
      }
      
      if (staffRes.data && Array.isArray(staffRes.data.applicants)) {
        const hrFinance = staffRes.data.applicants
          .filter((a: any) => a.role === "hr" || a.role === "finance")
          .map((a: any) => ({
             id: a.id,
             name: a.name,
             email: a.email,
             phone_number: a.phone_number,
             role: a.role as "hr" | "finance",
             applicant_type: a.applicant_type || "",
             created_at: a.created_at
          }));
        setStaffList(hrFinance);
      }
    } catch(err) {
      toast.error("Failed to load HR & Finance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openForm = (role: "hr" | "finance") => {
    setFormRole(role);
    setFormError(null);
    setShowPassword(false);
    setFormData({ name: "", email: "", phone_number: "", password: "" });
  };

  const closeForm = () => {
    setFormRole(null);
    setFormError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRole || !applicantType) return;

    setIsSubmitting(true);
    setFormError(null);

    const res = await applicantApi.register({
      ...formData,
      applicant_type: applicantType,
      role: formRole,
    });

    setIsSubmitting(false);

    if (res.error || !res.data) {
      setFormError(res.error || "Registration failed. Please try again.");
      return;
    }

    toast.success(`Registered ${formData.name} successfully!`);
    closeForm();
    loadData();
  };

  const handleDeleteClick = async (member: StaffMember) => {
    if (pendingDeleteId !== member.id) {
      setPendingDeleteId(member.id);
      setTimeout(() => setPendingDeleteId((cur) => (cur === member.id ? null : cur)), 3000);
      return;
    }
    setPendingDeleteId(null);
    setDeletingId(member.id);
    
    const res = await apiCall(`/api/auth/applicant/delete/${member.id}`, { method: "DELETE" });
    setDeletingId(null);

    if (res.error) {
      toast.error(res.error || "Failed to remove staff member.");
      return;
    }
    toast.success("Staff member removed.");
    loadData();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manage HR & Finance</h1>
          <p className="text-slate-400 text-sm mt-1">
            Register and manage HR and Finance staff accounts dynamically for all active companies.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => openForm("hr")}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Add HR Staff
          </button>
          <button
            onClick={() => openForm("finance")}
            className="flex-1 sm:flex-none px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Add Finance Staff
          </button>
        </div>
      </div>

      {formRole && (
        <div className="mb-10 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-brand-blue" />
              Register {formRole === "hr" ? "HR" : "Finance"} Staff
            </h2>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleRegister} className="p-6">
            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-3">
                <span className="block mt-0.5"><X className="h-4 w-4" /></span>
                <p>{formError}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assign Company</label>
                <select
                  value={applicantType}
                  onChange={(e) => setApplicantType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-slate-50"
                  required
                >
                  {companies.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-slate-50"
                  placeholder="Jane Mwangi"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-slate-50"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-slate-50"
                  placeholder="0712345678"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-slate-50 pr-12"
                    placeholder="Min. 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-[2] py-3 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                  formRole === "hr"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20"
                } disabled:opacity-50`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Registering..." : `Register ${formRole === "hr" ? "HR" : "Finance"} Staff`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lists */}
      <div className="space-y-10">
        {companies.map(comp => {
          const compStaff = staffList.filter(s => s.applicant_type === comp.code);
          
          return (
            <div key={comp.code} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">{comp.name}</h3>
                <span className="text-xs text-slate-500 font-mono bg-slate-200/50 px-2 py-1 rounded-md">{comp.code}</span>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* HR */}
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4 border-b border-emerald-100 pb-2 flex justify-between">
                     <span>HR Department</span>
                     <span>{compStaff.filter(s => s.role === "hr").length} Staff</span>
                  </h4>
                  <div className="space-y-3">
                    {compStaff.filter(s => s.role === "hr").length === 0 ? (
                       <p className="text-sm text-slate-400 italic">No HR staff registered</p>
                    ) : (
                      compStaff.filter(s => s.role === "hr").map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all group">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </div>
                          <button onClick={() => handleDeleteClick(m)} className={`p-2 rounded-lg transition-colors ${pendingDeleteId === m.id ? 'bg-red-500 text-white' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500'}`}>
                            {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {/* Finance */}
                <div>
                  <h4 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-4 border-b border-violet-100 pb-2 flex justify-between">
                     <span>Finance Department</span>
                     <span>{compStaff.filter(s => s.role === "finance").length} Staff</span>
                  </h4>
                  <div className="space-y-3">
                    {compStaff.filter(s => s.role === "finance").length === 0 ? (
                       <p className="text-sm text-slate-400 italic">No Finance staff registered</p>
                    ) : (
                      compStaff.filter(s => s.role === "finance").map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-violet-200 hover:shadow-sm transition-all group">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{m.name}</p>
                            <p className="text-xs text-slate-500">{m.email}</p>
                          </div>
                          <button onClick={() => handleDeleteClick(m)} className={`p-2 rounded-lg transition-colors ${pendingDeleteId === m.id ? 'bg-red-500 text-white' : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500'}`}>
                            {deletingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {companies.length === 0 && !loading && (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
             No companies found in the system. Add some first!
          </div>
        )}
      </div>
    </div>
  );
}
