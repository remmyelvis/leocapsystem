import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/global/BrandLogo";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { ADDRESS, EMAIL, MAPS_URL, PHONES } from "./site";

const footerLink = "inline-flex min-h-[40px] items-center text-slate-300 transition-colors hover:text-white md:min-h-[28px]";

export default function SiteFooter({ home = true }: { home?: boolean }) {
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

  return (
    <footer className="relative overflow-hidden text-slate-300" style={navy("linear-gradient(180deg, #081430 0%, #050c1f 100%)")}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" aria-hidden />
      <MarkMotif className="pointer-events-none absolute -bottom-36 -right-44 hidden w-[420px] md:block" strength={1.2} />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-14 grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <div className="inline-flex rounded-xl bg-white px-4 py-3 shadow-lg shadow-black/20">
              <BrandLogo src="/logo-wordmark.png" height="2.25rem" />
            </div>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-slate-300">
              Empowering Kenyan professionals with fast, fair, and flexible financial solutions.
            </p>
          </div>

          <div>
            <p className="mb-4 text-[14px] font-bold text-white">Products</p>
            <ul className="text-[14px] md:space-y-1.5">
              {["Salary Advance", "Personal Loan", "Installment Loan"].map((item) => (
                <li key={item}>{section("products", item)}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[14px] font-bold text-white">Company</p>
            <ul className="text-[14px] md:space-y-1.5">
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

          <div>
            <p className="mb-4 text-[14px] font-bold text-white">Contact</p>
            <ul className="text-[14px] md:space-y-1.5">
              <li>
                <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className={`${footerLink} !items-start`}>
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

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[13px] sm:flex-row">
          <p className="text-slate-300">&copy; {new Date().getFullYear()} Leocap Invest. All rights reserved.</p>
          <p className="text-slate-400">Financial advisory and lending solutions for Kenyan professionals · Nairobi, Kenya</p>
        </div>
      </div>
    </footer>
  );
}
