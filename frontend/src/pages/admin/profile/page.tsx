

import { useEffect, useState } from "react";
import { useSession } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Edit3, Info, Save, Shield, User, X } from "lucide-react";
import { adminApi, isSuperAdmin } from "@/lib/adminApi";
import { getAdminUser, setAdminUser, apiCall } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  number: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  temp_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(6, "New password must be at least 6 characters"),
  confirm_new_password: z.string().min(1, "Please confirm your new password"),
}).refine(data => data.new_password === data.confirm_new_password, {
  message: "Passwords do not match",
  path: ["confirm_new_password"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300 disabled:bg-slate-50 disabled:text-slate-400";

const labelClass = "block text-sm font-semibold text-gray-700 mb-2";
const errorClass = "text-red-500 text-xs mt-1.5 flex items-center gap-1";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminProfilePage() {
  const { data: session, status } = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState<{
    id: string;
    name: string;
    email: string;
    number: string;
    role: string;
  } | null>(null);

  const loading = status === "loading";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const {
    register: registerPwd,
    handleSubmit: handlePwdSubmit,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  // Load admin data from localStorage
  useEffect(() => {
    const stored = getAdminUser();
    if (stored) {
      setAdminData(stored);
      reset({
        name: stored.name || "",
        email: stored.email || "",
        number: stored.number || "",
      });
    } else if (session?.user) {
      // Fallback to session data
      const roleValue = typeof session.user.role === "string" ? session.user.role : "admin";
      setAdminData({
        id: session.user.id || "super-admin-1",
        name: session.user.name || "",
        email: session.user.email || "",
        number: "",
        role: roleValue,
      });
      reset({
        name: session.user.name || "",
        email: session.user.email || "",
        number: "",
      });
    }
  }, [session, reset]);

  // Re-initialize form when editing is cancelled
  useEffect(() => {
    if (!editing && adminData) {
      reset({
        name: adminData.name || "",
        email: adminData.email || "",
        number: adminData.number || "",
      });
    }
  }, [editing, adminData, reset]);

  const onSaveProfile = async (data: ProfileForm) => {
    if (!adminData?.id) return;
    
    // Super admin cannot be edited via API
    if (isSuperAdmin(adminData.email)) {
      toast.info("Super admin profile cannot be modified.");
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const response = await adminApi.updateProfile(adminData.id, {
        name: data.name,
        email: data.email,
        number: data.number,
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      // Update local storage
      const updatedAdmin = {
        id: adminData.id,
        name: data.name,
        email: data.email,
        number: data.number,
        role: adminData.role,
      };
      setAdminUser(updatedAdmin);
      setAdminData(updatedAdmin);

      toast.success("Profile updated successfully");
      setEditing(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    setChangingPassword(true);
    try {
      const response = await apiCall("/api/auth/users/change-password", {
        method: "PUT",
        body: data,
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Password changed successfully");
      setShowPasswordForm(false);
      resetPwd();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 w-full space-y-6">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const isSuper = isSuperAdmin(adminData?.email);

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Admin Profile</h1>
        <p className="text-slate-500 text-sm mt-1">
          View and update your administrator information.
        </p>
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-xl bg-blue-900 flex items-center justify-center text-white text-2xl font-black select-none flex-shrink-0">
          {adminData?.name?.charAt(0).toUpperCase() ?? "A"}
        </div>
        <div className="flex-1">
          <p className="text-xl font-black text-slate-900">{adminData?.name || "Admin"}</p>
          <p className="text-slate-400 text-sm mt-0.5">{adminData?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">
              <Shield className="h-3 w-3" />
              Administrator
            </span>
            {isSuper && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full">
                Super Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Super Admin Notice */}
      {isSuper && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Super Admin Account</p>
            <p className="text-amber-600 mt-1">
              This is the primary administrator account. Profile information is managed through system configuration.
            </p>
          </div>
        </div>
      )}

      {/* ── Profile Info ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="text-base font-black text-slate-900">
              Personal Information
            </h2>
          </div>
          {!isSuper && (
            !editing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="rounded-xl border-slate-200 text-sm font-semibold"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                }}
                className="rounded-xl border-slate-200 text-sm font-semibold text-slate-500"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            )
          )}
        </div>

        <div className="p-6">
          {editing ? (
            <form
              onSubmit={handleSubmit(onSaveProfile)}
              className="space-y-5"
              noValidate
            >
              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  {...register("name")}
                  type="text"
                  className={inputClass}
                />
                {errors.name && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                />
                {errors.email && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  {...register("number")}
                  type="tel"
                  placeholder="0712345678"
                  className={inputClass}
                />
                {errors.number && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.number.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                >
                  {saving ? (
                    <>Saving…</>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
                    Full Name
                  </p>
                  <p className="text-slate-800 font-medium">
                    {adminData?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
                    Email Address
                  </p>
                  <p className="text-slate-800 font-medium">
                    {adminData?.email || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
                    Phone Number
                  </p>
                  <p className="text-slate-800 font-medium">
                    {adminData?.number || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">
                    Role
                  </p>
                  <p className="text-slate-800 font-medium capitalize">
                    {isSuper ? "Super Administrator" : "Administrator"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Security Section ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-400" />
          <h2 className="text-base font-black text-slate-900">
            Security Settings
          </h2>
        </div>
        <div className="p-6">
          {!showPasswordForm ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Password</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage your account password
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordForm(true)}
                  className="rounded-xl border-slate-200 text-sm font-semibold"
                >
                  Change Password
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handlePwdSubmit(onChangePassword)} className="space-y-4" noValidate>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Change Password</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPasswordForm(false);
                    resetPwd();
                  }}
                  className="h-8 text-slate-500 hover:text-gray-700 hover:bg-slate-100 rounded-lg px-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>

              <div>
                <label className={labelClass}>Current Password</label>
                <input
                  {...registerPwd("temp_password")}
                  type="password"
                  className={inputClass}
                  placeholder="Enter current password"
                />
                {pwdErrors.temp_password && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {pwdErrors.temp_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>New Password</label>
                <input
                  {...registerPwd("new_password")}
                  type="password"
                  className={inputClass}
                  placeholder="Min. 6 characters"
                />
                {pwdErrors.new_password && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {pwdErrors.new_password.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  {...registerPwd("confirm_new_password")}
                  type="password"
                  className={inputClass}
                  placeholder="Re-enter new password"
                />
                {pwdErrors.confirm_new_password && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {pwdErrors.confirm_new_password.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={changingPassword}
                  className="bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl"
                >
                  {changingPassword ? "Updating…" : "Update Password"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
