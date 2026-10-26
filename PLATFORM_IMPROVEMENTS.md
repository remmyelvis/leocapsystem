# Leocap Invest Platform: What Has Changed

**For:** Elvis Karemi  
**Covers:** 15 October 2026 to today  
**Last updated:** 27 October 2026

This document lists, in plain language, every improvement and correction made to the loan platform since work began on 15 October 2026. For each change it shows what things were **like before** and what they are **like now**.

---

## How to read this document

- Changes are grouped by topic (money, reports, emails, and so on). Pick the topic you care about; you do not need to read it in order.
- Every table has the same columns: **What** (the change), **Before**, **After**, and **Date**.
- Dates are 2026. A date is the day the change was made.
- Everything below has been **published to the live platform**.
- Section 15 lists **decisions that are waiting for you**. Section 16 lists things that are **still as they were** (known limits), so nothing is hidden.
- Section 18 describes the **demo version** for showing the platform to prospective clients, and what keeps it safe.

### Words used in this document

| Word | What it means |
|---|---|
| **Balance owed** | What a borrower still has to pay on a loan right now (the system calls it the "outstanding balance"). |
| **Statement** | The list of everything charged to and paid on a borrower's loans: the loan, its interest, payments, fees. Each line shows the balance after it. |
| **Delinquent** | A loan that is overdue by more than 7 days. The platform adds a 15% collection fee, once, and a 10% late-payment charge too when the loan was applied for from 26 Oct 2026. |
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
| 15% collection fee and 10% late-payment charge (after 8 days overdue) | Goes **up** by 15% **and** 10% of what is still owed (25% in all, both worked out on the same balance), once. They are two separate lines on the statement. The 10% applies only to loans applied for from 26 Oct 2026; older loans get the 15% alone. |
| Penalty added | Goes **up** by the penalty amount |
| Marked as paid | Goes to **zero** |
| A wrong payment, interest, fee or penalty is deleted from the statement | Goes back to what it would have been, and the lines after it are corrected |

---

## The short version

1. **The platform is online, up to date, and easy to update.** Each approved change is published automatically, and can be undone.
2. **Loan money is calculated consistently.** Balances, interest, payments and statements now agree with each other, and interest follows your rule: it is charged on what is still owed.
3. **Existing records were corrected** (Section 3), with copies kept of everything that was changed.
4. **"Mark as Paid" works.** It crashed before. Clearing a whole company's month is now previewed, recorded and emailed.
5. **Late loans are handled.** A daily check sends reminders and applies the 15% fee and the 10% late-payment charge, and delinquent loans can be paid, defaulted and escalated.
6. **Reports and downloads work.** The PDF download did nothing before.
7. **Emails are sent and tracked.** New applications, finance notices, "fully repaid", password resets and penalties. Every email is recorded.
8. **Serious security gaps were closed.** For example, any signed-in applicant could approve or delete anyone's loan.
9. **The admin screens are safer and easier.** The old "Suspend" button deleted people and their loans. It now only suspends.
10. **New tools for you:** a clickable **Overdue** card, a **searchable applicant statement** with a per-line delete, and **Add Penalty**.
11. **The public website was redesigned** (same wording), with a new FAQ page.
12. **You can now edit the words of the public website yourself** (Section 13.1): contact details, an announcement banner, the home page headings, hero numbers, product cards and "How it works" steps, testimonials, the FAQs and the Privacy Policy, with a private draft, a preview, one-click publishing and a history.
13. **The public website is now ready for search engines and loads faster** (Section 13.2): each page has its own title and description, link previews show a picture, there is a sitemap and a tab icon, and the first download is about a quarter of the size.

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
| **Delinquent loans** | They could not take payments, could not be defaulted or escalated, and were missing from the dashboard and reports. The borrower saw no status. | You can record payments (the loan **stays** delinquent, so the fee and the charge are never added twice). Loans can be defaulted and escalated. They count in the dashboard and reports. The borrower sees "Overdue" and the amount remaining. | 21 Oct |
| **The daily reminder check** | Anyone on the internet could trigger it (it adds fees and emails borrowers). Its emails never actually sent because of a bug. It was not scheduled. | It is protected by a secret key and runs **every day at 6:00 am**. It emails reminders **7 days before the due date, 3 days before, on the due date, and 7 days after**. From the **8th day overdue** it marks the loan delinquent and adds the 15% collection fee and the 10% late-payment charge on what is owed. | 21 Oct |
| **10% late-payment charge** | A loan that went delinquent (8 or more days overdue) was charged only the 15% collection fee. | The same daily check now also adds a **10% late-payment charge**. It is worked out on the **same balance** as the 15% (so a loan with KES 10,000 still owed goes up by 1,500 and 1,000, to 12,500), is written as its **own line** on the statement ("Late Payment Charge", next to "Delinquency Collection Fee"), and is included in the delinquency email, which now states both amounts and the new balance. The 7-days-overdue warning email mentions it too, and the borrower's loan page says a charge has been added. Each loan is charged **once**. Because they are separate lines, one can be corrected or deleted without the other (see 5.3). **Only loans applied for from 26 Oct 2026 are charged the 10%**, because those are the borrowers who accepted the updated terms (see below); older loans, and loans that were already delinquent, get the 15% alone as before. The loan's repayment amount is unchanged. | 25 Oct |
| **Loan terms now state the 10% late-payment charge** | The terms a borrower accepts when applying (Salary Advance, HR, Finance and Personal Loan forms) did not mention it. | Under "Default", each now has a new line: "A late-payment charge of 10% of the outstanding balance may be charged after 7 days of default." The loan agreement printed in the debt dossier shows that line **only for loans applied for from 26 Oct 2026**, so an older loan's paperwork still shows exactly what that borrower accepted. | 25 Oct |
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
| **Demand letter (inside the debt dossier)** | It showed 0.00 for the rescheduling fee and the debt collection fee even on loans the platform had charged, and it demanded the loan's full repayment amount, so the fees were missing from the total and payments already made were ignored. Its small table did not add up either. | It now demands **what is really owed today**: the repayment amount, plus the collection fee, the late-payment charge and any penalties, less payments received. The fees are taken from the borrower's statement, and each is listed **only if it was actually charged** (no more "fee of 0.00"). The table lists each amount, shows payments as a minus line, and always adds up to the total demanded. Old loans that already carried a fee amount keep it. | 25 Oct |
| **Report date filters** | The date filters did not change the table, the totals or the downloads. | They apply everywhere on the page. | 17 Oct |
| **Overdue-by-days figures and the Disbursed column** | The "days overdue" cards always showed 0, and the Disbursed column was wrong. | Correct. The page was redesigned with a clearer layout (money in and out, overdue by age, easier filters). If the loan list fails to load it now **says so** instead of showing "0 loans". | 17 Oct |
| **Filters on admin, HR and finance pages** | Several did not work. | They work. | 17 Oct |
| **Sorting** | Not possible in the Reports loans table. | Click a column to sort across the whole list (a sort menu on phones). | 22 Oct |
| **Repayment PDF for HR (Nakama and Ideon)** | HR received an older, plainer layout than the admin's. The admin's own report spilled onto extra pages from about 10 loans. | Both use the admin layout, and the report **always fits on one page**. | 21 Oct |
| **HR repayment Excel** | "All months" failed for Nakama and Ideon. | Works. The month defaults to the current month. The title shows the month. | 21 Oct |
| **Repayment reports for other companies** | HR and finance staff of companies other than Nakama and Ideon were not set up for them. | Any company's staff can download their own company's report. | 21 Oct |
| **A failed download** | A vague "Failed to download". | Shows the real reason (for example "no loans due this month"). | 21 Oct |
| **Dates on the account statement PDF** | On some statements the DATE column of the transaction table printed "nan" instead of a date. It happened when an applicant's first ledger lines were typed in from your spreadsheet (stored without fractions of a second) and later lines were recorded by the platform (stored with them): the later lines lost their date, could be put in the wrong order, and a line not tied to a loan could be left out entirely. Two applicants were affected on 26 Oct, four lines in all. | Every date prints correctly, in order, and no line is dropped. A date that is truly missing would print "N/A", never "nan". Nothing in the stored data was wrong, so nothing needed correcting: download the statement again. | 26 Oct |

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
| **Out-of-date building blocks** | Zod, Vite and follow-redirects (and about sixty packages they use) had published security fixes that were not installed. | Updated. The packages that reach visitors show 0 known problems; three moderate findings remain in a build tool (Tailwind), which would need a major upgrade and cannot affect visitors. | 26 Oct |
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
| **Who may approve or reject a loan** | HR and finance could approve or reject any loan of their company, **including their own** or a colleague's of the same role. Only "Amend Amount" had a rule. | The same rule now covers approve and reject (and the general amend tool): nobody decides their own application, **HR handles applicants' and finance staff's loans, finance handles applicants' and HR staff's**. The buttons are hidden on a loan the person may not decide, with the reason shown, and the server refuses the request too. Admins can still decide any loan, so nothing gets stuck. | 25 Oct |
| **Rejection reasons typed by HR and finance** | The reason typed on the HR and finance screens was **not saved**; the history only said "Rejected". | It is saved in the loan's history, as it already was for admins. | 25 Oct |
| **Finance's "HR Loans" page** | Offered only "Amend Amount" yet said "Awaiting your decision: approve, reject or amend". | Its **Review** button opens the full review page, where finance can approve, reject or amend an HR staff member's loan. The link in the "new loan application" email that finance receives when an HR user applies goes to the same page (the old address still works, so emails already sent keep working). | 25 Oct |
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
| **Borrower dashboard: "Next due date"** | Showed the earliest due date of **all** the borrower's loans, paid ones included (for example a date in May for a loan that falls due in November). | Shows the earliest due date among the loans still owed. | 25 Oct |
| **Loan type on a borrower's loan page** | Called every company's salary advance "Ideon Salary Advance". | Says "Salary Advance", and names the company only for Ideon and Nakama (as the borrower's list already did). | 25 Oct |

---

## 11. Admin screens: easier, safer, fully recorded

| What | Before | After | Date |
|---|---|---|---|
| **The "Suspend" button on Manage Applicants** | It **permanently deleted** the person and all their loans. | It really suspends. There is also an Active/Suspended switch and a **Reactivate** option. If a person still has unpaid loans, it explains why it cannot proceed. | 22 Oct |
| **Deleting people** | Deleting a person wiped their loans and records. HR could remove staff of any company. | Admins only. A person who has loans **cannot** be deleted (suspend them instead). | 22 Oct |
| **Removing staff and admins** | An admin could remove the super admin or themselves. Only the browser stopped this. | Only the super admin can remove admins. Nobody can remove themselves or the super admin. The server enforces it. | 22 Oct |
| **Deleting statements and saved emails** | Any signed-in person could. | Admins only, with a confirmation. | 22 Oct |
| **Delete Application (Danger Zone on a loan's page)** | The button did nothing useful: the server refused every delete with an error ("Request failed with status code 500"), because the loan's statement lines still pointed at it. Nothing was lost. | It works for a loan that was **never paid out** (pending, amended, rate set or accepted, approved, declined): the loan, its documents, emails, history and statement lines are removed, the borrower's profile documents stay, and a copy of the loan, its history and its statement lines is kept in the system log. A loan that was paid out (disbursed, defaulted, written off, or with any payment) **cannot be deleted**: the Danger Zone says why, and a wrong line is corrected on the borrower's statement instead. | 25 Oct |
| **The Audit Trail** | Sign-ins, approvals, deletions and downloads were not recorded. Application changes showed a long code instead of who changed things. Search worked only on the visible page. Logs could be deleted even for yesterday. | Everything meaningful is recorded in plain words (sign-ins, including failed ones, approvals, edits with the old and new value, downloads, emails). Search works across the whole history, and you can filter by "what changed". Logs from the last 30 days cannot be deleted. Deleting a loan keeps a record. | 22 Oct |
| **Admin screen layouts** | Text was cut off. Tables were unusable on phones. Names appeared in mixed capitals. | Every admin screen fits every screen size. Long lists become cards on small screens. Names look consistent. | 22 Oct |
| **Dashboard** | Some figures were cut off. | A slim, compact dashboard with whole-shilling figures that fit. | 22 Oct |
| **Manage Applicants** | The page buttons did not really page. | Paging works. You can sort. | 22 Oct |
| **Date of disbursement on the applicant's page** | The Loan Applications list on an applicant's page showed the amount and status of each loan, but not when it was paid out. | Each loan that has been disbursed now shows **Disbursed: 10 Oct 2026**, in the viewer's own local time. The date comes from the loan's change history (the moment the loan was moved to Disbursed; saving it again later does not change it). Loans that were disbursed before the platform kept this history show "date not recorded" rather than a guess, with an **Add date** button next to it (see the next line). | 25 Oct |
| **Sorting the tables** | Most lists were fixed newest-first with no way to reorder them. Manage Applicants had a click-to-sort that could not be used from the keyboard, started "Joined" oldest-first and did nothing on phones. | Click a column heading to sort (click again to reverse); on a phone use the **Sort** menu above the list. It sorts the **whole list across all pages**, never just the page on screen, and anything blank (a loan with no due date) always goes last. Done for: **All Applications** (Applicant, Amount, Status, Repayment, Applied, Due), **Manage Applicants** (name, email, ID number, type, joined), the **HR and finance applications** lists, the **Loan pipeline** on the dashboard, the **transactions** on Financial Analysis (date, money in, money out, to find the biggest ones), and the **audit logs** (oldest first as well as newest first). Left alone on purpose because they are tiny or the order is the point: a borrower's own loans, "My loans", Companies, the repayment schedule, the statement. | 27 Oct |
| **Status sorts by what needs you first** | (Reports sorted status A to Z: Approved, Disbursed, Pending...) | Status and Repayment sort in the order of the work: overdue loans first (Delinquent, Escalated, Defaulted), then loans waiting for a decision (Pending), then Approved (to pay out), then loans being repaid, then Paid, then closed ones (Written off, Declined). Reports uses the same order now. | 27 Oct |
| **A Due column on All Applications** | The due date was only on the dashboard and in Reports. | Shown for loans that are still being repaid (red when overdue); a repaid loan shows a dash. Sort by Due to see what is due soonest. The dashboard's Loan pipeline shows its due date the same way (it used to show an old due date even for repaid loans). | 27 Oct |
| **Entering or correcting a disbursement date** | There was no way to give an older loan its disbursement date, or to fix a wrong one. | Next to each disbursed loan's date, a small **pencil** (or **Add date** where none is recorded) opens a short form: pick the date, add a reason if you like, and save. The date you enter **takes the place** of the one the platform recorded, and the card says "Entered by hand" when you rest the pointer on it. **Remove the date I entered** brings the platform's own date back (or "date not recorded"). Every entry, correction and removal is written in the loan's change history with who did it, and in the audit trail. A date in the future is refused. A date earlier than the day the loan was applied for on the platform shows a gentle note (that is normal for loans from before the platform) and can still be saved. It is **a record only**: it does not change the loan's balance, interest, due date, reminders or reports. | 25 Oct |
| **Uploaded documents on the applicant's page** | Every document showed both **Accept** and **Reject**, even after you had accepted it, and long file names were squeezed down to a few letters. | A document you have accepted shows **Accepted** (with your note) and no buttons; only new documents show Accept and Reject. File names get the full width of the card (up to two lines), with the buttons on their own row below. The review prompts now say what Reject really does: it **deletes the document** and emails the applicant to upload a new one. | 25 Oct |
| **Scrolling on the applicant's details page** | After the statement tool was added (25 Oct), the whole screen could scroll up into blank space, so the content seemed to cut off partway down and the top bar disappeared. On phones, large amounts in the statement totals ran outside their boxes. | The page scrolls only inside its own area, the top bar stays in place, and the totals fit on every screen size, even for amounts in the millions. The same safeguard now protects the HR, finance and applicant portals. | 25 Oct |
| **Financial Analysis page** | Its upload, analysis, chat and PDF buttons contacted the wrong place on the live site. | They work against the right server. A "no transactions" result is shown as a message, not as a corrupt PDF download. | 22 Oct |
| **"Score Factors" on the Financial Analysis page** | The box that is meant to explain a credit score (for example "High Fuliza dependency -50") was always empty, so the page showed a score with no reasons. The AI summary also never received those reasons. | The reasons now show next to the score, and the AI summary is given them. | 25 Oct |

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
| **Testimonials** | Three unverified placeholder quotes existed in the program (they were never shown to visitors). | A designed testimonials section is **ready but hidden**. It shows **only real, approved quotes**, which you add yourself under **Site content** (Section 13.1). None are shown today. | 23 Oct |
| **Editing the words** | Every word, phone number and email on the public pages was fixed in the program: a change meant asking a developer. | An admin can edit the contact details, an announcement banner, the home page text (opening section, loan products, how it works, section headings), the testimonials, the FAQs and the Privacy Policy on a new **Site content** screen (Section 13.1). Until you publish something, every page says exactly what it said before. | 25 Oct |
| **Readability** | Some grey text was too faint to read comfortably. | All public and sign-in text was measured and meets the standard readability test (WCAG AA). | 22-23 Oct |


### 13.1 Editing the public pages yourself (Admin menu, **Site content**) (25 Oct)

An admin can change some of the words on the public pages without a developer. **Nothing a visitor sees changes until you press Publish.**

| Section | What it controls |
|---|---|
| **Contact details** | The email, phone numbers, address and map link. They are used in the page header, the footer, the home page contact section, the sign-in and sign-up pages, and the FAQ answer "How do I reach you?". Change them once and all of those follow. |
| **Announcement banner** | A coloured notice across the top of the home and FAQ pages (for example planned maintenance), with an optional link. Three colours: information, warning, good news. |
| **Testimonials** | Client quotes. A quote is shown to visitors **only when you tick that the client agreed to be quoted by name**; quotes without the tick stay private and never leave the server. The section stays hidden until at least one is ticked and published. |
| **Home page: opening section** | The badge, the two headline lines, the introduction (with bold words), the two button labels and the **three numbers** (for example 500+ clients served). The glass card beside the headline repeats the first loan product and the three step names, so it follows those. |
| **Home page: loan products** | The Products headings and **one to three cards**: title, small heading, description, up to five points, and the **Most Popular** and **Coming Soon** switches (only one card can be Most Popular). |
| **Home page: how it works** | The three steps (name and text) and the "Ready to get started?" band under them. |
| **Home page: other headings** | The headings of the Contact and Testimonials sections. |
| **Privacy policy** | Every section of the policy: add, remove, reorder and edit them. Section numbers follow the order. The text has bold, bullet and numbered lists, small headings and a boxed block (used for the Data Protection Officer's details); the editor can fill in the current email, phone numbers and address for you. Buttons are not allowed in it. |
| **FAQs** | Edit, add, remove and reorder questions; choose the topic and which ones are "popular". Answers can have bold text, links, numbered steps, bullet points and buttons, with a toolbar and a live preview. Two ready-made pieces (the document checklist and the loan-status guide) can be added to an answer and always follow the platform's real rules. |

**How it works**

1. Open a section and change it. **Save draft** keeps it private.
2. **Preview on the site** opens the real page with your draft in a new tab (a dark ribbon says you are previewing; only you see it). **Exit preview** ends it.
3. **Publish** makes it live. Visitors see it within about a minute.
4. **History** lists every published version, who published it and when. **Restore as draft** brings an old one back (it goes live only when you publish it). **Discard changes** throws away an unpublished draft. **Reset to built-in text** returns that section to what the program shipped with.
5. Every save, publish, discard and reset appears in the **Audit Trail** in plain words.

**Safety.** The editor accepts plain text only, never code. Links may point to a page on this site or start with https://, mailto: or tel:; anything else is refused with a plain explanation, and so is a missing answer, a duplicate link name and so on. If two admins edit the same section, the second to save is told and must load the latest version. Unsaved edits are also kept in the browser tab, so clicking to another admin screen does not lose them, and closing the tab warns first. It is **not available in the demo**.

**Not editable here:** where buttons and links go, pictures (including the home page photo), colours and layout, the wording of the menu and footer, the contact form, and the loan terms on the application forms.

**What stays exactly the same:** with nothing published, every public page was checked against the pages as they were before this change. The FAQ page, the header, the footer and the home page (opening section, products, how it works, contact) are identical down to the last character. The Privacy Policy has exactly the same words, sections and lists in the same order; its spacing is now uniform instead of hand-tuned paragraph by paragraph, so the page is about 1% shorter and one line, "We do not sell personal data to third parties.", is slightly bolder. Two differences are invisible to visitors: the plain-text copy of three FAQ answers that search engines read ("How do I apply?", "How do I track my application...", "I forgot my password") is now built from the answer itself, so its wording is slightly different.

**Good to know.** The hero card, the first product and the three step names are one set of words, so changing one changes the others. Numbers appear in more than one place on purpose (for example "500+" in the opening section and in the "Ready to get started?" band): change them together. Nothing checks a figure against the calculators.

### 13.2 Search engines and speed (26 Oct)

The public pages are Home, FAQ, Privacy Policy, Create account and Sign in. Everything below changes how they are found and how fast they open. **The wording and the look are unchanged** (the home page photo was compared with the old one: the difference is below what the eye can see).

| What | Before | After | Date |
|---|---|---|---|
| **Page titles and descriptions** | Every page was called "Leocap Loan App" and had no description, so Google had to guess what to show. | Each public page has its own title and a short description (for example "Salary Advance & Personal Loans in Kenya \| Leocap Invest"). They quote **no loan limits, rates or fees** (decision 1). The admin, HR, finance and applicant portals keep the old title. | 26 Oct |
| **Link previews** (WhatsApp, Facebook, LinkedIn, X) | A shared link showed only "Leocap Loan App". | It shows the page title, the description and a picture with the logo. | 26 Oct |
| **Files search engines look for** | The server answered "robots.txt" and "sitemap.xml" with the app's own page, which search engines cannot read. | Both files exist. The sitemap lists the five public pages; the robots file asks engines to stay out of the admin, HR, finance and applicant areas and the password pages. | 26 Oct |
| **Tab icon** | None (browsers showed a blank icon, and Google could not show your logo next to the result). | The Leocap mark, in the sizes browsers, phones and Google ask for. | 26 Oct |
| **One address for the site** | leocapinvest.co.ke, www.leocapinvest.co.ke and app.leocapinvest.co.ke all showed the same pages, so search engines could list three copies. | Each page names **leocapinvest.co.ke** as its address. The server sends www to it, and marks the app. copy "do not list". | 26 Oct |
| **Business details for search engines** | None. | The home page tells search engines your name, email, phone numbers and address, taken from **Site content > Contact details**, so an edit there is followed. No ratings, reviews or prices are claimed. | 26 Oct |
| **Pages that should not be listed** | Nothing told search engines to skip the sign-in areas, password pages or the "page not found" screen. | They are marked "do not list". | 26 Oct |
| **Speed: what a visitor downloads first** | One 1.4 MB program file holding every screen, including the admin, HR, finance and applicant screens. | The home page downloads only what it needs (about a quarter of the size). Each other screen is fetched when it is first opened, and the sign-in and apply pages are fetched quietly while the home page is being read. | 26 Oct |
| **Speed: the home page photo** | A 1 MB picture fetched from another company's website (Unsplash) at full size, even on phones, under a dark layer that hides most of it. | The same photo, kept on your own site and made smaller: 42 KB for phones and tablets, 171 KB for computers. | 26 Oct |
| **Speed and privacy: the font** | The text font was fetched from Google before the page could appear. | The same font, kept on your own site and loaded at once (so a visitor's browser no longer contacts Google for it). The Google map in the Contact section still does, as before. | 26 Oct |
| **Speed: the logos** | The square logo was 4167 by 4167 pixels (158 KB) and the header logo 39 KB. | 14 KB each, same size on screen. | 26 Oct |
| **Open tabs after an update** | (New safety net.) A tab opened before an update would have asked for a screen file that no longer exists and shown a blank page. | The page reloads itself once to pick up the new version; if the site is really unreachable it shows a short message with a **Reload** button instead of a blank screen. | 26 Oct |

**Measured on the live site** (Google's Lighthouse tool, a simulated mid-range phone on slow 4G, three runs after against one run before): search score **83 to 100**; performance score **64 to 79-81**; first content on screen **4.4 s to 2.8-3.0 s**; the main headline **5.5 s to 3.8-4.0 s**; usable **7.6 s to 3.9-4.0 s**; data downloaded **1,857 KB to 780 KB**; accessibility and best practices stay at 100. **How to read this:** Lighthouse still rates the main headline at about 4 s in its simulation, above Google's 2.5 s "good" mark. In a real browser slowed down the same way, on a test copy, it measured **1.8 s** (2.4 s before). Drawing the page in advance (decision 19) would make real visitors faster still but would not change Lighthouse's simulated number. **Not measured:** real visitors (Google's Chrome UX Report needs more traffic than a new site has), and ranking position, which cannot be measured from here.

**Server rules (published 26 Oct, after running on the demo site first).** The main address, www and app. share one folder of server rules (a small file called .htaccess). Checked on the live site: www and http go to https://leocapinvest.co.ke; app. pages carry a "do not list" mark; the program files are kept by browsers for a year while pages are always re-checked; each public page answers with its own title; a program file that no longer exists gives a real 404; the rules file itself stays hidden. If a rule ever misbehaves, the previous four-line rule can be put back in cPanel in a minute.

**Security check done at the same time.** Updated Zod, Vite, follow-redirects and about sixty other packages to their fixed versions: the packages that reach visitors now show **0** known problems. Three moderate findings remain in a build tool (Tailwind) and need a major upgrade; they cannot affect visitors.

**Left for you** (they need your accounts or facts, so we cannot do them): see decisions 17 to 19 in Section 15.

---

## 14. Looks and phone-friendliness

| What | Before | After | Date |
|---|---|---|---|
| **Text on phones** | All text was shrunk too small. | Normal readable size. | 15 Oct |
| **Buttons on phones** | Too small to tap comfortably. | Large enough to tap. | 15 Oct |
| **Home page banner** | Hard to read. | Readable. | 15 Oct |
| **Hover hints on icons and buttons** | The small hints that appear when you rest the pointer on an icon came from the web browser: they took over a second to appear, looked plain, did not show when using the keyboard, and did not appear on greyed-out buttons. | One consistent hint style everywhere (dark navy with a small arrow). Hints appear after about a third of a second, and straight away when you move from one icon to the next. They also appear when you tab to a button with the keyboard, work on greyed-out buttons, and are never cut off at the edge of the screen. Names and emails that are shortened with "…" show their full text on hover, and only when they really are shortened. The collapsed side menu names each destination. | 25 Oct |
| **Admin, HR, finance and applicant portals** | Each looked slightly different. Raw status words such as "pending_processing" appeared. Dates were blank on some pages. | One consistent, compact look. One set of status names and colours ("Pending Review", "Disbursed" in blue, and so on). Amounts shown as "Ksh 12,000.00". Dates fill in. | 22 Oct |

---

## 15. Decisions waiting for you

These need your input. Nothing here is broken, but each affects what customers or your accounts see.

| # | The question | Why it matters |
|---|---|---|
| 1 | **What should the public numbers say?** The home page says a Salary Advance is "up to 50% of net salary", and a Personal Loan has "1 month tenure" and is "up to KES 500,000". The platform's own calculator gives about **30%** of average salary for a salary advance, the personal loan form offers a 1-month or a 6-month option, and no KES 500,000 limit exists in the program. | Customers could be promised more than the platform will offer them. The FAQ avoids numbers until you decide. |
| 2 | **Real testimonials.** Add them yourself under Site content, Testimonials (Section 13.1), once the person has agreed to be quoted by name. | The section stays hidden until then. |
| 3 | **Licence or registration line in the footer.** Add a registration number if the business has one. | Lenders are often expected to show it. |
| 4 | **Nakama repayment reports show two different bank accounts.** The report HR downloads names a different account holder than the report the admin downloads. This was kept as it was. | Borrowers could be told to pay the wrong account. Please confirm which is correct. |
| 5 | **Should interest be chargeable on a delinquent loan?** It is blocked today because the 15% fee and the 10% charge were already added. | Your rule decides whether it is allowed. |
| 6 | **Penalties and fees in your income figures.** See Section 16, last point. | Your income and "expected back" totals leave them out. |
| 7 | **The contact form** opens the visitor's own email program. A form that delivers straight to your inbox would need more setup. | A visitor without an email program configured sees nothing happen. |
| 8 | **A hidden marker in every page.** The platform places a coded copy of the signed-in person's email, role and date in the page. The key to decode it is inside the site, so anyone who looks can read it. | Keep it (and tell us what it is for), or remove it. |
| 9 | **Admin accounts have no "forgot password" email.** Only applicants, HR and finance do. | An admin who forgets must be reset by a developer. |
| 10 | **Home-page photo** is borrowed from an image website rather than stored with the platform. | It could disappear or change. (Parked for later.) |
| 11 | **Server tidy-up:** copies kept for safety (database tables starting `bak_2026`), a few leftover test files, and a recommended extra protection on the hosting account for configuration files. | Housekeeping, not urgent. |
| 12 | **Please read the new loan-terms wording and confirm it.** It is in the application forms (Salary Advance, HR, Finance, Personal Loan) and the loan agreement in the debt dossier. Things for you to decide: (a) The terms already had a **rescheduling fee** (10% of the instalment or KES 1,500, whichever is higher). The platform does not charge it automatically; the new 10% late-payment charge is a separate item worked out on the whole balance with no KES 1,500 minimum. (b) The 15% recovery fee line says it follows a **demand notice**, but the platform adds it automatically on the 8th day overdue. (c) The **Personal Loan** terms do not mention the 15% recovery fee at all (only for returned cheques), yet the platform charges it. (d) The **company MOU** (clause 9) still describes only the 15% fee. It was left alone: the MOU is a signed contract with each employer. (e) Loans applied for **before 26 Oct 2026** are not charged the 10%. | Charging something the signed terms do not state can be disputed. These wording choices are a legal matter, so a lawyer should look at them. |
| 13 | **Your first two clients' names are built into some screens.** The Admin Applications page has "Mark Nakama Paid" and "Mark Ideon Paid", the salary-advance form assumes Ideon unless told otherwise, and some labels name them. A third company works, and most screens show generic labels for it, but not all. | Decide whether to make these generic as more companies join. |
| 14 | **Who may open and reset the demo.** Today anyone who has the link can open it and sign in with one click, and any admin sign-in can press Reset (once every 3 minutes). Search engines are told not to list it. | Fine for presenting. Tell us if you want a shared access code, or Reset limited to you. |
| 15 | **The map on the home page.** It searches for "Applewood Adams, Ngong Road, Nairobi" (the word "Along" is missing), which shows several pins around Adams Arcade. Searching for the full address, "Applewood Adams, Along Ngong Road, Nairobi", centres the map on Applewood Adams. We left it exactly as it was. | Say if you want it changed (one line). If you edit the address under Site content, the map follows the new address. |
| 16 | **Confirm the postal box in the Privacy Policy.** The Data Controller section (Section 2 of the policy) now shows your real email, phone numbers and address, taken from **Site content > Contact details**, plus **P.O. Box 184-00100 GPO, Nairobi**, the box named in your loan agreements. | If that box is not current, change it under **Site content > Privacy policy** (it is typed into the policy, not part of the contact details). |
| 17 | **Tell the search engines the site exists.** Sign in to Google Search Console and Bing Webmaster Tools with a company account, add leocapinvest.co.ke, verify it (a small tag or a DNS record) and submit https://leocapinvest.co.ke/sitemap.xml. Create a Google Business Profile for the Nairobi office. | Without this, search engines find the site slowly and you see none of their data. We cannot do it: it needs your Google and Microsoft sign-ins. Tell us the verification tag and we add it. |
| 18 | **Trust information a lender should show.** You told us there is **no licence or registration number for now**, so none is shown anywhere and none has been invented. Still useful when you have them: the full company name, social media links, and a Terms and Conditions page. **Please confirm with a lawyer** whether Kenya's Central Bank rules for digital credit providers (the Digital Credit Providers Regulations, 2022, in force since 18 September 2022) apply to your salary advance and personal loans: they require a licence from the Central Bank for digital lending. This is not legal advice from us. | Loans are a "your money" topic, so Google weighs who is behind the site, and a licence number, once you have one, is the strongest trust signal. Send it and we add it to the home page, the footer and the search details. |
| 19 | **Pre-drawing the home page (optional).** We built and measured it: the headline would appear in about 1.1 s instead of 1.8 s on a slow phone. We did **not** keep it: both are inside Google's "good" limit (2.5 s), and it would remove the scroll animations on first visit, add a step to every publish, and show out-of-date text for a moment after you edit Site content. | Say if you want it anyway. |

---

## 16. Still as before (known limits)

These were looked at and **left unchanged on purpose**. They are listed so you know about them.

- **"Mark selected as paid"** (the tick-box action on All Applications) credits the loan's **full repayment amount** and does not adjust the balance of a part-paid loan. The two single-loan and company-month routes do it correctly.
- **A borrower's "Amount Paid"** counts only payments recorded against that loan. For some older loans, earlier payments may not be linked, so the figure can look lower than what was really paid.
- **New application emails to HR** have been tested and the sending mailbox has been proven (a test email arrived), but a real application notice has not yet been seen arriving in live use. This is parked until you want to check it.
- **Penalties, the 15% collection fee and the 10% late-payment charge** increase what a borrower owes, but are **not included** in the dashboard's "Interest Income" and "Fee Revenue", nor in a report's "Expected back" figure. They do appear in "Outstanding", the statement and the overdue figures. We can add a separate "Penalties and collection fees" figure if you want one.
- **The old "Reverse transaction" feature** (not shown on any screen) is broken and unused. The new edit and delete tools replace it.
- **Rejecting an uploaded document deletes it for good** (the file and its record) and emails the applicant to upload a new one. There is no "undo"; the prompt now says so.
- **Bulk-uploaded applicants** can use any company code, and any HR user can bulk-create applicants.
- **The server does not yet refuse to start without a proper secret key.** The live server does have one.
- **HR and finance sign-ins can still use the general "amend" tool** on their own company's applicants' loans. The admin screens use it; the HR and finance screens do not (they use "Amend Amount"). It can change any field of such a loan, including its status. It now follows the review rule too, but we recommend restricting it to admins. Tell us if you want that.
- **A company with no finance user** (or no HR user) has nobody to review an HR manager's (or a finance officer's) own loan, so only an admin can decide it.
- **The Site content editor cannot add things the page was not built for**: exactly three hero numbers and three steps, one to three product cards, no buttons or pictures in the Privacy Policy.
- **A published change reaches visitors within about a minute** (the pages keep a copy for a minute to stay fast). Someone who already has the page open sees it on their next visit.
- **Site content cannot be edited in the demo**; the demo shows the program's built-in text.
- **The Site content editor does not stop you quoting numbers** in an FAQ answer. The built-in answers quote no loan limits, rates or fees on purpose (see decision 1); if an editor adds figures, nothing checks them against the calculators.
- **"Page not found" has a normal status.** An address that does not exist shows the app's "Page not found" screen, but the server still answers "OK" (200) instead of 404, and the screen is marked "do not list". A real 404 would need the server to know every page address, which would have to be kept in step with the program by hand.
- **Search engines see changes to Site content when they next open the page** (Google does this within days). The link-preview text (title, description, picture) is built into the program, not editable under Site content.
- **The page font covers English letters and common punctuation** (Latin). Any other alphabet is shown in the device's own font.
- **Speed figures are from a test copy and a simulation**, not from real visitors (see Section 13.2).
- **Some lists cannot be sorted on purpose**: a borrower's own loans and "My loans" (a handful of rows, newest first is right), Companies, the repayment schedule and the statement (the order is the point).
- **The demo is unavailable for about a minute while it rebuilds** (every night at 3 am, or when someone presses Reset). Everyone using the demo shares the same data, so a change one person makes is seen by the next.
- **The demo's nightly rebuild has been set up but not yet seen running** (its first run is 3 am on 26 October). We will check its log and say so here.
- **The demo's home page is the real public home page**, with its public numbers (see decision 1), while the demo's own data is smaller.

---

## 17. Change log by date

Newest first. When a change is made, a new line goes at the top.

| Date | What changed | Section |
|---|---|---|
| **27 Oct** | **Sortable tables**: All Applications (with a Due column), Manage Applicants, HR and finance applications, the dashboard Loan pipeline, Financial Analysis transactions, audit logs; status sorts by what needs action first (Reports too). | 11 |
| **26 Oct** | **Account statement PDF no longer shows "nan" instead of dates** (it affected statements that mix lines typed in from your spreadsheet with lines the platform recorded since; two applicants today). Download the statement again. No data was changed. | 6 |
| **26 Oct** | **Privacy Policy contact details corrected**: the Data Controller section showed made-up details (privacy@leocap.com and +254 700 000000). It now shows your real email, phone numbers and address, taken from Site content so it follows any edit there, plus the P.O. Box from your loan agreements. Nothing else in the policy changed. | 13.1, 15 |
| **26 Oct** | **Search engines and speed**: own title, description and link preview for every public page, robots.txt, sitemap, tab icon, one official address, business details for search engines, pages that should not be listed marked; the home page downloads about a quarter of what it did (screens load when opened), the photo, font and logos come from your own site and are smaller; a safety net for tabs left open during an update; security updates to Zod, Vite and about sixty packages. The server rules (www redirect, "do not list" on app., caching, each page's own title) were published after a check on the demo site; live search score 83 to 100. | 13.2 |
| **25 Oct** | **Delete Application fixed**: the button failed for every loan; it now deletes a loan that was never paid out (with its statement lines, keeping a copy in the system log) and explains why a paid-out loan cannot be deleted. | 11 |
| **25 Oct** | **Edit more of the public pages**: Site content now also covers the home page text (opening section with its three numbers, loan product cards with the Most Popular / Coming Soon switches, the three "How it works" steps and the band under them, the Contact and Testimonials headings) and the **Privacy Policy** (sections can be added, removed and reordered). With nothing published the pages are unchanged. Found: the policy's Data Controller section has placeholder contact details (decision 16). | 13.1 |
| **25 Oct** | **Edit the public pages yourself**: a new **Site content** screen in the admin menu for the contact details, an announcement banner, testimonials (only with the client's agreement) and the FAQs, with private drafts, a preview on the real page, publishing, history with restore, and every change in the Audit Trail. Contact details are now kept in one place (the header, footer, home page, sign-in pages and FAQs all follow them). Not in the demo. | 13.1 |
| **25 Oct** | **Approve and reject now follow the same rule as Amend Amount**: nobody decides their own application, and HR and finance never review their own role's loans (admins can still decide anything). The buttons are hidden where they would be refused. HR and finance **rejection reasons** are now saved. Finance's **HR Loans** page opens the full review page. | 9 |
| **25 Oct** | **Demo version for showing to clients**: its own site and made-up data, a role picker, a presenter guide of ten stories, "Run today's job" and a demo inbox, sample AI answers, sample bank details and a SAMPLE mark on its PDFs, a nightly refresh. Your real clients' names no longer appear in it. A borrower's **Next due date** ignores paid loans, and a borrower's loan page no longer calls every company's salary advance "Ideon". | 10, 18 |
| **25 Oct** | Borrower is emailed about a penalty (with an opt-out tick box). **Add Penalty** on the loan page. **Delete a wrong line** from a statement. **Applicant Statement** with filters, totals and a PDF that follows them. **Overdue card** is clickable. Fixed a scrolling fault on the applicant details page. **Edit a statement line** (amount, date, description). Uploaded-document cards fixed. New hover hints everywhere. Disbursement date in the applicant's Loan Applications list, and a form to **enter, correct or remove** it. **10% late-payment charge** added to the daily check, next to the 15% fee (loans applied for from 26 Oct 2026), and the **loan terms updated** to state it. **Demand letter** now shows the real fees and the balance owed. The credit score's reasons now show on the Financial Analysis page. | 4, 5, 6, 7, 11, 14, 15 |
| **23 Oct** | Public website redesign (same wording): menu bar, footer, home page, calmer statistics. New **FAQ** page. Testimonials section built (hidden until real quotes). | 13 |
| **22 Oct** | New sign-in, forgot-password and sign-up pages. Safer delete buttons (the old "Suspend" really suspends). Full audit trail. Every email recorded. Calculators fixed. Month-by-month "Mark Paid" with preview. "Fully repaid" email on every route. Finance and team notices. Admin, HR, finance and applicant portals made consistent and phone-friendly. | 4, 7, 10, 11, 12, 14 |
| **21 Oct** | "Mark as Paid" fixed. Delinquent loans handled. **Daily reminders switched on.** Forgot password works. HR told of new applications. Server sets the starting interest rate. **Loan limit** added. Pop-up messages work. Security fixes (profile, uploads, cookie, links). HR and finance work for any company. "Amend Amount" built. HR report PDF and Excel fixed. | 4, 7, 8, 9, 10 |
| **19 Oct** | Security round (approving or deleting others' loans, admin accounts, documents, test pages, sign-up role, public company list). Sign-up company field fixed. 9-digit ID numbers accepted. | 8, 9, 10 |
| **17 Oct** | Reports redesigned and fixed (PDF download, filters, overdue figures). Company shown on loans corrected, with a data fix. Expired sign-in handled. | 3, 6, 9, 10 |
| **15 Oct** | Platform put online with automatic publishing. Database upgraded. Interest and balances kept in step. Statements fixed. **Existing records corrected** from your spreadsheet. Phone text, buttons and banner fixed. | 1, 2, 3, 14 |

---

## 18. The demo for showing to clients

A separate copy of the platform, filled with made-up people, for presenting to prospective clients. It has its own web address, its own database and its own settings. It cannot reach your live data, and the live platform cannot reach it.

| What | Details |
|---|---|
| **Where** | **demo.leocapinvest.co.ke** is the site; demo-api.leocapinvest.co.ke is its engine. Search engines are told not to list it. |
| **What is inside** | Three made-up employers, 52 made-up people (the lender's staff, each employer's HR and finance staff, and borrowers), about 150 loans over 13 months with their statements, history and audit trail, sample documents and M-Pesa statements. Every email address uses a reserved ".example" ending, so nothing can reach a real person. |
| **Choosing who to be** | The page `/demo` lists eight people: two lender admins, three employer HR and finance staff, three borrowers. One click signs in as them and opens their own portal. There is no password to type. |
| **The presenter guide** | `/demo/guide` has ten short stories in the order that tends to win a room: the loan book at a glance, approving a loan, paying it out, lending to someone with no payslip, the daily chase for money, collections, employers, finance, what the borrower sees, and reports with the audit trail. Each button signs in as the right person and opens the right page. |
| **The Demo button** (bottom left of every page) | **Run today's job** runs the real daily job (reminders and late fees) and shows what it did. **Open inbox** shows the emails the platform would have sent; nothing is delivered. **Presenter guide** opens the stories. **Reset demo data** (admin sign-ins only, once every 3 minutes) puts everything back as it started. |
| **Fresh every day** | The data is rebuilt at 3 am each day, so "due in 7 days", "due today" and "8 days late" are always true on the day. The demo is kept awake between 6 am and 9 pm. |
| **Always the latest** | Every time a change is published to the platform, the demo is updated too. |

### What keeps it safe

| Risk | What is done |
|---|---|
| **Real data** | The demo has its own database. It refuses to start, and the rebuild refuses to run, unless it is switched to demo mode and the database name contains the word "demo". The rebuild also refuses to wipe a database that holds any real email address. |
| **Emails** | None is delivered. Each message is only recorded, and shown in the demo inbox. |
| **Your bank details** | Every PDF and Excel file made in the demo shows made-up bank details, and PDFs carry a faint diagonal **SAMPLE**. The real account numbers are not in the demo. The live platform's files are unchanged (we compared ten of them before and after). |
| **Your clients' names** | The platform used to add "Ideon Limited" and "Nakama Tech LTD" to its database every time it started, which would have put them in the demo. That no longer happens in the demo, and a search of the whole demo database finds no real client name. |
| **AI** | The demo has no AI key. Its AI summary and chat give clearly labelled **sample** answers worked out from the statement's own numbers, so they always agree with the figures on the page. |
| **The live platform** | The demo's tools are not published to the live platform, and the live website does not contain them. |

### Using it in a meeting

1. Open demo.leocapinvest.co.ke/demo/guide and pick a story, or open `/demo` and choose a person.
2. To switch person, use **Demo** then **Switch role**.
3. After a session, press **Reset demo data** (as an admin), or leave it: it refreshes itself at 3 am.

---

## About this document

This file is kept up to date as the platform changes. Whenever something is changed, the matching table gets a new row, the change log (Section 17) gets a new line at the top, and the "Last updated" date above is changed. A PDF copy (`PLATFORM_IMPROVEMENTS.pdf`) is made again from it each time. If anything here does not match what you see on the platform, please say so and it will be corrected.
