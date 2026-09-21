import re

path = "frontend/src/pages/admin/manage-companies/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Mail to imports
if "Mail" not in content:
    content = content.replace("Building2, Plus, Edit2, Trash2, X, CheckCircle2 , FileText", "Building2, Plus, Edit2, Trash2, X, CheckCircle2, FileText, Mail")

# 2. Add Onboarding State and Handlers
state_insertion_point = "const [downloadingMou, setDownloadingMou] = useState<string | null>(null);"
onboarding_state = """
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
    if (onboardFiles.mou) fd.append("mou_file", onboardFiles.mou);
    if (onboardFiles.proposal) fd.append("proposal_file", onboardFiles.proposal);

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

"""
if "isOnboardModalOpen" not in content:
    content = content.replace(state_insertion_point, state_insertion_point + "\n" + onboarding_state)

# 3. Add Onboard button to row actions
button_search = r'<button onClick=\{\(\) => openEditModal\(comp\)\} className="p-1.5 hover:text-brand-blue \ntransition-colors">'
onboard_button = """
<button onClick={() => openOnboardModal(comp)} className="p-1.5 hover:text-emerald-600 transition-colors mr-2" title="Send Onboarding Email">
  <Mail className="h-4 w-4" />
</button>
"""
if "openOnboardModal(comp)" not in content:
    # We will just replace the start of the Edit button with Onboard button + Edit button
    content = content.replace('<button onClick={() => openEditModal(comp)} className="p-1.5', onboard_button.strip() + '\n<button onClick={() => openEditModal(comp)} className="p-1.5')


# 4. Add the Modal JSX at the end, just before the final `</div>` or inside the main wrapper
modal_jsx = """
      {/* Onboarding Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
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
            
            <form onSubmit={handleOnboardSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Email</label>
                  <input
                    type="email"
                    required
                    value={onboardingForm.to_email}
                    onChange={(e) => setOnboardingForm({...onboardingForm, to_email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={onboardingForm.subject}
                    onChange={(e) => setOnboardingForm({...onboardingForm, subject: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={onboardingForm.message}
                    onChange={(e) => setOnboardingForm({...onboardingForm, message: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">MoU Document (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setOnboardFiles({...onboardFiles, mou: e.target.files?.[0] || null})}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Document (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setOnboardFiles({...onboardFiles, proposal: e.target.files?.[0] || null})}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-xl border border-emerald-100">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-4 w-4" /> Promotional Poster Included
                  </p>
                  The "Check-Off Salary Advance" promotional poster will be automatically attached to this email.
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOnboarding}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  {isOnboarding ? "Sending..." : "Send Onboarding Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
if "Onboarding Modal" not in content:
    # Insert before the last </div>
    last_div_index = content.rfind("</div>")
    content = content[:last_div_index] + modal_jsx + content[last_div_index:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched page.tsx with onboarding UI.")
