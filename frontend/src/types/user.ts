export type UserRole = "ADMIN" | "USER" | "HR" | "FINANCE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: string; // company code, e.g. "nakama" or "acme"
  companyName?: string; // the company's name from the companies list
  createdAt: Date;
}
