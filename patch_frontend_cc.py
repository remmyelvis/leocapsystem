import re

path = "frontend/src/pages/admin/manage-companies/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Update state
old_state = """
  const [onboardingForm, setOnboardingForm] = useState({
    to_email: "",
    subject: "Partnership Proposal: LeoCap Check-Off Salary Advance",
    message: "Please find our proposal and MoU attached. We look forward to partnering with you.",
  });
"""
new_state = """
  const [onboardingForm, setOnboardingForm] = useState({
    to_email: "",
    cc_email: "",
    subject: "Partnership Proposal: LeoCap Check-Off Salary Advance",
    message: "Please find our proposal and MoU attached. We look forward to partnering with you.",
  });
"""
content = content.replace(old_state, new_state)

# Update openOnboardModal
old_open = """
  const openOnboardModal = (comp: any) => {
    setOnboardingCompany(comp);
    setOnboardingForm(prev => ({...prev, to_email: comp.hr_email || ""}));
"""
new_open = """
  const openOnboardModal = (comp: any) => {
    setOnboardingCompany(comp);
    setOnboardingForm(prev => ({...prev, to_email: comp.hr_email || "", cc_email: ""}));
"""
content = content.replace(old_open, new_open)

# Update form JSX
old_form = """
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
"""
new_form = """
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">CC Email (Optional)</label>
                    <input
                      type="email"
                      value={onboardingForm.cc_email}
                      onChange={(e) => setOnboardingForm({...onboardingForm, cc_email: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
"""
content = content.replace(old_form, new_form)

# Update submit handler
old_fd = """
    setIsOnboarding(true);
    const fd = new FormData();
    fd.append("to_email", onboardingForm.to_email);
    fd.append("subject", onboardingForm.subject);
    fd.append("message", onboardingForm.message);
"""
new_fd = """
    setIsOnboarding(true);
    const fd = new FormData();
    fd.append("to_email", onboardingForm.to_email);
    if (onboardingForm.cc_email) fd.append("cc_email", onboardingForm.cc_email);
    fd.append("subject", onboardingForm.subject);
    fd.append("message", onboardingForm.message);
"""
content = content.replace(old_fd, new_fd)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added CC input to frontend")
