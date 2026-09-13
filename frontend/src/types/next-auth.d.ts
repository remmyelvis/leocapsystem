import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/user";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      role: UserRole;
      company?: string;
      phoneNumber?: string;
      idNumber?: string;
      kraPin?: string;
      payrollNumber?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    company?: string;
    accessToken?: string;
    phoneNumber?: string;
    idNumber?: string;
    kraPin?: string;
    payrollNumber?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    company?: string;
    accessToken?: string;
    phoneNumber?: string;
    idNumber?: string;
    kraPin?: string;
    payrollNumber?: string;
  }
}
