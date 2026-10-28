import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Mail, Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/global/BrandLogo";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveSection, useScrollProgress, useScrolled } from "./motion";
import SiteBanner from "./SiteBanner";
import TopBar from "./TopBar";
import { useContact } from "@/lib/siteContent/useSiteContent";
import { APPLY_TO, initials, portalFor, SIGN_IN_TO } from "./site";

// The landing page sections (scroll within the page) and the FAQ (its own page), in the order they are offered.
const NAV: { label: string; id: string; page?: string }[] = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Products", id: "products" },
  { label: "FAQs", id: "faq", page: "/faq" },
  { label: "Contact", id: "contact" },
];

// A nav label. On the current link the first letter is set larger than the rest.
// A hidden copy at the larger size sits in the same grid cell, so every link always has the width of its selected form:
// the size change eases in place and never nudges the links beside it.
function NavLabel({ text, on, scale }: { text: string; on: boolean; scale: string }) {
  const lead = text.slice(0, 1);
  const rest = text.slice(1);
  return (
    <span className="inline-grid items-baseline">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
        <span style={{ fontSize: scale }}>{lead}</span>
        {rest}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap text-center">
        <span className="transition-[font-size] duration-300 ease-out motion-reduce:transition-none" style={{ fontSize: on ? scale : "1em" }}>
          {lead}
        </span>
        {rest}
      </span>
    </span>
  );
}

/**
 * `home`     the landing page itself: the links scroll within the page and the current section is marked.
 * `current`  on another page, the id of the nav item that page is (the FAQ passes "faq").
 * `skipTo`   where the keyboard "skip to content" link goes.
 */
export default function SiteHeader({ home = true, current, skipTo = "#main-content" }: { home?: boolean; current?: string; skipTo?: string }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const progress = useScrollProgress();
  const spy = useActiveSection(["home", "products", "testimonials", "about", "contact"]);
  const { user } = useAuth();
  const contact = useContact();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The testimonials band sits between Products and About and has no link of its own: it counts as Products.
  const active = home ? (spy === "testimonials" ? "products" : spy) : (current ?? null);

  const close = useCallback(() => setOpen(false), []);

  // The phone menu: page behind it does not scroll, Escape closes it and puts focus back on its button, and it closes if the screen grows.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const portal = user ? portalFor(user.role) : null;

  // One nav item: a section link on the landing page, a link back to that section from elsewhere, or a page of its own.
  const link = (n: (typeof NAV)[number], className: string, onClick?: () => void, extra?: React.ReactNode, scale = "1.36em") => {
    const props = { "aria-current": active === n.id ? ("true" as const) : undefined, onClick, className };
    const text = <NavLabel text={n.label} on={active === n.id} scale={scale} />;
    if (n.page) return <Link key={n.id} to={n.page} {...props}>{text}{extra}</Link>;
    if (home) return <a key={n.id} href={`#${n.id}`} {...props}>{text}{extra}</a>;
    return <Link key={n.id} to={n.id === "home" ? "/" : `/#${n.id}`} {...props}>{text}{extra}</Link>;
  };

  const goTop = (e: React.MouseEvent) => {
    if (!home) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <>
      <a
        href={skipTo}
        className="fixed left-4 top-3 z-[70] -translate-y-24 rounded-lg bg-brand-blue px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/30"
      >
        Skip to content
      </a>

      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 motion-reduce:transition-none ${
          scrolled || open ? "border-slate-200/80 bg-white/95 shadow-[0_8px_24px_-12px_rgba(15,44,89,0.22)]" : "border-transparent bg-white"
        }`}
      >
        <TopBar show={!scrolled && !open} portal={portal} />
        <SiteBanner />
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 motion-reduce:transition-none sm:px-6 lg:px-8 ${scrolled ? "h-14" : "h-16"}`}>
          <BrandLogo src="/logo-wordmark.png" height={scrolled ? "2rem" : "2.25rem"} className="transition-[height] duration-300 motion-reduce:transition-none" onClick={goTop} />

          {/* Desktop nav */}
          {/* While one link is hovered (or focused with the keyboard), the others fade back so it stands out */}
          <nav aria-label="Main" className="group/nav hidden items-baseline gap-1 md:flex">
            {NAV.map((n) =>
              link(
                n,
                `rounded-lg px-4 py-2 text-sm font-semibold transition-[color,opacity] duration-200 motion-reduce:transition-none group-focus-within/nav:opacity-50 group-hover/nav:opacity-50 hover:!opacity-100 focus-visible:!opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
                  active === n.id ? "text-brand-blue" : "text-slate-600 hover:text-brand-blue"
                }`
              )
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {portal ? (
              <Link to={portal}>
                <Button className="h-10 gap-2.5 rounded-full bg-brand-blue pl-1.5 pr-4 font-semibold text-white hover:bg-[#0b2246]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold tracking-wide ring-1 ring-white/30">{initials(user?.name)}</span>
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to={SIGN_IN_TO}>
                  <Button variant="outline" className="border-brand-blue font-semibold text-brand-blue hover:bg-blue-50">
                    Sign In
                  </Button>
                </Link>
                <Link to={APPLY_TO}>
                  <Button className="bg-red-600 font-bold text-white shadow-md shadow-red-900/20 hover:bg-red-700">Apply Now</Button>
                </Link>
              </>
            )}
          </div>

          {/* Phones: one tap to call, and the menu */}
          <div className="flex items-center gap-1 md:hidden">
            <a
              href={contact.phones[0].href}
              aria-label={`Call us on ${contact.phones[0].label}`}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-brand-blue transition-colors hover:bg-slate-100"
            >
              <Phone className="h-5 w-5" />
            </a>
            <button
              ref={toggleRef}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* How far down the page you are: a thin ember line along the bottom edge once you start scrolling */}
        <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden transition-opacity duration-300 ${scrolled && !open ? "opacity-100" : "opacity-0"}`}>
          <div className="h-full origin-left bg-gradient-to-r from-[#ff6a3d] via-[#e8310a] to-[#b3180a]" style={{ transform: `scaleX(${progress})` }} />
        </div>

        {/* Phone menu: a navy sheet under the bar */}
        <div id="mobile-menu" className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none md:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className={`overflow-hidden transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}>
            <div className="relative max-h-[calc(100svh-4rem)] overflow-y-auto overflow-x-hidden px-5 pb-6 pt-2 text-white" style={navy("linear-gradient(160deg, #0F2C59 0%, #0b2246 60%, #081430 100%)")}>
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <MarkMotif className="absolute -bottom-10 -right-12 w-56" strength={1.4} />
              </div>
              <nav aria-label="Menu" className="relative">
                {NAV.map((n, i) =>
                  link(
                    n,
                    `flex min-h-[54px] items-center gap-4 border-b border-white/10 text-[21px] font-extrabold tracking-tight transition-colors ${active === n.id ? "text-white" : "text-white/80 hover:text-white"}`,
                    close,
                    <>
                      <span className="order-first self-center font-mono text-[12px] font-medium tabular-nums text-white/70">{String(i + 1).padStart(2, "0")}</span>
                      {active === n.id && <span className="ml-auto h-2 w-2 self-center rounded-full bg-red-400" aria-hidden />}
                    </>,
                    "1.22em"
                  )
                )}
              </nav>

              <div className="relative mt-5 flex flex-col gap-3">
                {portal ? (
                  <Link to={portal} onClick={close}>
                    <Button className="h-12 w-full gap-2 bg-white text-[15px] font-bold text-brand-blue hover:bg-slate-100">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to={APPLY_TO} onClick={close}>
                      <Button className="h-12 w-full bg-red-600 text-[15px] font-bold text-white hover:bg-red-700">Apply Now</Button>
                    </Link>
                    <Link to={SIGN_IN_TO} onClick={close}>
                      <Button variant="outline" className="h-12 w-full border-white/50 bg-transparent text-[15px] font-semibold text-white hover:bg-white/10 hover:text-white">
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="relative mt-5 grid gap-3">
                <a href={contact.phones[0].href} className="flex min-h-[56px] items-center gap-3 rounded-xl bg-white/10 px-3.5 ring-1 ring-white/15 transition-colors hover:bg-white/15">
                  <Phone className="h-4 w-4 flex-shrink-0 text-red-300" />
                  <span className="text-[13px] font-semibold leading-tight">Call us<span className="mt-0.5 block text-[12px] font-normal text-white/80">{contact.phones[0].label}</span></span>
                </a>
                <a href={`mailto:${contact.email}`} className="flex min-h-[56px] items-center gap-3 rounded-xl bg-white/10 px-3.5 ring-1 ring-white/15 transition-colors hover:bg-white/15">
                  <Mail className="h-4 w-4 flex-shrink-0 text-red-300" />
                  <span className="min-w-0 text-[13px] font-semibold leading-tight">Email us<span className="mt-0.5 block break-all text-[12px] font-normal text-white/80">{contact.email}</span></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dims the page while the phone menu is open; tapping it closes the menu */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-[#081430]/60 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
    </>
  );
}
