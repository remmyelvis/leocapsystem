import re

path = "frontend/src/pages/admin/manage-companies/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the file inputs UI
ui_to_remove = """
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
"""

content = content.replace(ui_to_remove, "")

# Modify the info text
old_info = 'The "Check-Off Salary Advance" promotional poster will be automatically attached to this email.'
new_info = 'The MoU document, the Service Proposal, and the Promotional Poster will all be automatically generated and attached to this email.'
content = content.replace(old_info, new_info)

# Modify the handleOnboardSubmit function to remove file appends
old_submit = """
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
"""

new_submit = """
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
"""

content = content.replace(old_submit, new_submit)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched frontend UI to remove file uploads")
