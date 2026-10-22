import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/global/BrandLogo";
import { useActiveSection, useScrolled } from "./motion";
import { APPLY_TO, SIGN_IN_TO } from "./site";

const NAV: { label: string; id: string }[] = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Products", id: "products" },
  { label: "Contact", id: "contact" },
];

// `home` = this is the landing page itself, so the links scroll within the page and the current section is underlined.
// On any other page (the FAQ) the same links go back to that section of the landing page.
export default function SiteHeader({ home = true }: { home?: boolean }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const spy = useActiveSection(["home", "products", "testimonials", "about", "contact"]);
  // The testimonials band sits between Products and About and has no link of its own: it counts as Products.
  const active = home ? (spy === "testimonials" ? "products" : spy) : null;

  const item = (id: string, label: string, className: string, onClick?: () => void, extra?: React.ReactNode) =>
    home ? (
      <a key={label} href={`#${id}`} aria-current={active === id ? "true" : undefined} onClick={onClick} className={className}>
        {label}
        {extra}
      </a>
    ) : (
      <Link key={label} to={id === "home" ? "/" : `/#${id}`} onClick={onClick} className={className}>
        {label}
        {extra}
      </Link>
    );

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled || open ? "border-slate-200/80 bg-white/95 shadow-[0_8px_24px_-12px_rgba(15,44,89,0.22)]" : "border-transparent bg-white"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo src="/logo-wordmark.png" height="2.25rem" />

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(({ label, id }) => {
            const on = active === id;
            return item(
              id,
              label,
              `relative rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
                on ? "text-brand-blue" : "text-slate-600 hover:text-brand-blue"
              }`,
              undefined,
              <span
                className={`absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-red-600 transition-transform duration-300 ${on ? "scale-x-100" : "scale-x-0"}`}
                aria-hidden
              />
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link to={SIGN_IN_TO}>
            <Button variant="outline" className="border-brand-blue font-semibold text-brand-blue hover:bg-blue-50">
              Sign In
            </Button>
          </Link>
          <Link to={APPLY_TO}>
            <Button className="bg-red-600 font-bold text-white shadow-md shadow-red-900/20 hover:bg-red-700">Apply Now</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`grid transition-[grid-template-rows] duration-300 md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className={`overflow-hidden transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}>
          <div className="flex flex-col gap-1 border-t border-slate-100 px-4 pb-5 pt-3">
            {NAV.map(({ label, id }) =>
              item(
                id,
                label,
                `flex min-h-[44px] items-center border-b border-slate-100 text-[15px] font-semibold transition-colors ${
                  active === id ? "text-brand-blue" : "text-slate-700 hover:text-brand-blue"
                }`,
                () => setOpen(false)
              )
            )}
            <div className="flex flex-col gap-3 pt-4">
              <Link to={SIGN_IN_TO}>
                <Button variant="outline" className="h-11 w-full border-brand-blue text-[15px] text-brand-blue">
                  Sign In
                </Button>
              </Link>
              <Link to={APPLY_TO}>
                <Button className="h-11 w-full bg-red-600 text-[15px] font-bold text-white hover:bg-red-700">Apply Now</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
