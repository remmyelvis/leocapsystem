// What search engines and link previews show for each public page.
// Plain data with no imports: vite.config.ts reads it at build time (to write each page's own <head>), and the app reads it
// while running (RouteSeo), so the two can never disagree. The sitemap lives in public/sitemap.xml: keep both in step.
//
// No loan limits, rates or fees in these texts, on purpose: add figures only if the owner asks (the card numbers were settled on 29 Oct, PLATFORM_IMPROVEMENTS.md decision 1).

export const SITE_NAME = "Leocap Invest";
/** The one address search engines should list (www. and app. serve the same pages but point here). */
export const SITE_URL = "https://leocapinvest.co.ke";
/** What every page not listed below (the portals, the 404 page, password reset) calls itself. They are never indexed. */
export const APP_TITLE = "Leocap Loan App";
export const SOCIAL_IMAGE = { path: "/og-image.jpg", width: 1200, height: 630, alt: "Leocap Invest: salary advance and personal loans for Kenyan professionals" };

export interface PageSeo {
  title: string;
  description: string;
}

export const PUBLIC_PAGES: Record<string, PageSeo> = {
  "/": {
    title: "Salary Advance & Personal Loans in Kenya | Leocap Invest",
    description: "Leocap Invest offers salary advances and personal loans to Kenyan professionals. Create an account, apply online and follow your application in one place.",
  },
  "/faq": {
    title: "Frequently Asked Questions | Leocap Invest",
    description: "Answers about who can apply, the documents you need, how applications are reviewed, repayment, your account and how your data is handled at Leocap Invest.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Leocap Invest",
    description: "How Leocap Invest collects, uses, shares and protects your personal data, how long we keep it, and the rights you have over it.",
  },
  "/terms-and-conditions": {
    title: "Terms and Conditions | Leocap Invest",
    description: "The terms for using the Leocap Invest website and online loan application: your account, applications and approval, acceptable use, and how complaints and disputes are handled.",
  },
  "/register": {
    title: "Create an Account to Apply for a Loan | Leocap Invest",
    description: "Register with Leocap Invest to apply for a salary advance or a personal loan online. It takes about a minute to create your account.",
  },
  "/login/applicant": {
    title: "Sign In | Leocap Invest",
    description: "Sign in to your Leocap Invest account to apply for a loan, upload your documents and follow your applications.",
  },
};

/** "/faq/" and "/faq" are the same page. */
export const normalizePath = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname) || "/";
