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

## Sorting tables (27 Oct 2026)

- One shared header and menu: `components/ui/sortable.tsx` (`SortHeader` = a real button inside the `<th>` with `aria-sort` and a hint, `SortSelect` = the same on phones where a table becomes cards, `nextSort`). A table declares its columns as `SortSpecs` (label, `first` = the most useful first direction: names A to Z, money high to low, dates newest or soonest first, and how each direction reads).
- A table held in the browser sorts with `lib/sortRows.ts` (stable; text compared like a person reads it; **blank values always last in both directions**; ties keep the incoming newest-first order). A paged table sorts on the server (`?sort=&order=`: Reports, HR and finance lists, audit logs) and the page returns to 1 on a sort change.
- Status columns sort in **workflow order** (`statusRank` in `lib/loanStatus.ts`; the same list is `STATUS_ORDER` in `backend/website/reports.py`: keep them in step): overdue trouble, waiting for a decision, approved, rate flow, being repaid, repaid, closed.
- Sortable: Admin All Applications (+ a Due column for loans still being repaid), Manage Applicants, HR and finance Applications, the Dashboard loan pipeline, Financial analysis transactions (Date / In / Out), System logs and Application changes (date order), Reports loans. Not sortable on purpose: a borrower's own loans, HR / finance "My loans", Companies, the amortization schedule, credit factors, ageing buckets, the statement ledger (its date toggle stays).

## Phones (27 Oct 2026)

- The phone rules live in `src/pages/globals.css` (`@media (max-width: 640px), (pointer: coarse)`): buttons / fields are at least 44px tall; **fields are 16px** (iPhone Safari zooms the page on focus when text is smaller; the root size is 14-15px so `text-sm` fields were 12-13px); `.text-xs`, `.text-[11px]` and `.text-[10px]` are 12px. A heading that needs a smaller size must beat the global h1-h3 `!important` rule, so use `max-sm:!text-[12px]` rather than 11px.
- **Links need their own help**: the 44px rule is for buttons. A link drawn as a button gets `tap-btn` (44px tall); a text link that stands on its own gets `tap-link` (an invisible 14px frame around it, so nothing moves). Inline links in a sentence need neither. `min-h-11` is NOT 44px here (rem-based: 38.5px at the 14px root): write `min-h-[44px]`.
- Sidebar shells use `h-screen h-dvh` and the modals `max-h-[92vh] supports-[height:1dvh]:max-h-[92dvh]`, so the iOS address bar cannot hide the bottom (Sign Out, a dialog's buttons).
- Measure with the audit script idea: log in as each role, open every route at 320 / 375 / 430 with touch emulation, and count elements past the viewport, fields under 16px, text under 12px and targets under 24 / 40px. Sideways overflow is hidden by `overflow-x: hidden` on body, so detect it by element rectangles, not by scrollbars. A native `<select>` that clips its own text only shows in a screenshot, not in the numbers.

## Chat assistant, Leo (28 Oct 2026)

- **What:** a guided (no AI model, no server call) chat in `src/components/assistant/`, mounted once in `App.tsx` as `AssistantWidget`. Public pages and signed-in applicants only (staff roles, `/admin`, `/hr`, `/finance`, `/login/admin`, `/reset-password` and `/demo*` never show it; applicants' session role is `"USER"`). The button waits for browser idle, the panel (`ChatPanel.tsx`) is a lazy chunk, and the five mood images are separate hashed WebP files (~11 KB each): the main bundle grew by ~1.5 KB gzip.
- **Where answers come from:** `flows.ts` is the script (steps by name, chips, typed-text intents incl. a little Swahili, FAQ search as the fallback). Money, timing, documents, password and contact answers are NOT written there: the `faq` block renders the admin-editable FAQ answer by id (`time`, `cost`, `repay`, `installment`, `how`, `password`, `contact`, `who`) and silently skips an id an admin deleted. Keep it that way: never copy a figure or promise into `flows.ts`.
- **Estimates:** `estimate.ts` calls the same `calculateSalaryAdvance` / `estimateGeneralLoan` as the application forms, fed one basic-pay figure (the forms ask for 3 months). A Personal Loan has no repayment figure on purpose (the admin sets the rate after review). Labelled "Estimate" everywhere. Change a fee or rate in `configs/loanSettings.ts` and Leo follows.
- **Signed-in applicants:** profile progress is quoted only on `/dashboard*` (where the stores were just loaded); elsewhere he offers "Go to my dashboard".
- **Mascot art:** designed in Google Stitch (project "Leocap Mascot Design Sheet"), one square per mood sliced from its sprite sheet, heads equally sized on exact brand navy `#0F2C59` so a round badge needs no cut-out. Do not redraw it as SVG (the owner rejected that) and do not put him on a red background (his mane vanishes). New moods: generate another sprite sheet in Stitch (3 x 2 grid of heads on flat navy, "head only, same size, same position, no text"), download it (Stitch: select the image, More > Download gives a zip with `screen.png`; Chrome may ask to allow the download), then `python tools/slice_leo_sprites.py <screen.png> <folder>`.
- **Phones:** bottom sheet ~90% of the visible height following `visualViewport` (keyboard), 16px field, 44px targets (use px: `h-11` is 38-41px here), reduced motion = no animation and instant replies, focus trapped, Esc closes, scroll lock on `<html>`. The launcher lifts above the dashboard's tab bar. The last line of a page must clear the button: `html.leo-on` (set by the widget) plus `.leo-room` / `.leo-room-sm` / `.leo-room-nav` on the public footer, the sign-in layout and the dashboard `main`. A new page that ends with something at the bottom right needs the same class.
- **Privacy:** nothing typed leaves the browser; the transcript lives in `sessionStorage` (`leocap_assistant`), the once-a-week hello flag in `localStorage` (`leocap_assistant_greeted`).
- **The orb's motion** (`LeoOrb` / `WaterRim` in `leo.tsx`, styles `.leo-orb*` at the end of `pages/globals.css`): the white rim is the surface of water with wind across it (owner's brief after rejecting a red orbiting comet: "the surrounding white circle behaving like water being blown by wind", then "natural, not generic"). It is an SVG ring painted by a `requestAnimationFrame` loop that exists only while the state is not `rest` (`welcome` first 18 s of a session, flagged in `sessionStorage` `leocap_assistant_seen`; `call` while the hello bubble shows; `touch` on hover or keyboard focus; `thinking` in the header) and stops itself once the ring is a still circle again (0 px departure, no running animation: keep it that way). What makes it read as water and not jelly: the ring stays round and carries FINE ripples (wavelengths 7-15 px, 3 trains) that all travel the same way across it (plane waves along `BLOWS`, up and left, towards the hello bubble; the CSS ripples drift the same way), gusts and lulls from two non-repeating rhythms, a rougher patch on the upwind side, a random starting time. A lumpy low-frequency outline (k = 2-5) looked like a jelly blob and was rejected, and so was a faint second "echo" ring outside the rim (the owner: a grey border that makes the mascot look too busy): the badge is the white rim and the face, nothing else around it at rest. `POINTS` must stay above ~4 per shortest wavelength. Reduced motion: no loop, no CSS animation. Cost: 60 fps and no long tasks at 6x CPU throttle. Other traps met: an `inline-block` avatar in a block box sits on a text baseline and makes the box (and its ring) oval, so the wrappers are `grid`; absolutely positioned layers paint above non-positioned siblings whatever the DOM order, so the face is `relative`.
- **The "Ask Leo" capsule on hover** (`askLeo.tsx`, `AskLeoHover`; hover logic in `AssistantWidget.tsx`): brief was "on hover the mascot expands a text box saying what it does", then "just 'Ask Leo'", then "the mascot should lead in motion as the text box opens after it and then tilt at the end", then "do not be generic", then "the animation should feel natural and fit the vibe of the app". The first spring version (anticipation dip, lunge past to -18 px with squash and stretch, capsule overshooting to 139 px, 9 degree snap tilt) was too performed for a calm lender: the site only ever fades and eases (700 ms ease-out reveals, 300 ms header transitions), no bounce anywhere. Final: Leo and the capsule are two near-critically-damped springs (damping ratio about 0.85-0.9: they ease out and settle, measured overshoot 0 px), Leo leads 10 px out at once (no dip, no stretch), the capsule follows from about 80 ms, its edge carries the same wind ripples as the rim via the shared `windWave` but only about 0.5 px and gone as it settles, letters fade in as the edge passes each one with a 3 x 4 px drift from the lower right, and the head lowers 5 degrees (gentle settle) the moment the capsule reaches 94% (`data-settled`, CSS). Settled by about 500 ms. Closing runs it back, critically damped. Hover opens after a 160 ms dwell; keyboard focus-visible opens at once; touch never does. Traps met: (1) hover must be owned by the stable `.leo-hover` box (60 x 60, does not move); the button must NOT carry its own enter/leave handlers, or moving from Leo onto the capsule schedules a close; (2) the loop guard needs its marker reset in the cleanup (React runs effects twice in development: it blocked every opening); (3) take all loop timing from the frame timestamps, not `performance.now()`; (4) a letter must only start arriving once the capsule's edge has reached it, and its window must end before the capsule is full; (5) judging it: Playwright screenshots (and its virtual clock) disturb real hover, so verify with a page-side recorder timeline in real time (x, length, tilt, overshoot) and film frames by triggering with keyboard focus instead. Zero writes while idle, open or closed again.

## Top strip above the navbar (28 Oct 2026)

- **What:** `components/landing/TopBar.tsx`, rendered first inside the fixed `<header>` by `SiteHeader` (so on the home page and the FAQs page, the two that use it). A deep-navy `#081430` strip (not red: that is the Apply button's colour; not the brand blue: an "info" announcement banner is that blue). Left: tap-to-call phones, email (from 768 px), address as a Maps link (from 1280 px), all from `useContact()`, long values truncate. **Below 768 px the phone number is NOT in the strip** (the navbar's call icon is there then, so repeating it was pointless: the owner noticed): it shows "Documents needed" instead, a link to `/faq#documents` (the popular checklist answer; the FAQ page opens and scrolls to it, also when already on /faq). Rule of thumb: nothing in the strip may repeat what the navbar shows at the same width. Right: signed out, "Track application" (a `Link` to the sign-in page carrying router state `{ next: "/dashboard/applications" }`); applicant, "My applications"; staff, nothing. It makes no claims: the site has no opening hours, licence or WhatsApp number to quote.
- **When:** shown while `scrollY <= 8` (the same `useScrolled` flip as the navbar's shrink), folded away by the first scroll, back at the very top; also folded while the phone menu is open (the menu already has Call / Email cards and its height assumes a 64 px header). On phones (below 768 px) the strip steps aside while an admin's announcement banner is on (`bannerShowing()` in `SiteBanner.tsx`); wider screens keep both. This is the owner's decision: I removed the rule once (the strip is only 28 px now) after they could not see the strip on a phone with a test banner on, and they answered "this rule is okay, keep it". Do not remove it again; if someone cannot see the strip on a phone, check whether a banner is on. The banner itself was slimmed the same day (`SiteBanner.tsx`): the message and its link are one inline sentence (the link used to wrap onto its own row: 83 px on a phone, 44 px on a laptop; now about 45 px on two lines and 31 px on one), 12.5 / 13 px text, `tap-link` on the link so touch screens keep a larger tap area (it overhangs the navbar's call icon by about 2 px at 375 px wide). Collapse = the phone menu's grid-rows trick plus `visibility`, so nothing in it can be tabbed to when folded.
- **Size:** exactly the height of a one-line announcement banner (the owner asked for the two to match): 28.3 px below 640 px, 30.9 px from 640 px, because the strip uses the banner's text size (12.5 / 13 px), line height (1.3) and padding (6 / 7 px; the padding sits on the links so each link is the strip's full height). Keep them in step: if one changes, change the other. TRADE-OFF: a phone tap target is 28 px tall (full strip height, 120+ px wide): above WCAG 2.2 AA's 24 px minimum but under the 44 px the site uses for buttons. It was 44 px until the owner asked for the slimmer bar; the `tap-link` frame cannot help because the collapse wrapper clips it.
- **Sign-in redirect:** `pages/login/applicant/page.tsx` honours `location.state.next` only if it starts with `/dashboard/` and the person signed in is an applicant (`redirectUrl === "/dashboard"`); it is router state, never an address-bar parameter, so nobody can craft a link that sends people elsewhere. A plain "Sign In" still lands on `/dashboard`.
- **Traps met:** the header is fixed, so the strip adds no page height and cannot shift the page, but it does cover the top of the page: the hero's content is centred (11 px clearance at 320x568), and the FAQ title band needed `pt-32` (was `pt-28`) to keep 20 px below the strip on phones. When testing with faked site content, `useSiteContent` caches the fetched blocks in `localStorage` for 60 s: clear it before each load or your override is never fetched. The Vite dev proxy points at :5000 (AirPlay on a Mac, answers 403) but the app calls `VITE_BACKEND_URL` (:5001) directly, so a local backend on :5001 is all that is needed.
