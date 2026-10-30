import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  Calculator,
  Check,
  CheckCircle,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { CountUp, Reveal } from "@/components/landing/motion";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import SectionHeader from "@/components/landing/SectionHeader";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { APPLY_TO, CONSULTANCY_URL } from "@/components/landing/site";
import { InlineText } from "@/lib/siteContent/format";
import type { ProductCard } from "@/lib/siteContent/types";
import { useContact, useSiteContent } from "@/lib/siteContent/useSiteContent";

// ─── Shared pieces ────────────────────────────────────────────────────────────

// ─── Hero ─────────────────────────────────────────────────────────────────────

// The icons of the three steps, in order (the hero card and the How It Works section share them).
const STEP_ICONS = [Users, CreditCard, TrendingUp];

// A glass card on the right of the hero: the first loan product's points and the three step names, with the step you are "on" moving along.
// It has no text of its own: it follows the first product and the How It Works steps, so one edit changes every place the same words appear.
function HeroCard({ product, stepNames }: { product: ProductCard; stepNames: string[] }) {
  const steps = stepNames.map((label, i) => ({ label, icon: STEP_ICONS[i] }));
  const features = product.features;
  const [active, setActive] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % steps.length), 2400);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md motion-safe:animate-float-slow">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-3xl bg-white/5 ring-1 ring-white/10" />
      <div className="relative rounded-3xl bg-[#081430]/60 p-6 shadow-2xl shadow-black/40 ring-1 ring-white/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-[17px] font-bold leading-tight text-white">{product.title}</p>
            <p className="mt-0.5 font-display text-[12px] font-semibold uppercase tracking-wider text-blue-100">{product.tag}</p>
          </div>
        </div>

        <ol className="mt-7 flex items-start">
          {steps.map((step, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <li key={i} className="relative flex flex-1 flex-col items-center">
                {i > 0 && (
                  <span className="absolute right-1/2 top-5 h-0.5 w-full -translate-y-1/2 bg-white/20" aria-hidden>
                    <span className={`block h-full bg-white transition-[width] duration-700 ${i <= active ? "w-full" : "w-0"}`} />
                  </span>
                )}
                <span
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 ${
                    current ? "bg-red-600 text-white shadow-lg shadow-red-900/50" : done ? "bg-white text-[#0F2C59]" : "border border-white/30 bg-[#0b1f45] text-white/80"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <step.icon className="h-4 w-4" />}
                  {current && <span className="absolute inset-0 rounded-full bg-red-500/50 motion-safe:animate-ping" />}
                </span>
                <span className={`mt-2 text-[12px] font-bold ${current || done ? "text-white" : "text-white/75"}`}>{step.label}</span>
              </li>
            );
          })}
        </ol>

        <ul className="mt-7 space-y-2.5 border-t border-white/15 pt-5">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[14px] text-white/90">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-red-300" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HeroSection() {
  const { home_hero: hero, home_products: products, home_how: how } = useSiteContent();
  const contact = useContact();

  return (
    <section id="home" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#081430] pt-16">
      {/* The photo is greyscale, so the navy scrim makes it a navy duotone instead of an unrelated colour cast (see .hero-photo in globals.css). */}
      <div className="hero-photo absolute inset-0 -z-10" />
      {/* Small screens: text spans the full width, so keep the scrim even top to bottom */}
      <div
        className="absolute inset-0 -z-10 lg:hidden"
        style={navy("linear-gradient(to bottom, rgba(8,20,48,0.92), rgba(11,31,69,0.92) 55%, rgba(8,20,48,0.96))")}
      />
      {/* Large screens: solid navy behind the text column, easing off so the photo reads on the right */}
      <div
        className="absolute inset-0 -z-10 hidden lg:block"
        style={navy(
          "radial-gradient(40% 50% at 80% 40%, rgba(59,130,246,0.22), transparent 70%), linear-gradient(100deg, rgba(8,20,48,0.96) 0%, rgba(11,31,69,0.92) 42%, rgba(15,44,89,0.62) 64%, rgba(15,44,89,0.48) 100%)",
          2
        )}
      />
      <MarkMotif className="pointer-events-none absolute -bottom-32 -right-24 -z-10 hidden w-[620px] lg:block" strength={1.3} />
      {/* Grounds the stats at the bottom */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-[#081430]/70 to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] [@media(max-height:780px)]:py-16">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#081430]/50 px-4 py-1.5 backdrop-blur-sm motion-safe:animate-auth-rise">
            <span className="h-2 w-2 rounded-full bg-red-400 motion-safe:animate-pulse" />
            <span className="font-display text-[12px] font-semibold uppercase tracking-[0.14em] text-blue-50">{hero.badge}</span>
          </div>

          {/* globals.css forces every h1 to 1.5rem under 640px; keep the hero headline display-sized on phones */}
          <h1 className="mb-6 font-display text-4xl font-bold leading-[1.1] tracking-[-0.015em] text-white drop-shadow-[0_2px_24px_rgba(8,20,48,0.45)] sm:text-5xl lg:text-6xl max-sm:!text-[clamp(28px,8.6vw,36px)] max-sm:!leading-[1.12]">
            {hero.headline_1}
            <br />
            <span className="bg-gradient-to-r from-red-300 via-red-200 to-amber-200 bg-clip-text text-transparent">{hero.headline_2}</span>
          </h1>

          <p className="mb-10 max-w-xl text-pretty text-[17px] leading-relaxed text-blue-50 sm:text-xl">
            <InlineText source={hero.intro} contact={contact} bold={(text, key) => <span key={key} className="font-semibold text-white">{text}</span>} />
          </p>

          <div className="mb-11 flex flex-wrap gap-4">
            <Link to={APPLY_TO}>
              <Button
                size="lg"
                className="group h-14 bg-red-600 px-8 font-display text-[15px] font-semibold text-white shadow-xl shadow-red-950/40 transition-transform hover:scale-105 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#081430] motion-reduce:transform-none sm:text-base"
              >
                {hero.primary_label}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-white/70 bg-white/10 px-8 font-display text-[15px] font-semibold text-white backdrop-blur-sm hover:border-white hover:bg-white hover:text-blue-950 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#081430] sm:text-base"
              onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
            >
              {hero.secondary_label}
            </Button>
          </div>

          {/* Stats: just the numbers, under one hairline, so they support the headline instead of competing with it */}
          <dl className="grid grid-cols-3 gap-x-4 border-t border-white/15 pt-6 sm:gap-x-10">
            {hero.stats.map(({ label, value }, i) => (
              <div key={i}>
                <dd className="order-first whitespace-nowrap font-display text-[20px] font-bold leading-none tracking-tight text-white max-[359px]:text-[18px] sm:text-[28px]">
                  <CountUp key={value} value={value} />
                </dd>
                <dt className="mt-2 text-[12px] leading-tight text-blue-100 sm:text-[13px]">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="hidden xl:block">
          <HeroCard product={products.items[0]} stepNames={how.steps.map((x) => x.title)} />
        </div>
      </div>

      {/* Bottom wave, filled with exactly the colour of the next section */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" aria-hidden>
          <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 40C480 80 240 0 0 40L0 80Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCT_ICONS = [Briefcase, CreditCard, Shield];
// One to three cards: the grid has as many columns as there are cards.
const PRODUCT_COLUMNS = ["md:grid-cols-1 md:mx-auto md:max-w-md", "md:grid-cols-2 md:mx-auto md:max-w-4xl", "md:grid-cols-3"];

function ProductsSection() {
  const { home_products: block } = useSiteContent();
  const products = block.items.map((p, i) => ({ icon: PRODUCT_ICONS[i], title: p.title, tag: p.tag, description: p.description, features: p.features, featured: p.featured, comingSoon: p.coming_soon }));

  return (
    <section id="products" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={block.eyebrow} title={block.title}>
          {block.lead}
        </SectionHeader>

        <div className={`grid items-stretch gap-6 ${PRODUCT_COLUMNS[products.length - 1]} lg:gap-8`}>
          {products.map((product, i) => (
            <Reveal key={i} delay={i * 110} className="flex">
              <div
                className={`relative flex w-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300 sm:p-8 ${
                  product.featured
                    ? "text-white shadow-2xl shadow-blue-950/30 ring-1 ring-white/10 hover:-translate-y-1 md:-my-4 md:py-12"
                    : product.comingSoon
                      ? "border border-dashed border-slate-300 bg-white/60"
                      : "border border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10"
                }`}
                style={product.featured ? navy("linear-gradient(160deg, #0F2C59 0%, #0b2246 55%, #081430 100%)") : undefined}
              >
                {product.featured && <MarkMotif className="pointer-events-none absolute -bottom-10 -right-10 w-56" strength={1.6} />}
                {product.featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">Most Popular</span>
                )}
                {product.comingSoon && (
                  <span className="absolute right-6 top-6 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">Coming Soon</span>
                )}

                <div
                  className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl ${
                    product.featured ? "bg-white/15 ring-1 ring-white/20" : product.comingSoon ? "bg-slate-100" : "bg-blue-50"
                  }`}
                >
                  <product.icon className={`h-6 w-6 ${product.featured ? "text-white" : product.comingSoon ? "text-slate-500" : "text-brand-blue"}`} />
                </div>

                <span className={`relative mb-2 font-display text-xs font-semibold uppercase tracking-wider ${product.featured ? "text-blue-100" : "text-red-700"}`}>
                  {product.tag}
                </span>
                <h3 className={`relative mb-3 font-display text-xl font-bold tracking-tight ${product.featured ? "text-white" : "text-slate-900"}`}>{product.title}</h3>
                <p className={`relative mb-6 flex-1 text-[15px] leading-relaxed ${product.featured ? "text-white/85" : "text-slate-600"}`}>{product.description}</p>

                <ul className="relative mb-8 space-y-3">
                  {product.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2.5">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${product.featured ? "text-red-300" : product.comingSoon ? "text-slate-400" : "text-brand-blue"}`} />
                      <span className={`text-[14px] ${product.featured ? "text-white/90" : "text-slate-700"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {product.comingSoon ? (
                  <Button
                    disabled
                    className="relative h-11 w-full cursor-not-allowed border-slate-200 bg-slate-100 text-[14px] font-bold text-slate-600 opacity-100 disabled:opacity-100"
                    variant="outline"
                  >
                    Coming Soon
                  </Button>
                ) : (
                  <Link to={APPLY_TO} className="relative">
                    <Button
                      className={`group h-11 w-full font-display text-[14px] font-semibold ${product.featured ? "bg-red-600 text-white hover:bg-red-700" : "border-brand-blue text-brand-blue hover:bg-blue-50"}`}
                      variant={product.featured ? "default" : "outline"}
                    >
                      Apply Now <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const { home_how: how } = useSiteContent();
  // The number, icon and colour of each step come from its position; the words come from the editable text.
  const steps = how.steps.map((x, i) => ({ step: String(i + 1).padStart(2, "0"), icon: STEP_ICONS[i], title: x.title, description: x.description, color: i === 1 ? "bg-red-600" : "bg-brand-blue" }));

  return (
    <section id="about" className="scroll-mt-16 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={how.eyebrow} title={how.title}>
          {how.lead}
        </SectionHeader>

        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-12">
          {/* The rail the three steps sit on (wide screens), with a chevron between each pair */}
          <span className="absolute left-[16.67%] right-[16.67%] top-10 hidden border-t-2 border-dashed border-slate-300 md:block" aria-hidden />
          {[1, 2].map((n) => (
            <span
              key={n}
              className="absolute top-10 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 md:flex"
              style={{ left: `${(n * 100) / 3}%` }}
              aria-hidden
            >
              <ChevronRight className="h-4 w-4" />
            </span>
          ))}

          {steps.map((step, i) => (
            <li key={i} className="relative">
              <Reveal delay={i * 140} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                {/* Phones: a dashed rail joins each step to the next */}
                {i < steps.length - 1 && <span className="absolute bottom-[-2.5rem] left-[1.75rem] top-14 border-l-2 border-dashed border-slate-300 md:hidden" aria-hidden />}
                <div className="relative flex-shrink-0 md:mb-2">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ring-8 ring-white md:h-20 md:w-20 ${step.color}`}>
                    <step.icon className="h-6 w-6 text-white md:h-9 md:w-9" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-100 bg-white text-xs font-extrabold text-slate-600 shadow-sm md:h-7 md:w-7">
                    {step.step}
                  </span>
                </div>
                <div>
                  <h3 className="mb-2 font-display text-xl font-bold tracking-tight text-slate-900 md:mb-3">{step.title}</h3>
                  <p className="max-w-xs text-[15px] leading-relaxed text-slate-600">{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal className="mt-16 sm:mt-20">
          <div
            className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-3xl p-8 ring-1 ring-white/10 sm:flex-row sm:p-10"
            style={navy("linear-gradient(110deg, #0F2C59 0%, #0b2246 60%, #081430 100%)")}
          >
            <MarkMotif className="pointer-events-none absolute -bottom-16 right-24 w-64 sm:right-40" strength={1.5} />
            <div className="relative text-center sm:text-left">
              <h3 className="font-display text-2xl font-bold tracking-tight text-white">{how.cta.title}</h3>
              <p className="mt-1 text-[15px] text-white/80">{how.cta.text}</p>
            </div>
            <Link to={APPLY_TO} className="relative">
              <Button size="lg" className="group h-12 flex-shrink-0 bg-red-600 px-8 font-display text-[15px] font-semibold text-white shadow-lg shadow-red-950/40 hover:bg-red-700">
                {how.cta.button} <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────

const fieldClass =
  "w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-500 transition-[border-color,box-shadow] hover:border-slate-300 focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/10";

function ContactSection() {
  const contact = useContact();
  const { home_headings: headings } = useSiteContent();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const contactDetails = [
    {
      icon: MapPin,
      label: "Address",
      content: <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="tap-link inline-block py-1.5 hover:text-brand-blue hover:underline">{contact.address}</a>,
    },
    {
      icon: Mail,
      label: "Email",
      content: <a href={`mailto:${contact.email}`} className="tap-link inline-block py-1.5 hover:text-brand-blue hover:underline">{contact.email}</a>,
    },
    {
      icon: Phone,
      label: "Phone",
      content: (
        <>
          {contact.phones.map((p, i) => (
            <span key={p.href}>
              {i > 0 && " | "}
              <a href={p.href} className="tap-link inline-block py-1.5 hover:text-brand-blue hover:underline">{p.label}</a>
            </span>
          ))}
        </>
      ),
    },
    // Not a loan question: point it to the consultancy so it does not land in the loan inbox.
    {
      icon: Calculator,
      label: "Business tax & accounting",
      content: (
        <>
          <a href={CONSULTANCY_URL} target="_blank" rel="noopener" className="tap-link inline-flex items-center gap-1.5 py-1.5 hover:text-brand-blue hover:underline">
            Leocap Consultancy
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="block text-[14px] font-normal text-slate-600">Tax, accounting and payroll support for businesses.</span>
        </>
      ),
    },
  ];

  // There is no contact service behind this form, so Send Message hands the note to the visitor's own email app.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const subject = `Message from ${name}`;
    const body = `${form.message.trim()}\n\n${name}\n${form.email.trim()}`;
    window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_self");
  };

  return (
    <section id="contact" className="scroll-mt-16 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow={headings.contact_eyebrow} title={headings.contact_title}>
          {headings.contact_lead}
        </SectionHeader>

        <div className="grid items-start gap-12 md:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="mb-10 space-y-6">
              {contactDetails.map(({ icon: Icon, label, content }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-blue shadow-md shadow-blue-950/20">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-600">{label}</p>
                    <p className="font-semibold text-slate-900">{content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative h-56 overflow-hidden rounded-3xl bg-slate-100 shadow-sm ring-1 ring-slate-200">
              <iframe
                title="Location Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={contact.mapEmbedUrl}
              />
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Google Maps"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition-colors hover:text-brand-blue"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <label htmlFor="contact-name" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Jane Mwangi"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  placeholder="Tell us how we can help..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`${fieldClass} resize-none`}
                />
              </div>

              <Button
                type="submit"
                className="group h-12 w-full rounded-xl bg-brand-blue font-bold text-white shadow-[0_10px_24px_-10px_rgba(15,44,89,0.65)] hover:bg-[#0b2246]"
              >
                Send Message
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>

              <p className="text-center text-xs text-slate-600">We typically respond within 1 business day.</p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function Home() {
  const { hash } = useLocation();

  // Arriving from another page with a #section (the FAQ's header and footer links): scroll to it.
  useEffect(() => {
    if (!hash) return;
    const id = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(id);
  }, [hash]);

  // Smooth anchor scrolling belongs to this page only; the rest of the app keeps instant jumps.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <main className="min-h-screen">
      <SiteHeader skipTo="#home" />
      <HeroSection />
      <ProductsSection />
      <TestimonialsSection />
      <HowItWorks />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
