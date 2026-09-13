

// TODO: Replace with GET /api/auth/users/get-all
// when backend adds this endpoint

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAdminStore } from "@/store/adminStore";
import { isSuperAdmin, SUPER_ADMIN_EMAIL } from "@/lib/adminApi";
import { getAdminUser } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Info, Lock, Loader2, Mail, Phone, Shield, Trash2, User, UserPlus } from "lucide-react";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const addAdminSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    number: z.string().min(9, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AddAdminForm = z.infer<typeof addAdminSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300";

const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ManageAdminsPage() {
  const admins = useAdminStore((s) => s.admins);
  const addAdmin = useAdminStore((s) => s.addAdmin);
  const removeAdmin = useAdminStore((s) => s.removeAdmin);
  const isLoading = useAdminStore((s) => s.isLoading);
  const storeError = useAdminStore((s) => s.error);
  const clearError = useAdminStore((s) => s.clearError);
  
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);

  // Load current admin info
  useEffect(() => {
    const stored = getAdminUser();
    if (stored) {
      setCurrentAdminEmail(stored.email);
    }
  }, []);

  // Check if current user is super admin
  const currentUserIsSuperAdmin = isSuperAdmin(currentAdminEmail);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddAdminForm>({
    resolver: zodResolver(addAdminSchema),
  });

  const onAddAdmin = async (data: AddAdminForm) => {
    clearError();
    
    const result = await addAdmin({
      name: data.name,
      email: data.email,
      number: data.number,
      password: data.password,
    });

    if (result.success) {
      toast.success(`Admin account created for ${data.name}`);
      reset();
    } else {
      toast.error(result.error || "Failed to create admin");
    }
  };

  const handleRemove = async (id: string, name: string, email: string) => {
    // Don't allow removing super admin
    if (isSuperAdmin(email)) {
      toast.error("Cannot remove the super admin account.");
      return;
    }

    // Only super admin can delete other admins
    if (!currentUserIsSuperAdmin) {
      toast.error("Only the super admin can remove other administrators.");
      return;
    }

    if (confirmRemoveId === id) {
      const result = await removeAdmin(id);
      if (result.success) {
        toast.success(`${name} removed from admins`);
      } else {
        toast.error(result.error || "Failed to remove admin");
      }
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(id);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmRemoveId(null), 3000);
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Manage Admins</h1>
        <p className="text-slate-500 text-sm mt-1">
          Add or remove administrator accounts.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-3">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Admin Management</p>
          <p className="text-blue-600 mt-1">
            New admins will be able to log in using their email and password. They will have access to view loan applications and manage the system.
          </p>
        </div>
      </div>

      {/* Super Admin Only Notice */}
      {!currentUserIsSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Limited Access</p>
            <p className="text-amber-600 mt-1">
              Only the super admin (<code className="bg-amber-100 px-1 rounded">{SUPER_ADMIN_EMAIL}</code>) can add or remove administrator accounts.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {storeError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {storeError}
          <button onClick={clearError} className="ml-auto text-red-800 font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ── Current Admins Table ── */}
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900">
              Current Admins
            </h2>
            <span className="text-xs text-slate-400">{admins.length} admin{admins.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {admins.map((admin) => {
                const isSuper = isSuperAdmin(admin.email);
                const canDelete = currentUserIsSuperAdmin && !isSuper;
                
                return (
                  <div
                    key={admin.id}
                    className="px-6 py-4 flex items-center gap-4"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white text-sm font-black select-none flex-shrink-0">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {admin.name}
                        {isSuper && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                            Super Admin
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{admin.email}</p>
                      {admin.number && (
                        <p className="text-xs text-gray-300 truncate">{admin.number}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">
                        Added{" "}
                        {new Date(admin.addedAt).toLocaleDateString("en-KE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleRemove(admin.id, admin.name, admin.email)}
                        disabled={isLoading}
                        className={`p-2 rounded-xl transition-colors ${
                          confirmRemoveId === admin.id
                            ? "bg-red-600 text-white"
                            : "text-slate-400 hover:bg-red-50 hover:text-red-600"
                        } disabled:opacity-50`}
                        title={
                          confirmRemoveId === admin.id
                            ? "Click again to confirm"
                            : "Remove admin"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Add Admin Form ── */}
        {currentUserIsSuperAdmin ? (
          <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-[#1E3A8A]" />
              </div>
              <h2 className="text-base font-black text-slate-900">Add Admin</h2>
            </div>

            <form
              onSubmit={handleSubmit(onAddAdmin)}
              className="space-y-4"
              noValidate
            >
              {/* Name */}
              <div>
                <label className={labelClass}>Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    {...register("name")}
                    type="text"
                    placeholder="Jane Admin"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="admin@example.com"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className={labelClass}>Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    {...register("number")}
                    type="tel"
                    placeholder="07123456789"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.number && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.number.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="Min. 8 characters"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClass}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    {...register("confirmPassword")}
                    type="password"
                    placeholder="Re-enter password"
                    className={`${inputClass} pl-10`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold h-11 rounded-xl mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Admin
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
            <Shield className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600">Restricted Access</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">
              Only the super admin can add new administrator accounts to the system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
