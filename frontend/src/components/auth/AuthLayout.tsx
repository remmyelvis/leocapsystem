import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Shield, User } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import JourneyCard from "./JourneyCard";

export type AuthVariant = "applicant" | "admin";

// Light speckle on the dark navy: a flat saturated field reads as a template, a faint grain reads as a surface.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .14 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

const COPY: Record<AuthVariant, { eyebrow: string; lead: string; accent: string; text: string }> = {
  applicant: {
    eyebrow: "Applicant & staff portal",
    lead: "Your loan, tracked from ",
    accent: "application to payout.",
    text: "See where every application stands, what you owe and when it is due, all in one place.",
  },
  admin: {
    eyebrow: "Administrator console",
    lead: "Run the loan book ",
    accent: "with clarity.",
    text: "Review, price and disburse loans, with every action recorded in the audit trail.",
  },
};

// The shape of the Leocap mark, redrawn large and faint so the panel feels like the brand without a logo on navy.
function MarkMotif({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden>
      <polygon points="12,228 104,26 170,26 76,228" fill="#ff6a3d" fillOpacity="0.13" />
      <polygon points="104,26 170,26 128,98" fill="#e8310a" fillOpacity="0.18" />
      <polygon points="170,26 237,228 178,228 128,98" fill="#b3180a" fillOpacity="0.20" />
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#081430]/50 px-3.5 py-1.5 backdrop-blur-sm">
      <span className="h-2 w-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
      <span className="text-[12px] font-semibold tracking-wide text-white/90">{children}</span>
    </div>
  );
}

function PortalSwitch({ variant }: { variant: AuthVariant }) {
  const { search } = useLocation(); // keeps ?session=expired when someone switches portal
  const item = (to: string, label: string, Icon: typeof User, on: boolean) => (
    <Link
      to={{ pathname: to, search }}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
        on ? "bg-white text-brand-blue shadow-sm ring-1 ring-slate-900/5" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
  return (
    <nav aria-label="Choose portal" className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {item("/login/applicant", "Applicant & staff", User, variant === "applicant")}
      {item("/login/admin", "Admin", Shield, variant === "admin")}
    </nav>
  );
}

export default function AuthLayout({ variant, children }: { variant: AuthVariant; children: ReactNode }) {
  const copy = COPY[variant];
  return (
    <div className="min-h-screen bg-white xl:flex">
      {/* Desktop: brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden px-16 py-12 text-white xl:sticky xl:top-0 xl:flex xl:h-screen xl:w-1/2 xl:px-16" style={PANEL}>
        <MarkMotif className="pointer-events-none absolute -bottom-32 -right-36 w-[520px]" />
        <div className="relative mx-auto flex h-full w-full max-w-[520px] flex-col justify-between">
          <div className="relative">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <p className="mt-8 text-[40px] font-bold leading-[1.12] tracking-[-0.015em]">
              {copy.lead}
              <span className="bg-gradient-to-r from-red-300 via-red-200 to-amber-200 bg-clip-text text-transparent">{copy.accent}</span>
            </p>
            <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/70 [@media(max-height:780px)]:hidden">{copy.text}</p>
          </div>

          <div className="relative">
            <JourneyCard variant={variant} />
          </div>

          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13px] text-white/60">
            <span>Need help signing in?</span>
            <a href="mailto:info@leocapinvest.co.ke" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Mail className="h-3.5 w-3.5" /> info@leocapinvest.co.ke
            </a>
            <a href="tel:+254722221502" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white">
              <Phone className="h-3.5 w-3.5" /> +254 722 221 502
            </a>
          </div>
        </div>
      </aside>

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
      <main className="relative -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-white xl:mt-0 xl:rounded-none">
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-6 pb-8 pt-7 xl:px-0 xl:py-10">
          <div className="flex items-center justify-between">
            <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
            <Link to="/" className="inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to site
            </Link>
          </div>

          <div className="py-8 xl:mt-[max(0px,calc(50vh-330px))] motion-safe:animate-auth-rise">
            <PortalSwitch variant={variant} />
            {children}
          </div>

          <p className="text-center text-[12px] text-slate-400">
            <Link to="/privacy-policy" className="hover:text-slate-600 hover:underline">Privacy policy</Link>
            <span className="mx-2">·</span>
            <span>© {new Date().getFullYear()} Leocap Invest</span>
          </p>
        </div>
      </main>
    </div>
  );
}
