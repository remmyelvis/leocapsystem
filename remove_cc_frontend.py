import re

path = "frontend/src/pages/admin/manage-companies/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert state
content = content.replace('    cc_email: "",\n', '')
content = content.replace('prev => ({...prev, to_email: comp.hr_email || "", cc_email: ""})', 'prev => ({...prev, to_email: comp.hr_email || ""})')

# 2. Revert FormData
content = content.replace('    if (onboardingForm.cc_email) fd.append("cc_email", onboardingForm.cc_email);\n', '')

# 3. Revert UI
old_ui = """                <div className="grid grid-cols-2 gap-4">
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
                </div>"""

new_ui = """                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Email</label>
                  <input
                    type="email"
                    required
                    value={onboardingForm.to_email}
                    onChange={(e) => setOnboardingForm({...onboardingForm, to_email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none transition-all text-sm"
                  />
                </div>"""

content = content.replace(old_ui, new_ui)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Removed CC from frontend")
