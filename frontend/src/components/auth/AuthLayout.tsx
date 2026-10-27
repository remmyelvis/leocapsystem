import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CircleHelp, Mail, Phone } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { GRAIN, MarkMotif } from "@/components/global/brandArt";
import StepsCard, { type PanelStep } from "./StepsCard";
import { useContact } from "@/lib/siteContent/useSiteContent";

export type AuthVariant = "applicant" | "admin";
export type AuthPage = AuthVariant | "forgot" | "reset" | "register";

const PANEL: CSSProperties = {
  backgroundColor: "#081430",
  backgroundImage: [
    GRAIN,
    "radial-gradient(60% 50% at 12% 8%, rgba(59,130,246,0.30), transparent 70%)",
    "radial-gradient(50% 40% at 92% 96%, rgba(217,119,6,0.16), transparent 70%)",
    "linear-gradient(160deg, #0f2c59 0%, #0b1f45 45%, #081430 100%)",
  ].join(", "),
  backgroundSize: "180px 180px, auto, auto, auto",
};

// What the brand panel says on each page: a headline and, where the page has a task to explain, one card that helps with it.
// `text` is optional: the sign-in and sign-up pages leave it out (the headline, or the steps card below it, already says it).
const COPY: Record<AuthPage, { eyebrow: string; lead: string; accent: string; text?: string }> = {
  applicant: {
    eyebrow: "Applicant & staff portal",
    lead: "Your loan, tracked from ",
    accent: "application to payout.",
  },
  admin: {
    eyebrow: "Administrator console",
    lead: "Run the loan book ",
    accent: "with clarity.",
  },
  forgot: {
    eyebrow: "Account recovery",
    lead: "Locked out? ",
    accent: "Back in a few steps.",
    text: "We email you a link, you choose a new password, and you carry on where you left off.",
  },
  reset: {
    eyebrow: "Account recovery",
    lead: "Almost there. ",
    accent: "Pick a new password.",
    text: "Choose something you do not use anywhere else. The link you followed works once.",
  },
  register: {
    eyebrow: "New applicant",
    lead: "Open your account, ",
    accent: "then apply online.",
  },
};

const RESET_STEPS: PanelStep[] = [
  { label: "Enter your email", text: "Use the address you signed up with." },
  { label: "Open the email we send", text: "The link works once and expires in 1 hour." },
  { label: "Choose a new password", text: "Then sign in as usual." },
];

// The sign-in pages have no card: someone signing in wants the form, not an explainer next to it.
function PanelCard({ page }: { page: AuthPage }) {
  switch (page) {
    case "forgot":
      return <StepsCard title="How a reset works" foot="Nothing changes on your account until you save a new password." steps={RESET_STEPS} current={0} />;
    case "reset":
      return <StepsCard title="How a reset works" foot="Nothing changes on your account until you save a new password." steps={RESET_STEPS} current={2} />;
    case "register":
      return (
        <StepsCard
          title="What happens next"
          steps={[
            { label: "Create your account", text: "Choose your company so you see the right loans." },
            { label: "Complete your profile", text: "Add your ID copy and KRA PIN document. Partner-company staff also add their contract." },
            { label: "Apply online", text: "Salary advance or personal loan, depending on your company." },
            { label: "Track it", text: "Follow your application until the money is sent." },
          ]}
        />
      );
    default:
      return null;
  }
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#081430]/50 px-3.5 py-1.5 backdrop-blur-sm">
      <span className="h-2 w-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
      <span className="text-[12px] font-semibold tracking-wide text-white">{children}</span>
    </div>
  );
}

// A box checks itself when the cursor leaves it, and its error line pushes everything below it down. A link or button pressed
// at that moment has moved by the time the mouse is released, so the first click did nothing (the second worked). Pressing a
// link, button or label therefore keeps the cursor where it is: no check runs, nothing moves, and the click still goes through.
const keepCursorOnPress = (e: MouseEvent<HTMLElement>) => {
  if (e.button === 0 && (e.target as HTMLElement).closest("a, button, label")) e.preventDefault();
};

export default function AuthLayout({ variant, children, top = false }: { variant: AuthPage; children: ReactNode; top?: boolean }) {
  const copy = COPY[variant];
  const contact = useContact();
  return (
    <div className="min-h-screen bg-white xl:flex">
      {/* Phones and tablets: a short brand band the form sheet overlaps */}
      <header className="relative overflow-hidden px-6 pb-14 pt-8 text-white xl:hidden" style={PANEL}>
        <MarkMotif className="pointer-events-none absolute -bottom-10 -right-8 w-52" />
        <div className="relative mx-auto max-w-[400px]">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <p className="mt-5 text-[24px] font-bold leading-tight tracking-[-0.01em]">
            {copy.lead}
            <span className="bg-gradient-to-r from-red-300 via-red-200 to-amber-200 bg-clip-text text-transparent">{copy.accent}</span>
          </p>
        </div>
      </header>

      {/* Form column */}
      <main onMouseDown={keepCursorOnPress} className="relative -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-white xl:mt-0 xl:rounded-none">
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-6 pb-8 pt-7 xl:px-0 xl:py-10">
          <div className="flex items-center justify-between">
            <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
            <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-slate-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>

          <div className={`py-8 motion-safe:animate-auth-rise ${top ? "" : "xl:mt-[max(0px,calc(50vh-330px))]"}`}>
            {children}
          </div>

          {/* One line from 400 px up; on a narrower phone the links keep one line and the copyright takes its own, so nothing breaks in the middle of a name. */}
          <p className="flex flex-col items-center gap-y-1 text-center text-[12px] text-slate-600 min-[400px]:flex-row min-[400px]:justify-center">
            <span className="whitespace-nowrap">
              <Link to="/privacy-policy" className="hover:text-slate-900 hover:underline">Privacy policy</Link>
              <span className="mx-2">·</span>
              <Link to="/faq" className="hover:text-slate-900 hover:underline">FAQs</Link>
              {/* The few administrators find their sign-in here, so the applicants' form has nothing about it. */}
              {variant === "applicant" && (
                <>
                  <span className="mx-2">·</span>
                  <Link to="/login/admin" className="tap-link hover:text-slate-900 hover:underline">Admin</Link>
                </>
              )}
            </span>
            <span className="mx-2 hidden min-[400px]:inline">·</span>
            <span className="whitespace-nowrap">© {new Date().getFullYear()} Leocap Invest</span>
          </p>
        </div>
      </main>
      {/* Desktop: brand panel. It comes last in the page (so keyboard and screen-reader users reach the form first) and is shown first with order. */}
      <aside className="relative order-first hidden flex-col justify-between overflow-hidden px-16 py-12 text-white xl:sticky xl:top-0 xl:flex xl:h-screen xl:w-1/2 xl:px-16" style={PANEL}>
        <MarkMotif className="pointer-events-none absolute -bottom-32 -right-36 w-[520px]" />
        <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col justify-between">
          <div className="relative">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <p className="mt-8 text-[40px] font-bold leading-[1.12] tracking-[-0.015em]">
              {copy.lead}
              <span className="bg-gradient-to-r from-red-300 via-red-200 to-amber-200 bg-clip-text text-transparent">{copy.accent}</span>
            </p>
            {copy.text && <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/80 [@media(max-height:780px)]:hidden">{copy.text}</p>}
          </div>

          {variant !== "applicant" && variant !== "admin" && (
            <div className="relative">
              <PanelCard page={variant} />
            </div>
          )}

          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-white/75">
            <span>{variant === "register" ? "Questions before you sign up?" : "Need help signing in?"}</span>
            <Link to="/faq" className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline">
              <CircleHelp className="h-3.5 w-3.5" /> Read the FAQs
            </Link>
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Mail className="h-3.5 w-3.5" /> {contact.email}
            </a>
            <a href={contact.phones[0].href} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Phone className="h-3.5 w-3.5" /> {contact.phones[0].label}
            </a>
          </div>
        </div>
      </aside>

    </div>
  );
}
