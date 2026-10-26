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
  home_hero: {
    badge: "Trusted Fintech · Nairobi, Kenya",
    headline_1: "Fast, Flexible Loans",
    headline_2: "for Kenyan Professionals",
    intro: "Salary advances, personal loans, and more — approved within **24 hours**. Empowering Kenyan professionals with fast, fair, and flexible financial solutions.",
    primary_label: "Apply for a Loan",
    secondary_label: "Learn More",
    stats: [
      { value: "500+", label: "Clients Served" },
      { value: "KES 50M+", label: "Disbursed" },
      { value: "24 Hrs", label: "Approval Time" },
    ],
  },
  home_products: {
    eyebrow: "Our Products",
    title: "Loan Solutions Built for You",
    lead: "Straightforward products, transparent terms, and fast disbursement — designed around the Kenyan professional.",
    items: [
      {
        title: "Salary Advance",
        tag: "For Employed Professionals",
        description:
          "Access up to 50% of your net salary before payday. Quick disbursement directly to M-Pesa or your bank account, with repayment deducted from your next paycheck.",
        features: ["Up to 50% of net salary", "Same-day disbursement", "Zero collateral required"],
        featured: false,
        coming_soon: false,
      },
      {
        title: "Personal Loan",
        tag: "Open to Employed Kenyans",
        description:
          "Whether you're employed or self-employed, our personal loan gives you access to larger amounts for business, education, or personal growth projects.",
        features: ["Up to KES 500,000", "1 month tenure", "Competitive interest rates"],
        featured: true,
        coming_soon: false,
      },
      {
        title: "Installment Loan",
        tag: "Flexible Repayment",
        description:
          "Access larger loan amounts repaid in structured monthly instalments. Designed for business investment, home improvement, or long-term financial goals.",
        features: ["Structured monthly repayments", "Extended repayment periods", "Fixed, predictable schedule"],
        featured: false,
        coming_soon: true,
      },
    ],
  },
  home_how: {
    eyebrow: "Simple Process",
    title: "How It Works",
    lead: "From application to cash in hand — we've made it as easy as possible.",
    steps: [
      { title: "Register", description: "Create your account with your national ID and employer details. The whole process takes under 3 minutes on your phone." },
      { title: "Apply", description: "Choose your loan product, enter the amount you need, and submit your digital application — no paperwork, no branch visits." },
      { title: "Get Funded", description: "Receive funds directly to your M-Pesa or bank account within 24 hours of approval. It really is that simple." },
    ],
    cta: { title: "Ready to get started?", text: "Join 500+ professionals who trust Leocap Invest.", button: "Apply in Minutes" },
  },
  home_headings: {
    contact_eyebrow: "Get In Touch",
    contact_title: "We'd Love to Hear from You",
    contact_lead: "Have questions about our products or need assistance? Our team is happy to help.",
    testimonials_eyebrow: "Testimonials",
    testimonials_title: "Loved by Kenyan Professionals",
    testimonials_lead: "Don't take our word for it — here's what our clients say.",
  },
  privacy: {
    items: [
      {
        title: "Introduction",
        body: `Leocap Invest ("Leocap", "we", "our", or "us") is committed to protecting the privacy and confidentiality of personal information entrusted to us by applicants, borrowers, guarantors, referees, and other individuals whose information we process in the course of providing financial services.

This Privacy Policy explains how we collect, use, store, share, and protect personal data in accordance with the provisions of the Kenya Data Protection Act, 2019 and all applicable regulations.

By accessing our website, mobile platform, or loan application system and submitting personal information, you acknowledge that you have read and understood this Privacy Policy and consent to the processing of your personal data as described herein.`,
      },
      {
        title: "Data Controller",
        body: `Leocap Invest is the Data Controller for purposes of personal data processed under this Privacy Policy.

For any privacy-related inquiries, requests, or complaints, you may contact:

> **Data Protection Officer**
> Leocap Invest
>
> **Email:** {{email}}
> **Telephone:** {{phones}}
> **Physical Address:** {{address}}
> **Postal Address:** P.O. Box 184-00100 GPO, Nairobi, Kenya`,
      },
      {
        title: "Information We Collect",
        body: `We may collect and process the following categories of personal information:

### A. Personal Identification Information
- Full names
- National ID or Passport Number
- KRA PIN
- Date of Birth
- Gender
- Passport photograph or profile image

### B. Contact Information
- Mobile telephone number
- Email address
- Residential address
- Postal address

### C. Employment Information
- Employer details
- Employment number
- Job designation
- Salary information
- Bank account information

### D. Financial Information
- Loan application information
- Loan repayment history
- Banking information
- Mobile money transaction details
- Creditworthiness information

### E. Technical Information
When using our website or online portal, we may collect:
- IP address
- Browser information
- Device information
- Login records
- Date and time of access
- System-generated audit logs

### F. Supporting Documents
- National ID copies
- Payslips
- Bank statements
- Employment letters
- Any documents submitted during loan processing`,
      },
      {
        title: "Purpose of Processing",
        body: `We process personal data for legitimate business and legal purposes, including:

**Loan Assessment**
- Identity verification
- Fraud prevention
- Credit risk assessment
- Eligibility determination

**Loan Administration**
- Loan processing
- Loan disbursement
- Repayment management
- Customer communication

**Debt Recovery**
- Collection of overdue amounts
- Recovery proceedings
- Enforcement of contractual obligations

**Legal and Regulatory Compliance**
- Compliance with applicable laws
- Tax compliance
- Anti-money laundering requirements
- Regulatory reporting

**Business Operations**
- Internal reporting
- Service improvement
- System security
- Risk management`,
      },
      {
        title: "Legal Basis for Processing",
        body: `We process personal data based on one or more of the following lawful grounds:

1. Consent of the data subject;
2. Performance of a contract;
3. Compliance with legal obligations;
4. Protection of legitimate interests pursued by Leocap Invest;
5. Establishment, exercise, or defence of legal claims.`,
      },
      {
        title: "Disclosure of Personal Information",
        body: `We may share personal information where reasonably necessary with:

**Service Providers:** Technology providers, Cloud hosting providers, Payment processors

**Professional Advisors:** Advocates, Auditors, Accountants, Compliance consultants

**Debt Recovery Partners:** Licensed debt collection agencies, Auctioneers, Recovery agents

**Regulatory Authorities:** Courts of law, Law enforcement agencies, Government agencies, Regulatory bodies

**Credit Information Providers:** Credit Reference Bureaus (where applicable and lawful)

**We do not sell personal data to third parties.**`,
      },
      {
        title: "Data Security",
        body: `We implement appropriate technical and organizational measures to protect personal information against:
- Unauthorized access
- Accidental loss
- Alteration
- Disclosure
- Destruction

Security measures include:
- Password-protected systems
- Access controls
- Encryption where appropriate
- Audit trails
- Secure backups

While we strive to protect information, no system can guarantee absolute security.`,
      },
      {
        title: "Data Retention",
        body: `We retain personal information only for as long as necessary to:
- Fulfil contractual obligations;
- Meet legal and regulatory requirements;
- Resolve disputes;
- Enforce agreements.

Where information is no longer required, it will be securely deleted, anonymized, or archived in accordance with applicable law.`,
      },
      {
        title: "Rights of Data Subjects",
        body: `Under the Kenya Data Protection Act, 2019, individuals may have the right to:
- Access personal data held by us;
- Request correction of inaccurate information;
- Request deletion of personal information where legally permissible;
- Object to certain processing activities;
- Withdraw consent where processing is based on consent;
- Lodge a complaint with the Office of the Data Protection Commissioner.

Requests may be submitted through the contact details provided in this Privacy Policy.`,
      },
      {
        title: "Cross-Border Data Transfers",
        body: "Where personal information is stored or processed outside Kenya, Leocap Invest shall ensure that appropriate safeguards are in place and that such transfers comply with applicable data protection laws.",
      },
      {
        title: "Debt Recovery Communications",
        body: `In the event of loan default, the Borrower acknowledges and consents that Leocap Invest may contact:
- The Borrower directly;
- Referees provided by the Borrower;
- Employers (where applicable);
- Advocates;
- Debt collection agencies;

strictly for purposes of tracing, recovery, enforcement, and administration of outstanding loan obligations.

Such communications shall be conducted in accordance with applicable law and the Data Protection Act, 2019.`,
      },
      {
        title: "Changes to this Policy",
        body: "Leocap Invest reserves the right to amend this Privacy Policy from time to time. Any updated version shall be published on the relevant platform and shall take effect upon publication.",
      },
      {
        title: "Consent",
        body: `By ticking the acceptance box and submitting a loan application through the Leocap Invest platform, the Applicant:
- Confirms that all information provided is accurate and complete;
- Consents to the collection, processing, storage, and sharing of personal data as described in this Privacy Policy;
- Authorizes Leocap Invest to verify information provided during the loan application process;
- Acknowledges that electronic acceptance constitutes valid consent under the Kenya Data Protection Act, 2019 and the Kenya Information and Communications Act.`,
      },
    ],
  },
};
