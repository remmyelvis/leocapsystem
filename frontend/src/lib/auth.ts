import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SUPER_ADMIN_EMAIL } from "./adminApi";
import { authenticateStaff, authenticateMockApplicant } from "./mockStaff";
import type { UserRole } from "@/types/user";

function mapApplicantRole(role: string, applicantType: string): UserRole {
  const r = role?.toLowerCase();
  const t = applicantType?.toLowerCase();
  if (r === "hr") return t === "nakama" ? "HR_NAKAMA" : "HR_IDEON";
  if (r === "finance") return t === "nakama" ? "FINANCE_NAKAMA" : "FINANCE_IDEON";
  return "USER";
}

// ---------------------------------------------------------------------------
// NextAuth configuration
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Super Admin check (hardcoded)
        if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && password === "Admin@2024!") {
          return {
            id: "super-admin-1",
            email: SUPER_ADMIN_EMAIL,
            name: "Super Admin",
            role: "ADMIN",
            accessToken: "super-admin-token",
            phoneNumber: "",
            idNumber: "",
            kraPin: "",
            payrollNumber: "",
          };
        }

        // Mock HR / Finance check (APIs not yet available)
        const staffUser = authenticateStaff(email, password);
        if (staffUser) {
          return {
            id: staffUser.id,
            email: staffUser.email,
            name: staffUser.name,
            role: staffUser.role,
            accessToken: `mock-${staffUser.role.toLowerCase()}-token`,
            phoneNumber: staffUser.phone,
            idNumber: "",
            kraPin: "",
            payrollNumber: "",
          };
        }

        // Mock applicant check (for testing company-based flows)
        const mockApplicant = authenticateMockApplicant(email, password);
        if (mockApplicant) {
          return {
            id: mockApplicant.id,
            email: mockApplicant.email,
            name: mockApplicant.name,
            role: "USER" as const,
            company: mockApplicant.company,
            accessToken: `mock-applicant-${mockApplicant.company}-token`,
            phoneNumber: mockApplicant.phone,
            idNumber: mockApplicant.idNumber,
            kraPin: mockApplicant.kraPin,
            payrollNumber: "", // mock applicant might not have it
          };
        }

        // Try Admin login first (via /api/auth/users/login)
        try {
          const adminResponse = await fetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/auth/users/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ email, password }),
            }
          );

          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            const user = adminData.user;
            if (user && user.role?.toLowerCase() === "admin") {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: "ADMIN" as const,
                accessToken: adminData.access_token || "cookie-auth",
                phoneNumber: user.number ?? "",
                idNumber: "",
                kraPin: "",
                payrollNumber: "",
              };
            }
          }
        } catch {
          // Admin login failed, try applicant login
        }

        // Applicant / HR / Finance login (via /api/auth/applicant/login)
        try {
          const response = await fetch(
            `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/auth/applicant/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ email, password }),
            }
          );

          const data = await response.json();
          if (!response.ok) return null;

          const person = data.user ?? data.applicant;
          if (!person) return null;

          const userRole = person.role === "admin" ? ("ADMIN" as const)
            : mapApplicantRole(person.role ?? "", person.applicant_type ?? "");

          return {
            id: person.id,
            email: person.email,
            name: person.name,
            role: userRole,
            company: person.applicant_type ?? "",
            accessToken: data.access_token ?? "cookie-auth",
            phoneNumber: person.phone_number ?? person.number ?? "",
            idNumber: person.id_number ?? "",
            kraPin: person.kra_pin ?? "",
            payrollNumber: person.payroll_number ?? "",
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      // On initial sign-in, copy user fields into token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        const userRecord = user as { company?: string; accessToken?: string; phoneNumber?: string; idNumber?: string; kraPin?: string };
        token.company = userRecord.company ?? token.company ?? "";
        token.accessToken = userRecord.accessToken;
        token.phoneNumber = userRecord.phoneNumber ?? token.phoneNumber ?? "";
        token.idNumber = userRecord.idNumber ?? token.idNumber ?? "";
        token.kraPin = userRecord.kraPin ?? token.kraPin ?? "";
        token.payrollNumber = (userRecord as any).payrollNumber ?? token.payrollNumber ?? "";
      }
      // When update() is called from the client, merge the new values
      if (trigger === "update" && updateData) {
        if (updateData.name !== undefined) token.name = updateData.name;
        if (updateData.email !== undefined) token.email = updateData.email;
        if (updateData.phoneNumber !== undefined) token.phoneNumber = updateData.phoneNumber;
        if (updateData.idNumber !== undefined) token.idNumber = updateData.idNumber;
        if (updateData.kraPin !== undefined) token.kraPin = updateData.kraPin;
        if (updateData.payrollNumber !== undefined) token.payrollNumber = updateData.payrollNumber;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.company = token.company as string | undefined;
        session.user.phoneNumber = token.phoneNumber as string;
        session.user.idNumber = token.idNumber as string;
        session.user.kraPin = token.kraPin as string;
        session.user.payrollNumber = token.payrollNumber as string;
        const sessionRecord = session as { accessToken?: unknown };
        sessionRecord.accessToken = token.accessToken;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
});
