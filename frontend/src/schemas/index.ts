import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared field definitions (Zod v4 compatible)
// ---------------------------------------------------------------------------

const nameField = z.string().min(2, "Full name must be at least 2 characters");

const emailField = z.string().email("Please enter a valid email address");

const passwordField = z
  .string()
  .min(6, "Password must be at least 6 characters");

const idNumberField = z
  .string()
  .regex(/^\d{7,8}$/, "ID number must be 7-8 digits");

const phoneField = z
  .string()
  .regex(
    /^(\+254|0)[17]\d{8}$/,
    "Please enter a valid Kenyan phone number (e.g. 0712345678)"
  );

const kraPinField = z
  .string()
  .regex(
    /^[Aa]\d{9}[A-Za-z]$/,
    "KRA PIN format: A followed by 9 digits and a letter (e.g. A123456789Z)"
  );

const amountField = z
  .number({ error: "Please enter a valid amount in KES" })
  .positive("Please enter a valid amount in KES");

const payrollNumberField = z
  .string()
  .min(1, "Please enter your payroll number");

// ---------------------------------------------------------------------------
// Register schema
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    idNumber: idNumberField,
    phoneNumber: phoneField,
    password: passwordField,
    confirmPassword: z.string().min(1, "This field is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Login schema
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Salary Advance schema (Ideon & Nakama)
// ---------------------------------------------------------------------------

export const salaryAdvanceSchema = z.object({
  // Bio
  customerName: nameField,
  idNumber: idNumberField,
  phoneNumber: phoneField,
  emailAddress: emailField,
  kraPin: kraPinField.optional(),

  // Employment
  payrollNumber: payrollNumberField,
  natureOfEmployment: z.enum(["Agent", "Management", "Other"], {
    error: "This field is required",
  }),
  designation: z.string().min(1, "This field is required"),

  // Earnings
  basicPayMonth1: amountField,
  basicPayMonth2: amountField,
  basicPayMonth3: amountField,

  // Amount
  amountApplied: amountField,

  termsAccepted: z.literal(true, {
    error: "You must accept the terms to continue",
  }),
});

export type SalaryAdvanceFormData = z.infer<typeof salaryAdvanceSchema>;

// ---------------------------------------------------------------------------
// General Loan schema
// ---------------------------------------------------------------------------

export const generalLoanSchema = z.object({
  // Bio
  customerName: nameField,
  idNumber: idNumberField,
  phoneNumber: phoneField,
  emailAddress: emailField,
  kraPin: kraPinField,

  // Employment
  employmentType: z.enum(["Self Employed", "Employed"], {
    error: "This field is required",
  }),

  // Earnings
  lastEarningsMonth1: amountField,
  lastEarningsMonth2: amountField,
  lastEarningsMonth3: amountField,

  // Amount
  amountApplied: amountField,

  isFirstTimeApplicant: z.boolean().optional(),

  termsAccepted: z.literal(true, {
    error: "You must accept the terms to continue",
  }),
});

export type GeneralLoanFormData = z.infer<typeof generalLoanSchema>;

