import type { SiteBlocks } from "./types";

// What the public pages say until an admin publishes something else (Admin > Site content > "Reset to built-in text").
// Every answer restates what the landing page, the sign-up and apply forms, or the dashboard already say or do.
// No loan limits, rates or fees are quoted here; the application form shows the figures for each applicant.

export const DEFAULTS: SiteBlocks = {
  contact: {
    email: "info@leocapinvest.co.ke",
    phones: [{ number: "+254 722 221 502" }, { number: "+254 721 834 959" }],
    address: "Applewood Adams, Along Ngong Road, Nairobi",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Applewood+Adams+Ngong+Road+Nairobi",
  },
  banner: { enabled: false, text: "", link_label: "", link_url: "", tone: "info" },
  testimonials: { items: [] },
  faq: {
    items: [
      {
        id: "who",
        topic: "Getting started",
        q: "Who can apply?",
        a: `Leocap Invest lends to Kenyan professionals. You choose your company when you create your account, and that decides which loan you see. Staff of a partner company apply for a Salary Advance. Individuals apply for a Personal Loan. The Installment Loan is coming soon.

[button: Create your account](/register)`,
        popular: false,
      },
      {
        id: "how",
        topic: "Getting started",
        q: "How do I apply?",
        a: `1. Create your account with your name, email, phone, company and a password.
2. Complete your profile: your details and your documents.
3. Choose your loan, enter the amount you need and submit your application online. No paperwork, no branch visits.
4. Follow it on your dashboard until the money is sent.

[button: Create your account](/register)
[outline: Sign in](/login/applicant)`,
        popular: true,
      },
      {
        id: "documents",
        topic: "Getting started",
        q: "Which documents do I need?",
        a: "{{documents-checklist}}",
        popular: true,
      },
      {
        id: "profile",
        topic: "Getting started",
        q: "Why can't I apply yet?",
        a: `You can only apply once your profile is complete: your personal details and your documents. Sign in and open your dashboard; it shows how much is done and what is missing.

If a reviewer rejects a document, we email you the reason so you can upload the right one.

[button: Sign in](/login/applicant)
[outline: Which documents do I need?](/faq#documents)`,
        popular: false,
      },
      {
        id: "time",
        topic: "Loans & money",
        q: "How fast will I get my money?",
        a: "Applications are approved within 24 hours, and the money reaches your M-Pesa or bank account within 24 hours of approval. The sooner your profile is complete and your documents are in, the sooner we can start.",
        popular: true,
      },
      {
        id: "cost",
        topic: "Loans & money",
        q: "What will it cost me?",
        a: `The application form shows an estimate before you submit: the loan amount, the fees and what you would receive.

Fees can be deducted from the loan before it is paid out. Once the loan is approved, your dashboard shows what you must repay and the due date.`,
        popular: false,
      },
      {
        id: "rate",
        topic: "Loans & money",
        q: "What does Review Rate mean?",
        a: `On a Personal Loan we set the interest rate after reviewing your application. It then shows as Review Rate on your dashboard: open the application and accept or decline it. The loan only goes ahead once you accept.

[outline: See every status explained](/faq#track)`,
        popular: false,
      },
      {
        id: "repay",
        topic: "Loans & money",
        q: "How do I repay?",
        a: "For a Salary Advance, repayment is deducted from your next paycheck. For any loan, your dashboard shows what you owe and the due date once the loan is disbursed. Please pay before the due date.",
        popular: false,
      },
      {
        id: "installment",
        topic: "Loans & money",
        q: "Is the Installment Loan available?",
        a: "Not yet. It is marked Coming Soon. It is designed for larger amounts repaid in structured monthly instalments.",
        popular: false,
      },
      {
        id: "track",
        topic: "Your account",
        q: "How do I track my application, and what do the statuses mean?",
        a: `Sign in and open My Applications. Each application shows its status and date; open one to see the full details. This is what each status means:

{{status-guide}}

[button: Sign in](/login/applicant)`,
        popular: true,
      },
      {
        id: "password",
        topic: "Your account",
        q: "I forgot my password",
        a: `1. On the sign-in page, choose Forgot password and enter your email.
2. Open the email we send you and follow the link. It works once and expires in 1 hour.
3. Choose a new password and sign in.

If the email does not arrive, check your spam folder.

[button: Reset your password](/forgot-password)`,
        popular: true,
      },
      {
        id: "staff",
        topic: "Your account",
        q: "I work in HR or Finance. Where do I sign in?",
        a: `HR and Finance accounts are set up by Leocap Invest. Once you have one, sign in on the same page as applicants and we take you to your own portal. If you need an account, contact us.

[button: Sign in](/login/applicant)
[outline: Contact us](/#contact)`,
        popular: false,
      },
      {
        id: "data",
        topic: "Privacy & contact",
        q: "How is my personal data handled?",
        a: `When you create an account you consent to us processing your personal data in line with the Data Protection Act, 2019. The Privacy Policy explains what we collect and why.

[button: Read the Privacy Policy](/privacy-policy)`,
        popular: false,
      },
      {
        id: "contact",
        topic: "Privacy & contact",
        q: "How do I reach you?",
        a: `Email {{email}}, call {{phones}}, or visit us at {{address}}. We typically respond within 1 business day.

[button: Send a message](/#contact)`,
        popular: false,
      },
    ],
  },
};
