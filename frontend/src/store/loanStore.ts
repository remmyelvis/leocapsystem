import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LoanApplication, LoanStatus, PaymentStatus } from "@/types/loan";
import { calculateGeneralLoan } from "@/lib/loanCalculations";

interface LoanState {
  applications: LoanApplication[];
  addApplication: (app: LoanApplication) => void;
  updateApplication: (id: string, updates: Partial<LoanApplication>) => void;
  updateApplicationStatus: (
    id: string,
    status: LoanStatus,
    adminNote?: string
  ) => void;
  recordPayment: (
    id: string,
    paymentStatus: PaymentStatus,
    amountPaid: number
  ) => void;
  // New actions for interest rate workflow
  setInterestRate: (id: string, rate: number, adminName: string) => void;
  confirmLoanRate: (id: string) => void;
  approveLoan: (id: string, adminName: string, note?: string) => void;
  declineLoan: (id: string, adminName: string, note?: string) => void;
  disburseLoan: (id: string, adminName: string) => void;
  getUserApplications: (userId: string) => LoanApplication[];
  getAllApplications: () => LoanApplication[];
}

export const useLoanStore = create<LoanState>()(
  persist(
    (set, get) => ({
      applications: [],

      addApplication: (app) =>
        set((state) => ({ applications: [...state.applications, app] })),

      updateApplication: (id, updates) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id ? { ...app, ...updates, updatedAt: new Date() } : app
          ),
        })),

      updateApplicationStatus: (id, status, adminNote) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status,
                  updatedAt: new Date(),
                  // When disbursed, initialize payment tracking if not set
                  ...(status === "DISBURSED" && !app.paymentStatus
                    ? { 
                        paymentStatus: "UNPAID" as PaymentStatus, 
                        amountPaid: 0,
                        disbursedAt: new Date().toISOString(),
                      }
                    : {}),
                  ...(adminNote !== undefined
                    ? { adminNotes: adminNote }
                    : {}),
                }
              : app
          ),
        })),

      // Set interest rate for general loans (admin action)
      setInterestRate: (id, rate, adminName) =>
        set((state) => ({
          applications: state.applications.map((app) => {
            if (app.id !== id) return app;

            // Recalculate loan amounts with the new rate
            const loanAmount = app.calculatedLoanAmount ?? app.amountApplied ?? 0;
            const result = calculateGeneralLoan(loanAmount, rate);

            return {
              ...app,
              status: "RATE_SET" as LoanStatus,
              agreedInterestRate: rate,
              interestRateSetAt: new Date().toISOString(),
              interestRateSetBy: adminName,
              calculatedInterest: result.interestAmount,
              calculatedRepayment: result.repaymentAmount,
              calculatedDisbursement: result.disbursementAmount,
              calculatedProcessingFees: result.processingFees,
              calculatedLegalFees: result.legalFees,
              updatedAt: new Date(),
            };
          }),
        })),

      // User confirms the interest rate (user action)
      confirmLoanRate: (id) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: "CONFIRMED" as LoanStatus,
                  userConfirmedAt: new Date().toISOString(),
                  updatedAt: new Date(),
                }
              : app
          ),
        })),

      // Admin approves the loan
      approveLoan: (id, adminName, note) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: "APPROVED" as LoanStatus,
                  approvedAt: new Date().toISOString(),
                  approvedBy: adminName,
                  ...(note ? { approvalNote: note } : {}),
                  updatedAt: new Date(),
                }
              : app
          ),
        })),

      // Admin declines the loan
      declineLoan: (id, adminName, note) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: "DECLINED" as LoanStatus,
                  declinedAt: new Date().toISOString(),
                  declinedBy: adminName,
                  ...(note ? { adminNotes: note } : {}),
                  updatedAt: new Date(),
                }
              : app
          ),
        })),

      // Admin disburses the loan
      disburseLoan: (id, adminName) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: "DISBURSED" as LoanStatus,
                  disbursedAt: new Date().toISOString(),
                  disbursedBy: adminName,
                  paymentStatus: "UNPAID" as PaymentStatus,
                  amountPaid: 0,
                  updatedAt: new Date(),
                }
              : app
          ),
        })),

      recordPayment: (id, paymentStatus, amountPaid) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? {
                  ...app,
                  paymentStatus,
                  amountPaid,
                  lastPaymentDate: new Date(),
                  updatedAt: new Date(),
                }
              : app
          ),
        })),

      getUserApplications: (userId) =>
        get().applications.filter((app) => app.userId === userId),

      getAllApplications: () => get().applications,
    }),
    {
      name: "leocap-loan-store",
    }
  )
);
