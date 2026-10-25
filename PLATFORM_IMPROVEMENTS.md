# Leocap Invest Platform: What Has Changed

**For:** Elvis Karemi  
**Covers:** 15 October 2026 to today  
**Last updated:** 25 October 2026

This document lists, in plain language, every improvement and correction made to the loan platform since work began on 15 October 2026. For each change it shows what things were **like before** and what they are **like now**.

---

## How to read this document

- Changes are grouped by topic (money, reports, emails, and so on). Pick the topic you care about; you do not need to read it in order.
- Every table has the same columns: **What** (the change), **Before**, **After**, and **Date**.
- Dates are 2026. A date is the day the change was made.
- Everything below has been **published to the live platform**.
- Section 15 lists **decisions that are waiting for you**. Section 16 lists things that are **still as they were** (known limits), so nothing is hidden.

### Words used in this document

| Word | What it means |
|---|---|
| **Balance owed** | What a borrower still has to pay on a loan right now (the system calls it the "outstanding balance"). |
| **Statement** | The list of everything charged to and paid on a borrower's loans: the loan, its interest, payments, fees. Each line shows the balance after it. |
| **Delinquent** | A loan that is overdue by more than 7 days. The platform adds a 15% collection fee once. |
| **Defaulted / Escalated** | The next steps after delinquent: the loan is marked defaulted, then a demand notice is produced (escalated). |
| **Rollover interest** | Extra interest charged on a loan that was not repaid on time, so the borrower gets more time. |
| **Penalty** | A one-off charge you add to a loan (for example for a late or dishonoured payment). New on 25 October. |
| **Audit trail** | The platform's own record of who did what and when. Entries cannot be edited, and recent ones cannot be deleted. |
| **Written off** | A loan you have decided to stop chasing. Its balance is cleared and its statement is closed. |

### How a loan's balance moves (as the platform works today)

| Event | Effect on the balance owed |
|---|---|
| Loan is applied for | Starts at the loan amount **plus its interest** |
| Payment recorded | Goes **down** by the payment |
| Rollover interest charged | Goes **up** by the chosen % of what is **still owed** (not of the original total) |
| 15% collection fee (after 8 days overdue) | Goes **up** by 15% of what is still owed, once |
| Penalty added | Goes **up** by the penalty amount |
| Marked as paid | Goes to **zero** |
| A wrong payment, interest, fee or penalty is deleted from the statement | Goes back to what it would have been, and the lines after it are corrected |

---

## The short version

1. **The platform is online, up to date, and easy to update.** Each approved change is published automatically, and can be undone.
2. **Loan money is calculated consistently.** Balances, interest, payments and statements now agree with each other, and interest follows your rule: it is charged on what is still owed.
3. **Existing records were corrected** (Section 3), with copies kept of everything that was changed.
4. **"Mark as Paid" works.** It crashed before. Clearing a whole company's month is now previewed, recorded and emailed.
5. **Late loans are handled.** A daily check sends reminders and applies the 15% fee, and delinquent loans can be paid, defaulted and escalated.
6. **Reports and downloads work.** The PDF download did nothing before.
7. **Emails are sent and tracked.** New applications, finance notices, "fully repaid", password resets and penalties. Every email is recorded.
8. **Serious security gaps were closed.** For example, any signed-in applicant could approve or delete anyone's loan.
9. **The admin screens are safer and easier.** The old "Suspend" button deleted people and their loans. It now only suspends.
10. **New tools for you:** a clickable **Overdue** card, a **searchable applicant statement** with a per-line delete, and **Add Penalty**.
11. **The public website was redesigned** (same wording), with a new FAQ page.

---

## Contents

1. [Putting the platform online and keeping it updated](#1-putting-the-platform-online-and-keeping-it-updated)
2. [Money: balances, interest and statements](#2-money-balances-interest-and-statements)
3. [Corrections made to your existing records](#3-corrections-made-to-your-existing-records)
4. [Repayments, late loans and reminders](#4-repayments-late-loans-and-reminders)
5. [New tools: Overdue shortcut, Applicant Statement, Penalties](#5-new-tools-overdue-shortcut-applicant-statement-penalties)
6. [Reports and downloads](#6-reports-and-downloads)
7. [Emails the platform sends](#7-emails-the-platform-sends)
8. [Security and privacy](#8-security-and-privacy)
9. [HR, finance and companies](#9-hr-finance-and-companies)
10. [Applicants and their accounts](#10-applicants-and-their-accounts)
11. [Admin screens: easier, safer, fully recorded](#11-admin-screens-easier-safer-fully-recorded)
12. [Calculators](#12-calculators)
13. [The public website](#13-the-public-website)
14. [Looks and phone-friendliness](#14-looks-and-phone-friendliness)
15. [Decisions waiting for you](#15-decisions-waiting-for-you)
16. [Still as before (known limits)](#16-still-as-before-known-limits)
17. [Change log by date](#17-change-log-by-date)

---

## 1. Putting the platform online and keeping it updated

| What | Before | After | Date |
|---|---|---|---|
| **The version on the website** | The live platform was running an older copy of the program (from 10 September) that lacked many features. | The live platform runs the current version. | 15 Oct |
| **How updates are published** | No repeatable way. Files had to be copied across by hand. | Every approved change is published automatically, usually within a few minutes. If a change causes a problem, it can be taken back by returning to the earlier version. | 15 Oct |
| **Two web addresses** | `app.leocapinvest.co.ke` could not talk to the platform's server, so signing in there could fail. | Both `leocapinvest.co.ke` and `app.leocapinvest.co.ke` show the same up-to-date site and both work. | 15 Oct |
| **The database** | The live database was missing 5 tables and several columns the newer program needs. Money amounts were stored as text rather than numbers. | Upgraded in one careful step. A backup was taken first, and afterwards the totals were confirmed unchanged (112 applications, 70 applicants at that time). | 15 Oct |
| **Part of the program was not saved in the project** | A section of the website's code had never been saved with the rest, so the site could not be rebuilt on another computer or by the publishing system. | Saved. The site can be rebuilt reliably. | 15 Oct |
| **Setup instructions** | Out-of-date notes describing a different technology. | Replaced with accurate setup notes. | 15 Oct |

---

## 2. Money: balances, interest and statements

| What | Before | After | Date |
|---|---|---|---|
| **Changing a loan's amount or rate** | Changing the terms did not carry through to the repayment amount or the balance owed. The statement kept the old figures. | Repayment, balance and the statement lines all follow the new terms. | 15 Oct |
| **Rollover interest** | Interest was calculated on the original total, ignoring payments already made. | Interest is charged on **what is still owed**, as you instructed. | 15 Oct |
| **Admin's statement view** | It ignored the dates you picked. The running balance added up all of a borrower's loans together, which meant nothing. HR and finance could not open it. | It respects the dates. Each line shows **that loan's own balance**. HR and finance can open it. | 15 Oct |
| **Statement PDF** | Some older entries were not matched to the right loan, so a loan's statement could be empty or incomplete. | Each loan picks up its own entries correctly. | 15 Oct |
| **Starting interest rate on a new application** | The rate came from a hidden value sent by the applicant's browser, so it could be altered (even to 0%). | The platform sets the rate from the company's own rate. Any attempt to send a different rate is noted in the record. | 21 Oct |
| **Loan amount checks** | A missing, zero or absurdly large amount could cause an error or be accepted. | Refused with a clear message. | 21 Oct |
| **Payment status on the borrower's own pages** | The borrower's loan list never showed a payment badge. "Amount Paid" stayed empty for part-paid loans, and a delinquent loan showed no payment status. | The list shows "Partially Paid" or "Fully Paid". The loan page shows what has been paid and what remains (the balance owed). A delinquent loan shows as "Overdue". | 21 Oct |
| **Fixing a wrong statement line** | A mistaken payment, interest or fee on a statement could not be removed. | It can be deleted safely (see Section 5), and the loan's balance is corrected. | 25 Oct |

---

## 3. Corrections made to your existing records

These changes were made **directly to the live data**, not just to the program. In every case a copy of the original was kept first, so any of it can be reversed.

| What was corrected | Before | After | Date |
|---|---|---|---|
| **Duplicate "Loan rate set" lines** | 13 old lines (dated 31 July to 5 October, across 9 borrowers) repeated a loan's amount a second time. This inflated "Total borrowed" on statement PDFs by about **KES 2.3 million**. | Removed. A copy of the 13 lines is kept. | 15 Oct |
| **Interest and "Loan paid" lines** | The opening lines of 5 loans (9 lines) did not match their loans. Three "Loan paid" lines showed a balance instead of zero. | Corrected to match the loans. | 15 Oct |
| **Statements of 12 loans (6 borrowers)** | The statements did not match your records. | Rebuilt from your spreadsheet (`leocap loans.xlsx`). 52 lines in all. For every loan, charges less payments now equals its balance. Notes made at the time: one principal in the sheet (94,669) looked like a typing slip, and 94,699 was used; one payment differs by KES 0.48 from rounding. | 15 Oct |
| **One loan's balance** | The balance and an interest line had been worked out on the old basis (on the original total). | Corrected to your rule. Balance KES 172,500. | 15 Oct |
| **"Company" shown on 8 personal loans** | The employer's name typed on the form (for example "De La Rue" or "Inspire Credit Ltd") had replaced the company, creating look-alike companies in your totals. | Set to the company chosen at sign-up. Company totals then read Nakama 72, Ideon 21, Personal 20. | 17 Oct |
| **Personal company's HR contact** | The contact address (`loans@leocapinvest.co.ke`) is a mailbox that does not exist, so notices bounced. | Changed to `hr@leocapinvest.co.ke`. | 22 Oct |

---

## 4. Repayments, late loans and reminders

| What | Before | After | Date |
|---|---|---|---|
| **"Mark as Paid"** | It crashed with an error every time, on the dashboard and on the loan page. | Works. It records "Loan paid" on the statement, sets the balance to zero, writes an audit record and emails the borrower. | 21 Oct |
| **"Mark Nakama Paid" / "Mark Ideon Paid"** | One click marked **every** disbursed salary advance of that company as paid, whatever the month or status, with no statement entry and no record. | You choose **one repayment month**. The platform first shows **how many loans and the total**, and asks you to confirm. Only that month's unpaid loans are cleared, each with a statement entry, an audit record and an email to the borrower. | 22 Oct |
| **Delinquent loans** | They could not take payments, could not be defaulted or escalated, and were missing from the dashboard and reports. The borrower saw no status. | You can record payments (the loan **stays** delinquent, so the 15% fee is never charged twice). Loans can be defaulted and escalated. They count in the dashboard and reports. The borrower sees "Overdue" and the amount remaining. | 21 Oct |
| **The daily reminder check** | Anyone on the internet could trigger it (it adds fees and emails borrowers). Its emails never actually sent because of a bug. It was not scheduled. | It is protected by a secret key and runs **every day at 6:00 am**. It emails reminders **7 days before the due date, 3 days before, on the due date, and 7 days after**. From the **8th day overdue** it marks the loan delinquent and adds the 15% collection fee on what is owed. | 21 Oct |
| **Dashboard "Outstanding" and "Overdue"** | They left out part-paid loans and delinquent loans, so they under-stated what is owed. | They include unpaid, part-paid and delinquent disbursed loans. | 21 Oct |

---

## 5. New tools: Overdue shortcut, Applicant Statement, Penalties

### 5.1 The Overdue card is now a shortcut (25 Oct)

| Before | After |
|---|---|
| The **Overdue** number on the admin dashboard was just a number. | Click it to see **exactly those loans**: disbursed, past their due date and not fully repaid. If you chose a month at the top of the dashboard, the list is for that month, so the number and the list always agree. A "Show all applications" button clears the filter. |

### 5.2 The Applicant Statement (Manage Applicants, open an applicant) (25 Oct)

| What | Before | After |
|---|---|---|
| **Opening it** | You had to click "View Statement Entries" before seeing anything. | It opens straight away with the full statement. |
| **Finding things** | Three date boxes (one of them only labelled the PDF). Lines from all of a borrower's loans were mixed together with no indication of which loan. | One **Loan** picker (when there are several loans), date shortcuts (**This month**, **Last 30 days**, **Last 90 days**, **Custom**), **type buttons with counts** (Payments, Interest, Charges, Loan, Write-offs), and a **search** box that finds a description or an amount. Each line names its loan. |
| **Totals** | None. | Shows **Charged** and **Paid** for what you are looking at, and the **Balance owed now**. |
| **The PDF** | The button stayed greyed out until two dates were entered, with no explanation. | It follows what you selected: the loan and the dates. For "All time" no dates are needed. |
| **Checking details** | Not possible. | Sort newest or oldest first. "Clear filters" resets everything. |

### 5.3 Correcting or deleting a wrong line on the statement (25 Oct)

| Before | After |
|---|---|
| A payment, interest charge or fee entered by mistake could not be removed. | Every line has a **delete** button. Before anything changes, the platform shows **exactly what will happen** (for example: "Balance owed: KES 6,800 to KES 9,800", "Loan status: Paid to Unpaid", "2 later lines will be re-balanced"). You can add a reason. The loan's balance, its status and the running balance on every later line are corrected, and the change is written to the loan's history and the audit trail. |
| A wrong amount, date or wording could only be fixed by deleting the line and entering it again. | Every line also has an **edit** (pencil) button. You can change the **amount**, the **date and time** and the **description**. While you type, the platform shows what will happen before you save: the new balance owed, whether the loan's status changes, and how many other lines are re-balanced. For rollover interest the loan's repayment total follows too. A payment's wording follows its amount ("Partially paid 3000" becomes "Partially paid 2500") unless you write something else. You can add a reason, and the change is written to the loan's history and the audit trail. |
| | **Safeguards:** a payment cannot be raised above what the borrower owes; a line keeps its kind (a payment stays a payment); the date cannot be in the future or before the loan was applied for; and moving a date puts the line in its new place and corrects the balances of the lines it moved past. |
| | **Protected:** the two opening lines of a loan (the loan itself and its first interest) cannot be edited or deleted; change the loan's terms instead. A **written-off** loan's statement is closed. |

### 5.4 Add Penalty (loan page) (25 Oct)

| Before | After |
|---|---|
| There was no way to charge a one-off penalty on a loan. | A new **Add Penalty** button on an open loan opens a small form with three fields: **Amount**, **Date & Time** and **Penalty Description**. |
| | While you type, it shows the effect: "Balance owed: KES 6,800 to KES 7,300". |
| | The penalty appears on the statement as "Penalty: your description", with the date and time you entered. It can be **backdated** (later lines are re-balanced) but not dated in the future. |
| | It raises the balance owed only. It does **not** change the loan's repayment amount or due date, and it does not mark the loan as defaulted. |
| | Only open, disbursed loans accept a penalty. A penalty entered twice in the same minute is refused. |
| | The change is recorded in the loan's history and the audit trail. A wrong penalty can be deleted from the statement (5.3). |
| **Email to the borrower** | A tick box, **on by default**: "Email the borrower at their address". The borrower is told the amount, the reason, the date, the loan reference and what is now owed, with your contact details. Untick it when you are entering old penalties from records, so borrowers are not emailed about old charges. If a borrower has no email address, the box is greyed out and says so. |

---

## 6. Reports and downloads

| What | Before | After | Date |
|---|---|---|---|
| **Admin "Download PDF" on Reports** | It did nothing. The server failed silently. | Works. The same problem was also fixed for other downloads built "on the fly". | 17 Oct |
| **Report date filters** | The date filters did not change the table, the totals or the downloads. | They apply everywhere on the page. | 17 Oct |
| **Overdue-by-days figures and the Disbursed column** | The "days overdue" cards always showed 0, and the Disbursed column was wrong. | Correct. The page was redesigned with a clearer layout (money in and out, overdue by age, easier filters). If the loan list fails to load it now **says so** instead of showing "0 loans". | 17 Oct |
| **Filters on admin, HR and finance pages** | Several did not work. | They work. | 17 Oct |
| **Sorting** | Not possible in the Reports loans table. | Click a column to sort across the whole list (a sort menu on phones). | 22 Oct |
| **Repayment PDF for HR (Nakama and Ideon)** | HR received an older, plainer layout than the admin's. The admin's own report spilled onto extra pages from about 10 loans. | Both use the admin layout, and the report **always fits on one page**. | 21 Oct |
| **HR repayment Excel** | "All months" failed for Nakama and Ideon. | Works. The month defaults to the current month. The title shows the month. | 21 Oct |
| **Repayment reports for other companies** | HR and finance staff of companies other than Nakama and Ideon were not set up for them. | Any company's staff can download their own company's report. | 21 Oct |
| **A failed download** | A vague "Failed to download". | Shows the real reason (for example "no loans due this month"). | 21 Oct |

---

## 7. Emails the platform sends

| What | Before | After | Date |
|---|---|---|---|
| **Forgot password** | The page said "we've sent you a new password", but nothing was sent and there was no way to set a new one. | A real **reset link** is emailed. It works once, lasts 1 hour, and opens a page to choose a new password. It gives the same answer whether or not the email exists. | 21 Oct |
| **HR is told about a new application** | The 15 October update did not include this, so HR received no email. | The company's HR staff and its HR address are emailed with a link. The applicant is never emailed about their own application. **Personal** applications go to `hr@leocapinvest.co.ke`. | 21-22 Oct |
| **Finance is told when HR staff apply** | Nobody was told. | Finance staff of that company are emailed. If the company has none, the Leocap team is emailed with a link to the admin page. | 22 Oct |
| **The sending mailbox** | The old sender could not log in to the mail server, so no email could leave. | A new mailbox, `notifications@leocapinvest.co.ke`, is set up and works. | 21 Oct |
| **Emails leaving reliably** | Emails could sit unsent for minutes, until another visitor used the platform. | They are sent as part of the same request, so they leave straight away. | 22 Oct |
| **"Your loan is fully repaid"** | Only one of the five "mark as paid" routes sent it, in a rough format, before saving. | **Every** way of marking a loan paid emails the borrower once, after it has been saved. | 22 Oct |
| **Document rejected and reminder emails** | These never actually sent (a bug). | They send. | 21 Oct |
| **A record of every email** | Nothing recorded whether an email had gone. | Each email has an audit line: who it went to (partly hidden), why, whether it worked, and the mail server's receipt number. Search "Emailed" in Audit Trails. | 22 Oct |
| **Penalty notice to the borrower** | Not applicable. | See 5.4. | 25 Oct |

---

## 8. Security and privacy

These weaknesses were found by reviewing the program, not because of a reported incident. All are closed.

| What | Before | After | Date |
|---|---|---|---|
| **Changing any loan's figures** | Any signed-in person could change any field of any loan. | Staff only. | 15 Oct |
| **Approving, rejecting, disbursing, deleting loans** | Any signed-in applicant could do this to **anyone's** loan, and could read anyone's application. | Approve and reject: staff. Disburse and delete: admins only. An applicant sees only their own loans. | 19 Oct |
| **Creating or removing admin accounts** | Anyone could create an admin account. Any signed-in person could delete or change an admin. | Only admins can create or change admin accounts. | 19 Oct |
| **Borrowers' documents (ID, KRA, payslips)** | Any signed-in person could download or delete anyone's documents. | Only the owner, an admin, or HR or finance of the same company. | 19 Oct |
| **The daily reminder check** | Open to anyone on the internet. | Needs a secret key (Section 4). | 19-21 Oct |
| **Test pages** | A test page could create an admin sign-in without a password. | Locked. (The live server did not have them.) | 19 Oct |
| **Sign-up** | The sign-up form could be edited to register as HR, finance or admin. | Everyone signing up becomes an applicant. Only a signed-in admin can create HR or finance staff. | 19 Oct |
| **Public company list** | Anyone could see each company's bank account and fee rates. | Only the names are public. | 19 Oct |
| **Uploaded file names** | A crafted name could save a file outside its folder. | Files are saved safely by number, not by name. | 21 Oct |
| **Editing your own profile** | A profile save could also change your type, loan limit, interest rate or status. | A profile save changes only profile details. | 21 Oct |
| **Sign-in cookie and links** | Actions that change data could be triggered by simply opening a link. | They need a proper request, and the sign-in cookie is stricter. | 21 Oct |
| **Password reset** | A non-working stub (Section 7). | Secure single-use link. | 21 Oct |
| **Old leftover code** | Leftover pages from an earlier system, including a fake sign-in, and detailed logging in the browser that could include a sign-in token. | Removed. | 21 Oct |
| **Super admin address** | The pages checked for `admin@leocapinvest.com`. The real super admin is `admin@leocapinvest.co.ke`. | Corrected, so the rule that only the super admin can remove admins now works. | 22 Oct |

---

## 9. HR, finance and companies

| What | Before | After | Date |
|---|---|---|---|
| **Company choice at sign-up** | The form silently pre-selected the first company, so people could be registered under the wrong one. "Personal" appeared twice, and deactivated companies were offered. | Starts empty, you must choose, only active companies are listed. | 19 Oct |
| **A loan's company** | The employer typed on the form replaced the company. | The company is always the one chosen at sign-up. The typed employer is kept separately. Dashboards group correctly. | 17 Oct |
| **HR and finance for any company** | Only Nakama and Ideon staff had a proper portal. Staff of any other company were sent to the wrong one. | Every company's HR and finance staff get their own portal, with their company's name and only their company's data. | 21 Oct |
| **HR and finance lists** | "My Applications" and "HR Loans" were always empty, names showed as "Unknown", and one page crashed. | They show real loans and names. | 21 Oct |
| **"Amend Amount" buttons** | They did nothing (the feature did not exist). | They work. Rules: not your own loan, not a same-role colleague's, only while the loan is awaiting review, within the borrower's loan limit. Fees follow the loan rules, the status becomes "Amended", and everything is recorded. | 21 Oct |
| **Fake sign-in pages** | `/login/hr` and `/login/finance` never signed anyone in. The admin page showed admin screens (no data) for the old super-admin address with any password. | Removed. There is one proper sign-in for applicants and staff, and one for admins. | 21 Oct |
| **HR and finance profile** | Saving worked, but then an error message appeared. Staff of other companies could never reach 100% complete. | Saves cleanly. The same rules apply to every company. | 21 Oct |

---

## 10. Applicants and their accounts

| What | Before | After | Date |
|---|---|---|---|
| **9-digit ID numbers** | Refused ("must be 7-8 digits"). | Accepted: 7 to 9 digits. | 19 Oct |
| **Loan limit** | No screen to set one. | On an applicant's page an admin can set a **Loan Limit (KES)**. Leave it empty for no limit. An application above the limit is refused with a message naming the limit. | 21 Oct |
| **Pop-up messages** | **None ever appeared anywhere in the platform**: errors and confirmations were silent. | They appear (top right). | 21 Oct |
| **Uploaded documents and profile save** | Documents were filed by the person's name. | Filed by number. A profile save changes only profile fields. | 21 Oct |
| **Expired sign-in** | A page showed "failed to load" and left you stuck. | You are taken to the sign-in page with a short message. | 17 Oct |
| **Sign-in, forgot password and sign-up pages** | Plain pages, an empty logo slot, errors only after submitting. | A modern look. A switch between "Applicant & staff" and "Admin". Messages appear as you type. A show/hide password button. A caps-lock warning. A password-strength meter. Clear messages. A duplicate email says so plainly. | 22 Oct |
| **Admin sign-in error** | "User not found, please register". | "Invalid email or password. This portal is for admin accounts only." | 22 Oct |

---

## 11. Admin screens: easier, safer, fully recorded

| What | Before | After | Date |
|---|---|---|---|
| **The "Suspend" button on Manage Applicants** | It **permanently deleted** the person and all their loans. | It really suspends. There is also an Active/Suspended switch and a **Reactivate** option. If a person still has unpaid loans, it explains why it cannot proceed. | 22 Oct |
| **Deleting people** | Deleting a person wiped their loans and records. HR could remove staff of any company. | Admins only. A person who has loans **cannot** be deleted (suspend them instead). | 22 Oct |
| **Removing staff and admins** | An admin could remove the super admin or themselves. Only the browser stopped this. | Only the super admin can remove admins. Nobody can remove themselves or the super admin. The server enforces it. | 22 Oct |
| **Deleting statements and saved emails** | Any signed-in person could. | Admins only, with a confirmation. | 22 Oct |
| **The Audit Trail** | Sign-ins, approvals, deletions and downloads were not recorded. Application changes showed a long code instead of who changed things. Search worked only on the visible page. Logs could be deleted even for yesterday. | Everything meaningful is recorded in plain words (sign-ins, including failed ones, approvals, edits with the old and new value, downloads, emails). Search works across the whole history, and you can filter by "what changed". Logs from the last 30 days cannot be deleted. Deleting a loan keeps a record. | 22 Oct |
| **Admin screen layouts** | Text was cut off. Tables were unusable on phones. Names appeared in mixed capitals. | Every admin screen fits every screen size. Long lists become cards on small screens. Names look consistent. | 22 Oct |
| **Dashboard** | Some figures were cut off. | A slim, compact dashboard with whole-shilling figures that fit. | 22 Oct |
| **Manage Applicants** | The page buttons did not really page. | Paging works. You can sort. | 22 Oct |
| **Uploaded documents on the applicant's page** | Every document showed both **Accept** and **Reject**, even after you had accepted it, and long file names were squeezed down to a few letters. | A document you have accepted shows **Accepted** (with your note) and no buttons; only new documents show Accept and Reject. File names get the full width of the card (up to two lines), with the buttons on their own row below. The review prompts now say what Reject really does: it **deletes the document** and emails the applicant to upload a new one. | 25 Oct |
| **Scrolling on the applicant's details page** | After the statement tool was added (25 Oct), the whole screen could scroll up into blank space, so the content seemed to cut off partway down and the top bar disappeared. On phones, large amounts in the statement totals ran outside their boxes. | The page scrolls only inside its own area, the top bar stays in place, and the totals fit on every screen size, even for amounts in the millions. The same safeguard now protects the HR, finance and applicant portals. | 25 Oct |
| **Financial Analysis page** | Its upload, analysis, chat and PDF buttons contacted the wrong place on the live site. | They work against the right server. A "no transactions" result is shown as a message, not as a corrupt PDF download. | 22 Oct |

---

## 12. Calculators

| What | Before | After | Date |
|---|---|---|---|
| **Amortization calculator** | It crashed after pressing Calculate. The PDF and Excel buttons failed. "Reducing balance" quietly calculated a flat loan instead. A 0% rate or 0% fee was treated as 10% or 3%. The PDF header showed a placeholder address and phone number. | It works. The schedule shows month, due date, principal, interest, payment and balance. Reducing balance is really reducing. A 0% rate stays 0%. Wrong inputs get a clear message. The PDF header carries Leocap's details. | 22 Oct |

---

## 13. The public website

All the **wording is unchanged**; the design, links and readability were improved.

| What | Before | After | Date |
|---|---|---|---|
| **Home page** | A dark, hard-to-read photo banner. Uneven cards. Small text on phones. Several links went nowhere. The contact form's "Send Message" did nothing. | A clean redesign on the Leocap navy. Readable text. Equal-height cards. A step-by-step "How it works". "Apply" goes to registration. The email, phone and address are tappable. "Send Message" opens the visitor's own email program, addressed to you. | 23 Oct |
| **Hero statistics** | A busy boxed strip with icons. | A calm single row of numbers. | 23 Oct |
| **Menu bar** | Basic. | Compact; a thin progress line; a **Dashboard** button when you are signed in; on phones, a full menu and a one-tap **call** button. | 23 Oct |
| **Footer** | A plain block with dead links. | Working links, **Apply Now / Sign In** buttons, and a **back-to-top** button. | 23 Oct |
| **FAQ page** | None. | A new **FAQs** page: search, topics, a checklist of documents for each loan type, a guide to loan statuses, and a link to any single answer. It deliberately quotes **no loan limits, rates or fees** (see Section 15). | 23 Oct |
| **Testimonials** | Three unverified placeholder quotes existed in the program (they were never shown to visitors). | A designed testimonials section is **ready but hidden**. It shows **only real, approved quotes** that you supply. None are shown today. | 23 Oct |
| **Readability** | Some grey text was too faint to read comfortably. | All public and sign-in text was measured and meets the standard readability test (WCAG AA). | 22-23 Oct |

---

## 14. Looks and phone-friendliness

| What | Before | After | Date |
|---|---|---|---|
| **Text on phones** | All text was shrunk too small. | Normal readable size. | 15 Oct |
| **Buttons on phones** | Too small to tap comfortably. | Large enough to tap. | 15 Oct |
| **Home page banner** | Hard to read. | Readable. | 15 Oct |
| **Admin, HR, finance and applicant portals** | Each looked slightly different. Raw status words such as "pending_processing" appeared. Dates were blank on some pages. | One consistent, compact look. One set of status names and colours ("Pending Review", "Disbursed" in blue, and so on). Amounts shown as "Ksh 12,000.00". Dates fill in. | 22 Oct |

---

## 15. Decisions waiting for you

These need your input. Nothing here is broken, but each affects what customers or your accounts see.

| # | The question | Why it matters |
|---|---|---|
| 1 | **What should the public numbers say?** The home page says a Salary Advance is "up to 50% of net salary", and a Personal Loan has "1 month tenure" and is "up to KES 500,000". The platform's own calculator gives about **30%** of average salary for a salary advance, the personal loan form offers a 1-month or a 6-month option, and no KES 500,000 limit exists in the program. | Customers could be promised more than the platform will offer them. The FAQ avoids numbers until you decide. |
| 2 | **Real testimonials.** Send quotes with the person's permission, and they can be added. | The section stays hidden until then. |
| 3 | **Licence or registration line in the footer.** Add a registration number if the business has one. | Lenders are often expected to show it. |
| 4 | **Nakama repayment reports show two different bank accounts.** The report HR downloads names a different account holder than the report the admin downloads. This was kept as it was. | Borrowers could be told to pay the wrong account. Please confirm which is correct. |
| 5 | **Should interest be chargeable on a delinquent loan?** It is blocked today because the 15% fee was already added. | Your rule decides whether it is allowed. |
| 6 | **Penalties and fees in your income figures.** See Section 16, last point. | Your income and "expected back" totals leave them out. |
| 7 | **Can HR or finance approve their own loan?** Today they can. | A separation-of-duties question. |
| 8 | **The contact form** opens the visitor's own email program. A form that delivers straight to your inbox would need more setup. | A visitor without an email program configured sees nothing happen. |
| 9 | **A hidden marker in every page.** The platform places a coded copy of the signed-in person's email, role and date in the page. The key to decode it is inside the site, so anyone who looks can read it. | Keep it (and tell us what it is for), or remove it. |
| 10 | **Admin accounts have no "forgot password" email.** Only applicants, HR and finance do. | An admin who forgets must be reset by a developer. |
| 11 | **Home-page photo** is borrowed from an image website rather than stored with the platform. | It could disappear or change. (Parked for later.) |
| 12 | **Server tidy-up:** copies kept for safety (database tables starting `bak_2026`), a few leftover test files, and a recommended extra protection on the hosting account for configuration files. | Housekeeping, not urgent. |

---

## 16. Still as before (known limits)

These were looked at and **left unchanged on purpose**. They are listed so you know about them.

- **"Mark selected as paid"** (the tick-box action on All Applications) credits the loan's **full repayment amount** and does not adjust the balance of a part-paid loan. The two single-loan and company-month routes do it correctly.
- **A borrower's "Amount Paid"** counts only payments recorded against that loan. For some older loans, earlier payments may not be linked, so the figure can look lower than what was really paid.
- **New application emails to HR** have been tested and the sending mailbox has been proven (a test email arrived), but a real application notice has not yet been seen arriving in live use. This is parked until you want to check it.
- **Penalties and the 15% collection fee** increase what a borrower owes, but are **not included** in the dashboard's "Interest Income" and "Fee Revenue", nor in a report's "Expected back" figure. They do appear in "Outstanding", the statement and the overdue figures. We can add a separate "Penalties and collection fees" figure if you want one.
- **The old "Reverse transaction" feature** (not shown on any screen) is broken and unused. The new edit and delete tools replace it.
- **Rejecting an uploaded document deletes it for good** (the file and its record) and emails the applicant to upload a new one. There is no "undo"; the prompt now says so.
- **Bulk-uploaded applicants** can use any company code, and any HR user can bulk-create applicants.
- **The server does not yet refuse to start without a proper secret key.** The live server does have one.

---

## 17. Change log by date

Newest first. When a change is made, a new line goes at the top.

| Date | What changed | Section |
|---|---|---|
| **25 Oct** | Borrower is emailed about a penalty (with an opt-out tick box). **Add Penalty** on the loan page. **Delete a wrong line** from a statement. **Applicant Statement** with filters, totals and a PDF that follows them. **Overdue card** is clickable. Fixed a scrolling fault on the applicant details page. **Edit a statement line** (amount, date, description). Uploaded-document cards fixed. | 5, 7, 11 |
| **23 Oct** | Public website redesign (same wording): menu bar, footer, home page, calmer statistics. New **FAQ** page. Testimonials section built (hidden until real quotes). | 13 |
| **22 Oct** | New sign-in, forgot-password and sign-up pages. Safer delete buttons (the old "Suspend" really suspends). Full audit trail. Every email recorded. Calculators fixed. Month-by-month "Mark Paid" with preview. "Fully repaid" email on every route. Finance and team notices. Admin, HR, finance and applicant portals made consistent and phone-friendly. | 4, 7, 10, 11, 12, 14 |
| **21 Oct** | "Mark as Paid" fixed. Delinquent loans handled. **Daily reminders switched on.** Forgot password works. HR told of new applications. Server sets the starting interest rate. **Loan limit** added. Pop-up messages work. Security fixes (profile, uploads, cookie, links). HR and finance work for any company. "Amend Amount" built. HR report PDF and Excel fixed. | 4, 7, 8, 9, 10 |
| **19 Oct** | Security round (approving or deleting others' loans, admin accounts, documents, test pages, sign-up role, public company list). Sign-up company field fixed. 9-digit ID numbers accepted. | 8, 9, 10 |
| **17 Oct** | Reports redesigned and fixed (PDF download, filters, overdue figures). Company shown on loans corrected, with a data fix. Expired sign-in handled. | 3, 6, 9, 10 |
| **15 Oct** | Platform put online with automatic publishing. Database upgraded. Interest and balances kept in step. Statements fixed. **Existing records corrected** from your spreadsheet. Phone text, buttons and banner fixed. | 1, 2, 3, 14 |

---

## About this document

This file is kept up to date as the platform changes. Whenever something is changed, the matching table gets a new row, the change log (Section 17) gets a new line at the top, and the "Last updated" date above is changed. A PDF copy (`PLATFORM_IMPROVEMENTS.pdf`) is made again from it each time. If anything here does not match what you see on the platform, please say so and it will be corrected.
