import type { ReactNode } from "react";
import { ADDRESS, EMAIL, PHONES } from "@/components/landing/site";
import { ActionLink, Actions, DocChecklist, P, StatusGuide, Steps } from "./parts";

export const TOPICS = ["Getting started", "Loans & money", "Your account", "Privacy & contact"] as const;
export type Topic = (typeof TOPICS)[number];

export interface Faq {
  id: string;
  topic: Topic;
  q: string;
  /** Plain text of the answer: what the search looks at and what search engines read. */
  text: string;
  answer: ReactNode;
  popular?: boolean;
}

// Every answer restates what the landing page, the sign-up and apply forms, or the dashboard already say or do.
// No loan limits, rates or fees are quoted here; the application form shows the figures for each applicant.
export const FAQS: Faq[] = [
  {
    id: "who",
    topic: "Getting started",
    q: "Who can apply?",
    text: "Leocap Invest lends to Kenyan professionals. You choose your company when you create your account, and that decides which loan you see. Staff of a partner company apply for a Salary Advance. Individuals apply for a Personal Loan. The Installment Loan is coming soon.",
    answer: (
      <>
        <P>
          Leocap Invest lends to Kenyan professionals. You choose your company when you create your account, and that decides which loan you see. Staff of a
          partner company apply for a Salary Advance. Individuals apply for a Personal Loan. The Installment Loan is coming soon.
        </P>
        <Actions>
          <ActionLink to="/register" primary>
            Create your account
          </ActionLink>
        </Actions>
      </>
    ),
  },
  {
    id: "how",
    topic: "Getting started",
    q: "How do I apply?",
    text: "Create your account with your name, email, phone, company and a password. Complete your profile with your details and documents. Choose your loan, enter the amount you need and submit your application online. Follow it on your dashboard until the money is sent. No paperwork, no branch visits.",
    answer: (
      <>
        <Steps
          items={[
            "Create your account with your name, email, phone, company and a password.",
            "Complete your profile: your details and your documents.",
            "Choose your loan, enter the amount you need and submit your application online. No paperwork, no branch visits.",
            "Follow it on your dashboard until the money is sent.",
          ]}
        />
        <Actions>
          <ActionLink to="/register" primary>
            Create your account
          </ActionLink>
          <ActionLink to="/login/applicant">Sign in</ActionLink>
        </Actions>
      </>
    ),
    popular: true,
  },
  {
    id: "documents",
    topic: "Getting started",
    q: "Which documents do I need?",
    text: "Everyone uploads a national ID copy and a KRA PIN certificate on their profile. Staff of a partner company also upload their employment contract. For a Personal Loan you also add a bank statement and an M-Pesa statement (6 months) and a payslip if you are employed.",
    answer: <DocChecklist />,
    popular: true,
  },
  {
    id: "profile",
    topic: "Getting started",
    q: "Why can't I apply yet?",
    text: "You can only apply once your profile is complete: your personal details and your documents. Sign in and open your dashboard; it shows how much is done and what is missing. If a reviewer rejects a document, we email you the reason so you can upload the right one.",
    answer: (
      <>
        <P>
          You can only apply once your profile is complete: your personal details and your documents. Sign in and open your dashboard; it shows how much is
          done and what is missing.
        </P>
        <P>If a reviewer rejects a document, we email you the reason so you can upload the right one.</P>
        <Actions>
          <ActionLink to="/login/applicant" primary>
            Sign in
          </ActionLink>
          <ActionLink to="/faq#documents">Which documents do I need?</ActionLink>
        </Actions>
      </>
    ),
  },
  {
    id: "time",
    topic: "Loans & money",
    q: "How fast will I get my money?",
    text: "Applications are approved within 24 hours, and the money reaches your M-Pesa or bank account within 24 hours of approval. The sooner your profile is complete and your documents are in, the sooner we can start.",
    answer: (
      <P>
        Applications are approved within 24 hours, and the money reaches your M-Pesa or bank account within 24 hours of approval. The sooner your profile is
        complete and your documents are in, the sooner we can start.
      </P>
    ),
    popular: true,
  },
  {
    id: "cost",
    topic: "Loans & money",
    q: "What will it cost me?",
    text: "The application form shows an estimate before you submit: the loan amount, the fees and what you would receive. Fees can be deducted from the loan before it is paid out. Once the loan is approved, your dashboard shows what you must repay and the due date.",
    answer: (
      <>
        <P>The application form shows an estimate before you submit: the loan amount, the fees and what you would receive.</P>
        <P>Fees can be deducted from the loan before it is paid out. Once the loan is approved, your dashboard shows what you must repay and the due date.</P>
      </>
    ),
  },
  {
    id: "rate",
    topic: "Loans & money",
    q: "What does Review Rate mean?",
    text: "On a Personal Loan we set the interest rate after reviewing your application. It then shows as Review Rate on your dashboard: open the application and accept or decline it. The loan only goes ahead once you accept.",
    answer: (
      <>
        <P>
          On a Personal Loan we set the interest rate after reviewing your application. It then shows as Review Rate on your dashboard: open the application
          and accept or decline it. The loan only goes ahead once you accept.
        </P>
        <Actions>
          <ActionLink to="/faq#track">See every status explained</ActionLink>
        </Actions>
      </>
    ),
  },
  {
    id: "repay",
    topic: "Loans & money",
    q: "How do I repay?",
    text: "For a Salary Advance, repayment is deducted from your next paycheck. For any loan, your dashboard shows what you owe and the due date once the loan is disbursed. Please pay before the due date.",
    answer: (
      <P>
        For a Salary Advance, repayment is deducted from your next paycheck. For any loan, your dashboard shows what you owe and the due date once the loan is
        disbursed. Please pay before the due date.
      </P>
    ),
  },
  {
    id: "installment",
    topic: "Loans & money",
    q: "Is the Installment Loan available?",
    text: "Not yet. It is marked Coming Soon. It is designed for larger amounts repaid in structured monthly instalments.",
    answer: <P>Not yet. It is marked Coming Soon. It is designed for larger amounts repaid in structured monthly instalments.</P>,
  },
  {
    id: "track",
    topic: "Your account",
    q: "How do I track my application, and what do the statuses mean?",
    text: "Sign in and open My Applications. Each application shows its status and date; open one to see the full details. Statuses: Pending Review, Amended, Review Rate, Rate Accepted, Rate Declined, Approved, Declined, Disbursed.",
    answer: (
      <>
        <P>Sign in and open My Applications. Each application shows its status and date; open one to see the full details. This is what each status means:</P>
        <StatusGuide />
        <Actions>
          <ActionLink to="/login/applicant" primary>
            Sign in
          </ActionLink>
        </Actions>
      </>
    ),
    popular: true,
  },
  {
    id: "password",
    topic: "Your account",
    q: "I forgot my password",
    text: "On the sign-in page choose Forgot password and enter your email. We send you a link to choose a new password. The link works once and expires in 1 hour. If it does not arrive, check your spam folder.",
    answer: (
      <>
        <Steps
          items={[
            "On the sign-in page, choose Forgot password and enter your email.",
            "Open the email we send you and follow the link. It works once and expires in 1 hour.",
            "Choose a new password and sign in.",
          ]}
        />
        <P>If the email does not arrive, check your spam folder.</P>
        <Actions>
          <ActionLink to="/forgot-password" primary>
            Reset your password
          </ActionLink>
        </Actions>
      </>
    ),
    popular: true,
  },
  {
    id: "staff",
    topic: "Your account",
    q: "I work in HR or Finance. Where do I sign in?",
    text: "HR and Finance accounts are set up by Leocap Invest. Once you have one, sign in on the same page as applicants and we take you to your own portal. If you need an account, contact us.",
    answer: (
      <>
        <P>
          HR and Finance accounts are set up by Leocap Invest. Once you have one, sign in on the same page as applicants and we take you to your own portal. If
          you need an account, contact us.
        </P>
        <Actions>
          <ActionLink to="/login/applicant" primary>
            Sign in
          </ActionLink>
          <ActionLink to="/#contact">Contact us</ActionLink>
        </Actions>
      </>
    ),
  },
  {
    id: "data",
    topic: "Privacy & contact",
    q: "How is my personal data handled?",
    text: "When you create an account you consent to us processing your personal data in line with the Data Protection Act, 2019. The Privacy Policy explains what we collect and why.",
    answer: (
      <>
        <P>
          When you create an account you consent to us processing your personal data in line with the Data Protection Act, 2019. The Privacy Policy explains what
          we collect and why.
        </P>
        <Actions>
          <ActionLink to="/privacy-policy" primary>
            Read the Privacy Policy
          </ActionLink>
        </Actions>
      </>
    ),
  },
  {
    id: "contact",
    topic: "Privacy & contact",
    q: "How do I reach you?",
    text: `Email ${EMAIL}, call ${PHONES.map((p) => p.label).join(" or ")}, or visit ${ADDRESS}. We typically respond within 1 business day.`,
    answer: (
      <>
        <P>
          Email{" "}
          <a href={`mailto:${EMAIL}`} className="font-semibold text-brand-blue underline-offset-2 hover:underline">
            {EMAIL}
          </a>
          , call{" "}
          {PHONES.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " or "}
              <a href={p.href} className="font-semibold text-brand-blue underline-offset-2 hover:underline">
                {p.label}
              </a>
            </span>
          ))}
          , or visit us at {ADDRESS}. We typically respond within 1 business day.
        </P>
        <Actions>
          <ActionLink to="/#contact" primary>
            Send a message
          </ActionLink>
        </Actions>
      </>
    ),
  },
];
