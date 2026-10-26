# Leocap Invest — Project Context for Claude Code

## Project Overview

Loan management web app for Leocap Invest (Kenya).
Applicants apply for loans, admins manage them.

## Tech Stack

- React 18 + Vite 8, TypeScript, React Router 7 (client-side SPA)
- TailwindCSS + shadcn/ui
- TanStack React Query (server data) + axios
- Zustand (local state + localStorage persistence)
- React Hook Form + Zod
- Backend API: Python/Flask in ../backend (see README there)

## Project Structure

src/
├── main.tsx, App.tsx      # entry + all routes (react-router)
├── pages/                 # one folder per route, each with page.tsx
│   ├── login/ register/ forgot-password/ privacy-policy/
│   ├── dashboard/         # applicant portal (apply, applications, profile)
│   ├── admin/             # admin portal (applicants, staff, companies,
│   │                      #   audit-trail, reports, calculators, settings, site-content)
│   ├── hr/                # HR portal (dashboard, applications, apply, profile)
│   └── finance/           # finance portal (applications, hr-loans, my-loans)
├── components/            # global/ (shell, navbar), loans/, profile/, ui/
├── contexts/              # AuthContext
├── store/                 # Zustand stores (auth, loan, admin, profiles, ...)
├── repositories/ services/ hooks/ schemas/ types/ configs/
├── lib/                   # API clients, loan math, company helpers
├── lib/siteContent/       # the editable text of the public pages (defaults, text format, hook)
└── lib/seo/               # titles / descriptions of the public pages (pages.ts) and RouteSeo (keeps the <head> right per route)

## Backend API Endpoints

Base URL: same origin (`/api`, proxied by Vite in dev). Some paths below are
from the original docs; the authoritative list is ../backend/website/*.py
(blueprint prefixes: /api/auth/users, /api/auth/applicant, /api/application,
/api/applicant, /api/reports, /api/dashboard, /api/audit-logs, /api/cron,
/api/site-content, /api).

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

- Applicants: login via /api/auth/applicant/login
- Admin: login via /api/auth/users/login
- HR and finance staff are stored with the applicants (their role is hr or
  finance and `applicant_type` is their company) and sign in on /login/applicant
- Backend issues a JWT (Flask-JWT-Extended) as the `access_token_cookie`
  cookie (also accepts an Authorization header); the role is in the token
- Client side: `AuthContext` + Zustand `authStore`, helpers in `src/lib/`
- No NextAuth and no proxy route; the browser calls `/api/*` directly
  (Vite proxy in dev)

## User Roles

| Role      | Portal     | Access               |
| --------- | ---------- | -------------------- |
| applicant | /dashboard | own loans only       |
| hr        | /hr        | their company's applications (any company) |
| finance   | /finance   | their company's HR loan applications |
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

- HR sees only the applications of their own company (the server enforces it;
  the signed-in user carries `company` and `companyName` from the login)
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

- Backend is Python/Flask (see ../backend/README.md for setup). The Vite dev
  server proxies `/api` to http://localhost:5000 (vite.config.ts); a few pages
  build absolute URLs from `VITE_BACKEND_URL`
- macOS: port 5000 is taken by AirPlay Receiver. Run Flask on another port and
  update the proxy target in vite.config.ts (or turn AirPlay Receiver off)
- Demo mode: `DEMO_MODE=True` stops real emails (see ../start_demo.bat)

## Search engines and speed (26 Oct 2026)

- **Public pages' titles, descriptions and canonical address** live in one table, `src/lib/seo/pages.ts` (`PUBLIC_PAGES`, `SITE_URL`).
  `vite-seo.ts` (a plugin in `vite.config.ts`) writes them into `index.html` between the `<!--seo:start/end-->` markers at build time and
  writes `faq.html`, `privacy-policy.html`, `register.html`, `login-applicant.html` (flat names: a `login/` folder would break `/login`);
  `RouteSeo` keeps title / description / canonical / robots right while the visitor moves around. Every page that is not in `PUBLIC_PAGES`
  (portals, 404, password reset), the app. host and the demo build are `noindex` with no canonical. Adding a public page: add it to
  `PUBLIC_PAGES`, `public/sitemap.xml`, and check `public/robots.txt`. Quote no loan numbers in the texts (owner decision 1).
- **Server rules** are `public/.htaccess` (www -> main address, app. gets `X-Robots-Tag: noindex`, html `no-cache`, `/faq` -> `faq.html`,
  `/faq/` -> `/faq`, everything else -> the app) and `public/assets/.htaccess` (1 year immutable; a missing `/assets/*` is a real 404).
  Test changes on a local Apache (`httpd -f`) before pushing: a wrong rule takes the whole site down. The demo deploy appends
  `noindex, nofollow` to the same file. The live deploy ships it to public_html and app. (since 2026-10-26). If it ever breaks the site, restore the old 4 lines by hand in cPanel first (RewriteEngine On, two `RewriteCond %{REQUEST_FILENAME} !-f / !-d`, `RewriteRule ^ /index.html [L]`): a plain revert makes the deploy delete the file.
- **Every page except the home page is a lazy chunk** (`lazy(() => import(...))` in `App.tsx`); keep new pages lazy. Stale tabs after a
  deploy: `vite:preloadError` + `PageLoadBoundary` reload once (`lib/reloadForUpdate.ts`). The home page prefetches sign-in / register /
  FAQ / privacy while idle.
- **No third-party requests while a public page loads** (except the Google map iframe): the font (`pages/fonts`, latin variable woff2,
  preloaded from `index.html`) and the hero photo (`pages/images/hero-800.webp` / `hero-1920.webp`, already greyscale) are self-hosted.
  Logos are small files; `BrandLogo` knows their pixel sizes (`LOGO_SIZE`) so no layout shift. Add a new logo file there too.
- Measure with Lighthouse (`npx lighthouse@12 <url> --chrome-flags="--headless=new"`) on the SAME server before and after; its mobile
  score depends on simulated throttling (a pre-rendered home page looks no faster in it, but is faster in a real throttled browser).
