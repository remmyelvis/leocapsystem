# Leocap Invest — Project Context for Claude Code

## Project Overview

Loan management web app for Leocap Invest (Kenya).
Applicants apply for loans, admins manage them.

## Tech Stack

- Next.js 14 (App Router), TypeScript
- TailwindCSS + shadcn/ui
- NextAuth v5 (JWT, httpOnly cookies)
- Zustand (local state + localStorage persistence)
- React Hook Form + Zod
- Backend API: https://loanapplication-ldee.onrender.com (Python/Flask)

## Project Structure

src/
├── app/
│   ├── (public)/          # landing, login, register
│   ├── dashboard/         # applicant portal
│   ├── admin/             # admin portal
│   └── api/
│       ├── auth/          # NextAuth + register + verify
│       └── proxy/         # proxy to backend API
├── components/
│   ├── global/            # DashboardShell, Navbar, Footer
│   └── loans/             # loan-specific components
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── apiClient.ts       # base fetch wrapper
│   ├── applicantApi.ts    # applicant auth API calls
│   ├── applicationApi.ts  # loan application API calls
│   └── loanCalculations.ts # loan math formulas
├── store/
│   ├── loanStore.ts       # Zustand loan store (persisted)
│   └── authStore.ts       # Zustand auth store
├── types/
│   ├── loan.ts            # loan types
│   └── user.ts            # user types
└── configs/
    ├── constants.ts       # APP_NAME, LOAN_TYPES etc
    └── loanSettings.ts    # interest rates, fees

## Backend API Endpoints

Base URL: https://loanapplication-ldee.onrender.com

### Auth (Admin/HR/Finance)

POST /api/auth/register    → { name, email, number, password, role }
POST /api/auth/login       → { email, password }
DELETE /api/auth/delete/:id
PATCH /api/auth/update/:id

### Applicants

POST /api/applicant/register  → { name, email, phone_number, password,
                                   role: "applicant", kra_pin, id_number }
POST /api/applicant/login     → { email, password }
                              ← { access_token, applicant: {...} }
PATCH /api/applicant/update/:id
PATCH /api/applicant/loan-limit/:id   → { loan_limit }
PATCH /api/applicant/interest-rate/:id → { interest_rate }

### Applications (multipart/form-data)

POST /api/applications        → form fields + documents
GET  /api/applications/get-all
GET  /api/applications/get-one/:id
PATCH /api/applications/update/:id
DELETE /api/applications/delete/:id

### Documents

POST /api/application/documents/:application_id  → { file }
PUT  /api/application/documents/update-doc/:doc_id
GET  /api/application/documents/get-by-application/:id
GET  /api/application/documents/download/:doc_id
DELETE /api/application/documents/delete/:doc_id

### Emails (Admin confirmation messages)

POST  /api/application/emails/:application_id → { confirmation_text }
PATCH /api/application/emails/edit-email/:email_id
GET   /api/application/emails/get-email/:email_id

## Authentication Flow

- Applicants: login via /api/applicant/login → JWT in httpOnly cookie
  Cookie name: access_token_cookie
- Admin/HR/Finance: login via /api/auth/login → (token setup pending)
- NextAuth wraps both, stores role in session
- Proxy at /api/proxy/[...path] forwards Cookie header to backend

## User Roles

| Role      | Portal     | Access               |
| --------- | ---------- | -------------------- |
| applicant | /dashboard | own loans only       |
| hr_nakama | /hr        | Nakama applications  |
| hr_ideon  | /hr        | Ideon applications   |
| finance   | /finance   | HR loan applications |
| admin     | /admin     | everything           |

## Loan Types

| Type             | Key            | Company                |
| ---------------- | -------------- | ---------------------- |
| Salary Advance   | salary_advance | ideon OR nakama        |
| Personal Loan    | personal       | personal               |
| Installment Loan | installment    | personal (coming soon) |

## Loan Calculations

### Salary Advance (Ideon + Nakama combined)

avgSalary = (month1 + month2 + month3) / 3
loanAmount = avgSalary / 3 / 1.1
processingFees = loanAmount * 0.03
accessFees = loanAmount * 0.02
legalFees = 500 (flat, only charged ONCE per month per user)
disbursement = loanAmount - processingFees - accessFees - legalFees
interest = loanAmount * 0.10
repayment = loanAmount * 1.1

### Personal Loan

maxLoan = ROUNDUP((avgSalary / 3) / 1.2, -2)
processingFees = loanAmount * 0.03
legalFees = 1000 (flat, only charged ONCE per month per user)
disbursement = loanAmount - processingFees - legalFees
repayment = loanAmount * (1 + agreedRate)  ← admin sets rate
tenure = 1 month

### Installment Loan

Coming soon — placeholder only

## Application Status Flow

### Salary Advance

PENDING → APPROVED → DISBURSED → LOAN_PAID | LOAN_DEFAULTED

### Personal Loan

PENDING → RATE_SET (admin sets rate) → CONFIRMED (user confirms)
→ APPROVED → DISBURSED → LOAN_PAID | LOAN_DEFAULTED

## Key Business Rules

1. Legal fee only charged on FIRST application per month per user
2. Applicant must complete profile (personal info + documents) before applying
3. Applicant only sees loan type they registered for (ideon/nakama/personal)
4. Documents required for ALL users: ID copy, KRA PIN
5. Additional for Ideon/Nakama: initial contract document
6. Personal loan documents: bank statement (6 months),
   mpesa statement (6 months), payslip (employed only)
7. Payslip hidden if self-employed
8. Admin note required before marking as disbursed
9. After disbursement: admin can mark LOAN_PAID or LOAN_DEFAULTED
10. Personal info auto-populates from profile (read-only in forms)
11. Terms & conditions acceptance required on all loan forms

## Profile Completion

Progress bar: 50% personal info + 50% documents

- Personal info: name, email, phone, ID number, KRA PIN
- Documents: ID copy + KRA PIN doc (all users)
  + contract doc (ideon/nakama users only)
    If profile incomplete → banner on dashboard → cannot apply

## HR Portal

- hr_ideon sees only Ideon applications
- hr_nakama sees only Nakama applications
- HR can adjust amount applied on applications
- HR can apply for personal loans (received by finance role)
- Finance receives HR loan applications
- Finance can also apply for loans (received by HR)

## Admin Disbursement Flow1q

1. Admin adds internal note (bank/mpesa transfer details)
2. "Mark as Disbursed" button only activates after note is added
3. Note persists and is visible to admin only
4. After disbursement: LOAN_PAID or LOAN_DEFAULTED buttons appear

## Current Known Issues

1. get-all and get-one don't return application id (backend bug)
2. Backend cookie name is "access_token_cookie"
3. Admin login endpoint not returning token yet
4. Application 500 error on POST (backend bug, being fixed)

## Theme

- Primary: Blue #1E40AF
- Accent: Red #DC2626
- Font: Inter
- Style: Modern, clean, professional

## Important Notes

- Backend is Python/Flask on Render (free tier - slow cold starts)
- Proxy at src/app/api/proxy/[...path]/route.ts forwards all
  requests to backend
- localStorage used for persistence until full API integration
- Mock admin: admin@leocapinvest.com / Admin@2024!
