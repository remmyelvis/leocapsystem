import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2, X, CheckCircle2 , FileText} from "lucide-react";
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

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manage Companies</h1>
          <p className="text-slate-500 text-sm mt-1">
            Add and configure partner companies.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Company
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">HR Contact</th>
                  <th className="px-6 py-4">Interest Rate</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {comp.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-mono">
                        {comp.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {comp.hr_email || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {comp.interest_rate}%
                    </td>
                    <td className="px-6 py-4">
                      {comp.status === "active" ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 px-2 py-0.5 rounded-full text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-700 ring-1 ring-slate-600/20 px-2 py-0.5 rounded-full text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400">
                                            <button
                        onClick={() => handleDownloadMou(comp.id)}
                        disabled={downloadingMou === comp.id}
                        className="p-1.5 hover:text-blue-600 transition-colors mr-2"
                        title="Download MoU"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditModal(comp)} className="p-1.5 hover:text-brand-blue transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add New Company</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">HR Contact Email</label>
                <input
                  type="email"
                  value={formData.hr_email}
                  onChange={(e) => setFormData({ ...formData, hr_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                  className="px-4 py-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Company: {editingCompany.name}</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
              
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Primary HR/Finance Email</label>
                    <input
                      type="email"
                      value={formData.hr_email}
                      onChange={(e) => setFormData({ ...formData, hr_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Description</label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue text-sm"
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
                    <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-400 text-sm italic">
                      No HR or Finance staff linked yet.
                    </div>
                  ) : (
                    staffList.filter((s: any) => s.applicant_type === editingCompany.code).map((staff: any) => (
                      <div key={staff.id} className="bg-slate-50 ring-1 ring-slate-900/5 p-3 rounded-xl flex items-center justify-between">
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

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
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
                className="px-4 py-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
