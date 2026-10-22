import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, LayoutDashboard } from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { useAuth } from "@/contexts/AuthContext";
import { ADDRESS, APPLY_TO, EMAIL, MAPS_URL, PHONES, portalFor, SIGN_IN_TO } from "./site";

const footerLink = "inline-flex min-h-[40px] items-center text-slate-300 transition-colors hover:text-white md:min-h-[30px]";

// Column headings: small spaced capitals led by a short red dash, like the section labels on the page above.
function Heading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white">
      <span className="h-px w-4 bg-red-400" aria-hidden />
      {children}
    </p>
  );
}

export default function SiteFooter({ home = true }: { home?: boolean }) {
  const { user } = useAuth();
  const portal = user ? portalFor(user.role) : null;

  // On the landing page the section links scroll in place; elsewhere they go back to that section of the landing page.
  const section = (id: string, label: string): ReactNode =>
    home ? (
      <a href={`#${id}`} className={footerLink}>
        {label}
      </a>
    ) : (
      <Link to={`/#${id}`} className={footerLink}>
        {label}
      </Link>
    );

  const toTop = () =>
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <footer className="relative overflow-hidden text-slate-300" style={navy("linear-gradient(180deg, #081430 0%, #050c1f 100%)")}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" aria-hidden />
      <MarkMotif className="pointer-events-none absolute -bottom-36 -left-28 hidden w-[460px] md:block" strength={0.9} />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 md:pt-16 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.15fr_0.8fr_0.8fr_1.35fr] lg:gap-x-10">
          {/* Brand: the logo hangs from the top edge like a tag, then the tagline and the way in */}
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-4 inline-flex rounded-xl bg-white px-4 py-3 shadow-lg shadow-black/20">
              <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
            </div>
            <p className="max-w-xs text-[14px] leading-relaxed text-slate-300">Empowering Kenyan professionals with fast, fair, and flexible financial solutions.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {portal ? (
                <Link to={portal} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-bold text-brand-blue transition-colors hover:bg-slate-100">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to={APPLY_TO} className="inline-flex min-h-[44px] items-center rounded-xl bg-red-600 px-5 text-[14px] font-bold text-white shadow-lg shadow-red-950/40 transition-colors hover:bg-red-700">
                    Apply Now
                  </Link>
                  <Link to={SIGN_IN_TO} className="inline-flex min-h-[44px] items-center rounded-xl border border-white/40 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

          <div>
            <Heading>Products</Heading>
            <ul className="text-[14px]">
              {["Salary Advance", "Personal Loan", "Installment Loan"].map((item) => (
                <li key={item}>{section("products", item)}</li>
              ))}
            </ul>
          </div>

          <div>
            <Heading>Company</Heading>
            <ul className="text-[14px]">
              <li>{section("about", "About Us")}</li>
              <li>{section("about", "How It Works")}</li>
              <li>
                <Link to="/faq" className={footerLink}>
                  FAQs
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className={footerLink}>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <Heading>Contact</Heading>
            <ul className="text-[14px]">
              <li>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  {ADDRESS}
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL}`} className={footerLink}>
                  {EMAIL}
                </a>
              </li>
              {PHONES.map((p) => (
                <li key={p.href}>
                  <a href={p.href} className={footerLink}>
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-[13px]">
          <p className="text-slate-300">&copy; {new Date().getFullYear()} Leocap Invest. All rights reserved.</p>
          <p className="order-3 w-full text-slate-400 sm:order-none sm:w-auto sm:flex-1 sm:text-right">Financial advisory and lending solutions for Kenyan professionals · Nairobi, Kenya</p>
          <button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
