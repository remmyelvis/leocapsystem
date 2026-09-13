export type UserRole =
  | "ADMIN"
  | "USER"
  | "HR_IDEON"
  | "HR_NAKAMA"
  | "FINANCE_IDEON"
  | "FINANCE_NAKAMA";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: "ideon" | "nakama" | "personal";
  createdAt: Date;
}
