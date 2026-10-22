import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2, X, CheckCircle2, FileText, Mail} from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import axiosInstance from "@/lib/axiosInstance";
import { Skeleton } from "@/components/ui/skeleton";

interface Company {
  id: string;
  name: string;
  code: string;
  hr_email: string;
  interest_rate: number;
  processing_fee_rate: number;
  status: string;
  created_at: string;
}

const CodeBadge = ({ code }: { code: string }) => (
  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-mono">{code}</span>
);

const StatusBadge = ({ active }: { active: boolean }) =>
  active ? (
    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
      <CheckCircle2 className="h-3 w-3" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 ring-1 ring-slate-600/20 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
      Inactive
    </span>
  );

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await apiCall<{ applicants: any[] }>("/api/auth/applicant/get-all-applicants");
        if (res.data && Array.isArray(res.data.applicants)) {
          const hrFinance = res.data.applicants.filter(a => a.role === "hr" || a.role === "finance");
          setStaffList(hrFinance);
        }
      } catch (e) {}
    }
    if (isEditModalOpen) loadStaff();
  }, [isEditModalOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    hr_email: "",
    interest_rate: 10.0,
    processing_fee_rate: 3.0,
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await apiCall<any>("/api/companies?all=true");
      setCompanies(res.data.companies || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);


  const openEditModal = (comp: any) => {
    setEditingCompany(comp);
    setFormData({
      name: comp.name,
      hr_email: comp.hr_email || "",
      interest_rate: comp.interest_rate?.toString() || "0",
      processing_fee_rate: comp.processing_fee_rate?.toString() || "0",
      access_fee_rate: comp.access_fee_rate?.toString() || "0",
      legal_fee: comp.legal_fee?.toString() || "0",
      notes: comp.notes || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiCall(`/api/companies/${editingCompany.code}`, {
        method: "PATCH",
        body: {
          name: formData.name,
          hr_email: formData.hr_email,
          interest_rate: parseFloat(formData.interest_rate),
          processing_fee_rate: parseFloat(formData.processing_fee_rate),
          access_fee_rate: parseFloat(formData.access_fee_rate),
          legal_fee: parseFloat(formData.legal_fee),
          notes: formData.notes
        }
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Company updated successfully!");
        setIsEditModalOpen(false);
        fetchCompanies();
      }
    } catch (err) {
      toast.error("Failed to update company");
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Company name is required");

    try {
      setIsSubmitting(true);
      await apiCall("/api/companies", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      toast.success("Company added successfully!");
      setIsModalOpen(false);
      setFormData({ name: "", hr_email: "", interest_rate: 10.0, processing_fee_rate: 3.0 });
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || "Failed to add company");
    } finally {
      setIsSubmitting(false);
    }
  };


  const [downloadingMou, setDownloadingMou] = useState<string | null>(null);

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [onboardingCompany, setOnboardingCompany] = useState<any>(null);
  const [onboardingForm, setOnboardingForm] = useState({
    to_email: "",
    subject: "Partnership Proposal: LeoCap Check-Off Salary Advance",
    message: "Please find our proposal and MoU attached. We look forward to partnering with you.",
  });
  const [onboardFiles, setOnboardFiles] = useState<{mou: File | null, proposal: File | null}>({ mou: null, proposal: null });
  const [isOnboarding, setIsOnboarding] = useState(false);

  const openOnboardModal = (comp: any) => {
    setOnboardingCompany(comp);
    setOnboardingForm(prev => ({...prev, to_email: comp.hr_email || ""}));
    setOnboardFiles({ mou: null, proposal: null });
    setIsOnboardModalOpen(true);
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingForm.to_email) return toast.error("Destination email is required");
    
    setIsOnboarding(true);
    const fd = new FormData();
    fd.append("to_email", onboardingForm.to_email);
    fd.append("subject", onboardingForm.subject);
    fd.append("message", onboardingForm.message);

    try {
      const response = await apiCall(`/api/companies/onboard/${onboardingCompany.id}`, {
        method: "POST",
        isFormData: true,
        formData: fd
      });
      if (response.error) throw new Error(response.error);
      toast.success("Onboarding email sent successfully!");
      setIsOnboardModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setIsOnboarding(false);
    }
  };


      const handleDownloadMou = async (companyId: string) => {
    try {
      setDownloadingMou(companyId);
      const response = await axiosInstance.get(`/api/company/${companyId}/mou`, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mou_company_${companyId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('MoU downloaded successfully');
    } catch (error) {
      toast.error('Failed to download MoU');
    } finally {
      setDownloadingMou(null);
    }
  };

  const actions = (comp: Company) => (
    <>
      <button onClick={() => handleDownloadMou(comp.id)} disabled={downloadingMou === comp.id} className="p-2 rounded-lg hover:bg-slate-100 hover:text-blue-600 transition-colors disabled:opacity-50" title="Download MoU" aria-label="Download MoU">
        <FileText className="h-4 w-4" />
      </button>
      <button onClick={() => openOnboardModal(comp)} className="p-2 rounded-lg hover:bg-slate-100 hover:text-emerald-600 transition-colors" title="Send Onboarding Email" aria-label="Send onboarding email">
        <Mail className="h-4 w-4" />
      </button>
      <button onClick={() => openEditModal(comp)} className="p-2 rounded-lg hover:bg-slate-100 hover:text-brand-blue transition-colors" title="Edit company" aria-label="Edit company">
        <Edit2 className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Manage Companies</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            Add and configure partner companies.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-brand-blue hover:bg-slate-800 text-white text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">No companies found</h3>
            <p className="text-xs text-slate-500 mt-1">Add your first partner company to get started.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-2">Company Name</th>
                    <th className="px-4 py-2">Code</th>
                    <th className="px-4 py-2">HR Contact</th>
                    <th className="px-4 py-2 whitespace-nowrap">Interest</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 lg:px-6 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 lg:px-6 py-2.5 font-semibold text-slate-900">{comp.name}</td>
                      <td className="px-4 py-2.5"><CodeBadge code={comp.code} /></td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[260px]"><span className="block truncate" title={comp.hr_email || ""}>{comp.hr_email || "N/A"}</span></td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{comp.interest_rate}%</td>
                      <td className="px-4 py-2.5"><StatusBadge active={comp.status === "active"} /></td>
                      <td className="px-4 lg:px-6 py-2.5"><div className="flex items-center justify-end gap-1 text-slate-400">{actions(comp)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-100">
              {companies.map((comp) => (
                <li key={comp.id} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-900">{comp.name}</p>
                    <StatusBadge active={comp.status === "active"} />
                  </div>
                  <p className="text-sm text-slate-500 break-all">{comp.hr_email || "No HR contact"}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 flex items-center gap-2"><CodeBadge code={comp.code} /> Interest {comp.interest_rate}%</p>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0">{actions(comp)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Add Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add New Company</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCompany} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">HR Contact Email</label>
                <input
                  type="email"
                  value={formData.hr_email}
                  onChange={(e) => setFormData({ ...formData, hr_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  placeholder="hr@company.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
                  <input
                    type="number" onWheel={(e) => e.currentTarget.blur()}
                    step="0.1"
                    required
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Processing Fee (%)</label>
                  <input
                    type="number" onWheel={(e) => e.currentTarget.blur()}
                    step="0.1"
                    required
                    value={formData.processing_fee_rate}
                    onChange={(e) => setFormData({ ...formData, processing_fee_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Add Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {isEditModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Edit Company: {editingCompany.name}</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-5">
              
              {/* Left Column: Company Details Form */}
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">Company Details</h3>
                <form id="edit-company-form" onSubmit={handleUpdateCompany} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Primary HR/Finance Email</label>
                    <input
                      type="email"
                      value={formData.hr_email}
                      onChange={(e) => setFormData({ ...formData, hr_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Interest Rate (%)</label>
                      <input
                        type="number" onWheel={(e) => e.currentTarget.blur()}
                        step="0.1"
                        required
                        value={formData.interest_rate}
                        onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Processing Fee (%)</label>
                      <input
                        type="number" onWheel={(e) => e.currentTarget.blur()}
                        step="0.1"
                        required
                        value={formData.processing_fee_rate}
                        onChange={(e) => setFormData({ ...formData, processing_fee_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Access Fee (%)</label>
                      <input
                        type="number" onWheel={(e) => e.currentTarget.blur()}
                        step="0.1"
                        required
                        value={formData.access_fee_rate}
                        onChange={(e) => setFormData({ ...formData, access_fee_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Legal Fee (Flat)</label>
                      <input
                        type="number" onWheel={(e) => e.currentTarget.blur()}
                        step="0.1"
                        required
                        value={formData.legal_fee}
                        onChange={(e) => setFormData({ ...formData, legal_fee: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    />
                  </div>
                </form>
              </div>

              {/* Right Column: Staff Management */}
              <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 flex flex-col">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">Linked HR & Finance Contacts</h3>
                <p className="text-xs text-slate-500 mb-4">To add a new contact for {editingCompany.name}, go to <a href="/admin/manage-staff" className="text-brand-blue underline">Manage HR / Finance</a>.</p>
                
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {staffList.filter((s: any) => s.applicant_type === editingCompany.code).length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded-lg text-center text-slate-400 text-sm italic">
                      No HR or Finance staff linked yet.
                    </div>
                  ) : (
                    staffList.filter((s: any) => s.applicant_type === editingCompany.code).map((staff: any) => (
                      <div key={staff.id} className="bg-slate-50 ring-1 ring-slate-900/5 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{staff.name}</p>
                          <p className="text-xs text-slate-500">{staff.email} • {staff.phone_number}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${staff.role === 'hr' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                          {staff.role.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-company-form"
                className="px-4 py-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Onboarding Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Onboard Company
              </h3>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleOnboardSubmit} className="p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Email</label>
                  <input
                    type="email"
                    required
                    value={onboardingForm.to_email}
                    onChange={(e) => setOnboardingForm({...onboardingForm, to_email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.subject}
                    onChange={(e) => setOnboardingForm({...onboardingForm, subject: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={onboardingForm.message}
                    onChange={(e) => setOnboardingForm({...onboardingForm, message: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-lg border border-emerald-100">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Promotional Poster Included
                  </p>
                  The MoU document, the Service Proposal, and the Promotional Poster will all be automatically generated and attached to this email.
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isOnboarding ? "Sending..." : "Send Onboarding Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div>
  );
}
