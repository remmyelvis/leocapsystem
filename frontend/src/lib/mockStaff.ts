/**
 * Mock data for HR and Finance users.
 * ─────────────────────────────────────────────────────────────────────────
 * APIs are not yet available for these roles, so we use hardcoded mock data.
 * Once real APIs are ready, replace this with actual API calls.
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { UserRole } from "@/types/user";

// ---------------------------------------------------------------------------
// Mock credentials
// ---------------------------------------------------------------------------

export interface StaffUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  company: "IDEON" | "NAKAMA";
  jobTitle: string;
  phone: string;
  employeeNumber: string;
  joinedAt: string;
}

export const MOCK_STAFF_USERS: StaffUser[] = [
  {
    id: "hr-ideon-001",
    email: "ideonhr@leocapinvest.com",
    password: "Ideonhr@2024!",
    name: "James Mwangi",
    role: "HR_IDEON",
    company: "IDEON",
    jobTitle: "HR Manager",
    phone: "0712 345 678",
    employeeNumber: "IDEON-HR-001",
    joinedAt: "2023-03-15",
  },
  {
    id: "hr-nakama-001",
    email: "nakamahr@leocapinvest.com",
    password: "Nakamahr@2024!",
    name: "Faith Wanjiku",
    role: "HR_NAKAMA",
    company: "NAKAMA",
    jobTitle: "HR Manager",
    phone: "0723 456 789",
    employeeNumber: "NAKAMA-HR-001",
    joinedAt: "2023-05-20",
  },
  {
    id: "finance-ideon-001",
    email: "ideonfinance@leocapinvest.com",
    password: "Ideonfinance@2024!",
    name: "Peter Ochieng",
    role: "FINANCE_IDEON",
    company: "IDEON",
    jobTitle: "Finance Manager",
    phone: "0733 567 890",
    employeeNumber: "IDEON-FIN-001",
    joinedAt: "2023-02-10",
  },
  {
    id: "finance-nakama-001",
    email: "nakamafinance@leocapinvest.com",
    password: "Nakamafinance@2024!",
    name: "Susan Achieng",
    role: "FINANCE_NAKAMA",
    company: "NAKAMA",
    jobTitle: "Finance Manager",
    phone: "0744 678 901",
    employeeNumber: "NAKAMA-FIN-001",
    joinedAt: "2023-04-05",
  },
];

export function findStaffByEmail(email: string): StaffUser | undefined {
  return MOCK_STAFF_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function authenticateStaff(
  email: string,
  password: string
): StaffUser | null {
  const user = findStaffByEmail(email);
  if (!user || user.password !== password) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Mock applicant test users (for testing company-based flows)
// ---------------------------------------------------------------------------

export interface MockApplicantUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  idNumber: string;
  kraPin: string;
  company: "ideon" | "nakama" | "personal";
}

export const MOCK_APPLICANT_USERS: MockApplicantUser[] = [
  {
    id: "mock-applicant-ideon-001",
    email: "ideonapplicant@leocapinvest.com",
    password: "Ideonapplicant@2024!",
    name: "David Njoroge",
    phone: "0755111222",
    idNumber: "35678901",
    kraPin: "A345678901B",
    company: "ideon",
  },
  {
    id: "mock-applicant-nakama-001",
    email: "nakamaapplicant@leocapinvest.com",
    password: "Nakamaapplicant@2024!",
    name: "Linda Otieno",
    phone: "0766222333",
    idNumber: "46789012",
    kraPin: "A456789012C",
    company: "nakama",
  },
  {
    id: "mock-applicant-personal-001",
    email: "personalapplicant@leocapinvest.com",
    password: "Personalapplicant@2024!",
    name: "Mark Kipchoge",
    phone: "0777333444",
    idNumber: "57890123",
    kraPin: "A567890123D",
    company: "personal",
  },
];

export function authenticateMockApplicant(
  email: string,
  password: string
): MockApplicantUser | null {
  const user = MOCK_APPLICANT_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!user || user.password !== password) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Mock application data
// ---------------------------------------------------------------------------

export type AppStatus = "Pending" | "Approved" | "Declined" | "Disbursed";

export interface MockApplication {
  id: string;
  applicantId: string;
  customerName: string;
  email: string;
  phone: string;
  idNumber: string;
  company: "IDEON" | "NAKAMA";
  loanType: "salary_advance";
  designation: string;
  employmentNature: string;
  payrollNumber: string;
  monthOne: number;
  monthTwo: number;
  monthThree: number;
  amountApplied: number;
  processingFees: number;
  legalFees: number;
  accessFees: number;
  interestRate: number;
  disbursementAmount: number;
  repaymentAmount: number;
  status: AppStatus;
  submittedAt: string;
  /** "employee" | "hr_ideon" | "hr_nakama" | "finance_ideon" | "finance_nakama" */
  submitterRole: string;
  submitterId: string;
}

// Helper to compute fees from principal
function buildSalaryApp(
  overrides: Partial<MockApplication> & {
    id: string;
    applicantId: string;
    customerName: string;
    email: string;
    phone: string;
    idNumber: string;
    company: "IDEON" | "NAKAMA";
    designation: string;
    payrollNumber: string;
    monthOne: number;
    monthTwo: number;
    monthThree: number;
    amountApplied: number;
    submittedAt: string;
    submitterRole: string;
    submitterId: string;
  }
): MockApplication {
  const principal = overrides.amountApplied;
  const interestRate = 0.1; // 10%
  const processingFees = Math.round(principal * 0.02);
  const legalFees = Math.round(principal * 0.01);
  const accessFees = Math.round(principal * 0.005);
  const interestAmount = Math.round(principal * interestRate);
  const disbursementAmount =
    principal - processingFees - legalFees - accessFees;
  const repaymentAmount = principal + interestAmount;

  return {
    loanType: "salary_advance",
    employmentNature: "Permanent",
    monthTwo: overrides.monthOne,
    monthThree: overrides.monthOne,
    processingFees,
    legalFees,
    accessFees,
    interestRate,
    disbursementAmount,
    repaymentAmount,
    status: "Pending",
    ...overrides,
  } as MockApplication;
}

// ---------------------------------------------------------------------------
// Company employee applications (what HR sees as oversight)
// ---------------------------------------------------------------------------

export const MOCK_COMPANY_APPLICATIONS: MockApplication[] = [
  // ── Ideon employees ───────────────────────────────────────────────────
  buildSalaryApp({
    id: "app-ideon-001",
    applicantId: "emp-ideon-001",
    customerName: "Brian Kamau",
    email: "b.kamau@ideon.co.ke",
    phone: "0701 234 567",
    idNumber: "29384756",
    company: "IDEON",
    designation: "Software Developer",
    payrollNumber: "IDEON-0051",
    monthOne: 95000,
    monthTwo: 95000,
    monthThree: 95000,
    amountApplied: 50000,
    submittedAt: "2026-05-10T09:30:00Z",
    status: "Pending",
    submitterRole: "employee",
    submitterId: "emp-ideon-001",
  }),
  buildSalaryApp({
    id: "app-ideon-002",
    applicantId: "emp-ideon-002",
    customerName: "Grace Njeri",
    email: "g.njeri@ideon.co.ke",
    phone: "0711 345 678",
    idNumber: "31456789",
    company: "IDEON",
    designation: "Accountant",
    payrollNumber: "IDEON-0043",
    monthOne: 75000,
    monthTwo: 75000,
    monthThree: 75000,
    amountApplied: 40000,
    submittedAt: "2026-05-12T11:00:00Z",
    status: "Approved",
    submitterRole: "employee",
    submitterId: "emp-ideon-002",
  }),
  buildSalaryApp({
    id: "app-ideon-003",
    applicantId: "emp-ideon-003",
    customerName: "David Otieno",
    email: "d.otieno@ideon.co.ke",
    phone: "0722 456 789",
    idNumber: "28765432",
    company: "IDEON",
    designation: "Project Manager",
    payrollNumber: "IDEON-0022",
    monthOne: 120000,
    monthTwo: 120000,
    monthThree: 120000,
    amountApplied: 80000,
    submittedAt: "2026-05-15T08:00:00Z",
    status: "Disbursed",
    submitterRole: "employee",
    submitterId: "emp-ideon-003",
  }),
  buildSalaryApp({
    id: "app-ideon-004",
    applicantId: "emp-ideon-004",
    customerName: "Lucy Wambui",
    email: "l.wambui@ideon.co.ke",
    phone: "0733 567 890",
    idNumber: "33219876",
    company: "IDEON",
    designation: "Marketing Executive",
    payrollNumber: "IDEON-0065",
    monthOne: 60000,
    monthTwo: 60000,
    monthThree: 60000,
    amountApplied: 30000,
    submittedAt: "2026-05-20T14:00:00Z",
    status: "Pending",
    submitterRole: "employee",
    submitterId: "emp-ideon-004",
  }),
  buildSalaryApp({
    id: "app-ideon-005",
    applicantId: "emp-ideon-005",
    customerName: "Kevin Maina",
    email: "k.maina@ideon.co.ke",
    phone: "0744 678 901",
    idNumber: "30124857",
    company: "IDEON",
    designation: "Sales Representative",
    payrollNumber: "IDEON-0078",
    monthOne: 55000,
    monthTwo: 55000,
    monthThree: 55000,
    amountApplied: 25000,
    submittedAt: "2026-05-22T10:30:00Z",
    status: "Declined",
    submitterRole: "employee",
    submitterId: "emp-ideon-005",
  }),

  // ── Nakama employees ──────────────────────────────────────────────────
  buildSalaryApp({
    id: "app-nakama-001",
    applicantId: "emp-nakama-001",
    customerName: "Alice Moraa",
    email: "a.moraa@nakama.co.ke",
    phone: "0755 789 012",
    idNumber: "27543219",
    company: "NAKAMA",
    designation: "Operations Analyst",
    payrollNumber: "NAKAMA-0031",
    monthOne: 80000,
    monthTwo: 80000,
    monthThree: 80000,
    amountApplied: 45000,
    submittedAt: "2026-05-11T10:00:00Z",
    status: "Pending",
    submitterRole: "employee",
    submitterId: "emp-nakama-001",
  }),
  buildSalaryApp({
    id: "app-nakama-002",
    applicantId: "emp-nakama-002",
    customerName: "John Kirui",
    email: "j.kirui@nakama.co.ke",
    phone: "0766 890 123",
    idNumber: "29874361",
    company: "NAKAMA",
    designation: "Systems Engineer",
    payrollNumber: "NAKAMA-0044",
    monthOne: 110000,
    monthTwo: 110000,
    monthThree: 110000,
    amountApplied: 70000,
    submittedAt: "2026-05-14T13:30:00Z",
    status: "Approved",
    submitterRole: "employee",
    submitterId: "emp-nakama-002",
  }),
  buildSalaryApp({
    id: "app-nakama-003",
    applicantId: "emp-nakama-003",
    customerName: "Rose Chebet",
    email: "r.chebet@nakama.co.ke",
    phone: "0777 901 234",
    idNumber: "32198765",
    company: "NAKAMA",
    designation: "Customer Service Lead",
    payrollNumber: "NAKAMA-0059",
    monthOne: 65000,
    monthTwo: 65000,
    monthThree: 65000,
    amountApplied: 35000,
    submittedAt: "2026-05-18T09:00:00Z",
    status: "Pending",
    submitterRole: "employee",
    submitterId: "emp-nakama-003",
  }),
  buildSalaryApp({
    id: "app-nakama-004",
    applicantId: "emp-nakama-004",
    customerName: "Samuel Njoroge",
    email: "s.njoroge@nakama.co.ke",
    phone: "0788 012 345",
    idNumber: "28901234",
    company: "NAKAMA",
    designation: "Finance Analyst",
    payrollNumber: "NAKAMA-0027",
    monthOne: 90000,
    monthTwo: 90000,
    monthThree: 90000,
    amountApplied: 55000,
    submittedAt: "2026-05-21T15:00:00Z",
    status: "Disbursed",
    submitterRole: "employee",
    submitterId: "emp-nakama-004",
  }),
];

// ---------------------------------------------------------------------------
// HR personal loan applications (visible to Finance for amount editing)
// ---------------------------------------------------------------------------

export const MOCK_HR_LOANS: MockApplication[] = [
  buildSalaryApp({
    id: "app-hr-ideon-001",
    applicantId: "hr-ideon-001",
    customerName: "James Mwangi",
    email: "ideonhr@leocapinvest.com",
    phone: "0712 345 678",
    idNumber: "24356789",
    company: "IDEON",
    designation: "HR Manager",
    payrollNumber: "IDEON-HR-001",
    monthOne: 130000,
    monthTwo: 130000,
    monthThree: 130000,
    amountApplied: 100000,
    submittedAt: "2026-05-08T09:00:00Z",
    status: "Pending",
    submitterRole: "hr_ideon",
    submitterId: "hr-ideon-001",
  }),
  buildSalaryApp({
    id: "app-hr-nakama-001",
    applicantId: "hr-nakama-001",
    customerName: "Faith Wanjiku",
    email: "nakamahr@leocapinvest.com",
    phone: "0723 456 789",
    idNumber: "26789012",
    company: "NAKAMA",
    designation: "HR Manager",
    payrollNumber: "NAKAMA-HR-001",
    monthOne: 125000,
    monthTwo: 125000,
    monthThree: 125000,
    amountApplied: 90000,
    submittedAt: "2026-05-09T10:30:00Z",
    status: "Pending",
    submitterRole: "hr_nakama",
    submitterId: "hr-nakama-001",
  }),
];

// ---------------------------------------------------------------------------
// Finance personal loan applications (visible to HR for amount editing)
// ---------------------------------------------------------------------------

export const MOCK_FINANCE_LOANS: MockApplication[] = [
  buildSalaryApp({
    id: "app-finance-ideon-001",
    applicantId: "finance-ideon-001",
    customerName: "Peter Ochieng",
    email: "ideonfinance@leocapinvest.com",
    phone: "0733 567 890",
    idNumber: "25678901",
    company: "IDEON",
    designation: "Finance Manager",
    payrollNumber: "IDEON-FIN-001",
    monthOne: 140000,
    monthTwo: 140000,
    monthThree: 140000,
    amountApplied: 110000,
    submittedAt: "2026-05-07T11:00:00Z",
    status: "Pending",
    submitterRole: "finance_ideon",
    submitterId: "finance-ideon-001",
  }),
  buildSalaryApp({
    id: "app-finance-nakama-001",
    applicantId: "finance-nakama-001",
    customerName: "Susan Achieng",
    email: "nakamafinance@leocapinvest.com",
    phone: "0744 678 901",
    idNumber: "27890123",
    company: "NAKAMA",
    designation: "Finance Manager",
    payrollNumber: "NAKAMA-FIN-001",
    monthOne: 135000,
    monthTwo: 135000,
    monthThree: 135000,
    amountApplied: 95000,
    submittedAt: "2026-05-06T12:00:00Z",
    status: "Approved",
    submitterRole: "finance_nakama",
    submitterId: "finance-nakama-001",
  }),
];

// ---------------------------------------------------------------------------
// Helpers for portal data retrieval
// ---------------------------------------------------------------------------

/** Get all salary advance applications for a company (HR oversight view) */
export function getCompanyApplications(
  company: "IDEON" | "NAKAMA"
): MockApplication[] {
  return MOCK_COMPANY_APPLICATIONS.filter((a) => a.company === company);
}

/** Get HR personal loans for a company (Finance edit view) */
export function getHRLoansForCompany(
  company: "IDEON" | "NAKAMA"
): MockApplication[] {
  return MOCK_HR_LOANS.filter((a) => a.company === company);
}

/** Get Finance personal loans for a company (HR edit view) */
export function getFinanceLoansForCompany(
  company: "IDEON" | "NAKAMA"
): MockApplication[] {
  return MOCK_FINANCE_LOANS.filter((a) => a.company === company);
}

/** Get a specific user's own loan applications */
export function getMyLoans(submitterId: string): MockApplication[] {
  return [...MOCK_HR_LOANS, ...MOCK_FINANCE_LOANS].filter(
    (a) => a.submitterId === submitterId
  );
}

/** Get a single application by id from all mock data */
export function getMockApplicationById(
  id: string
): MockApplication | undefined {
  return [
    ...MOCK_COMPANY_APPLICATIONS,
    ...MOCK_HR_LOANS,
    ...MOCK_FINANCE_LOANS,
  ].find((a) => a.id === id);
}

// In-memory store for mock amount overrides (simulates API updates)
const amountOverrides: Record<string, number> = {};
const statusOverrides: Record<string, AppStatus> = {};

export function updateMockAmount(id: string, amount: number): void {
  amountOverrides[id] = amount;
}

export function updateMockStatus(id: string, status: AppStatus): void {
  statusOverrides[id] = status;
}

export function getMockApplicationWithOverrides(
  id: string
): MockApplication | undefined {
  const app = getMockApplicationById(id);
  if (!app) return undefined;
  return {
    ...app,
    amountApplied: amountOverrides[id] ?? app.amountApplied,
    status: statusOverrides[id] ?? app.status,
  };
}

export function getAllMockApplicationsWithOverrides(): MockApplication[] {
  return [
    ...MOCK_COMPANY_APPLICATIONS,
    ...MOCK_HR_LOANS,
    ...MOCK_FINANCE_LOANS,
  ].map((a) => ({
    ...a,
    amountApplied: amountOverrides[a.id] ?? a.amountApplied,
    status: statusOverrides[a.id] ?? a.status,
  }));
}
