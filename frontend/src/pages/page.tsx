

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Menu,
  Phone,
  Shield,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";

// ─── Brand Logo ───────────────────────────────────────────────────────────────

// Removed old Logo function in favor of BrandLogo

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  const navLinks = ["Home", "About", "Products", "Contact"];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <BrandLogo />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-sm font-medium text-slate-600 hover:text-brand-blue transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button
              variant="outline"
              className="border-brand-blue text-brand-blue hover:bg-blue-50 font-semibold"
            >
              Sign In
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-900/20">
              Apply Now
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-5 pt-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-700 hover:text-brand-blue py-2.5 border-b border-slate-100 transition-colors"
            >
              {link}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-4">
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full border-brand-blue text-brand-blue"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/login">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  const stats = [
    { icon: Users, label: "Clients Served", value: "500+" },
    { icon: TrendingUp, label: "Disbursed", value: "KES 50M+" },
    { icon: Clock, label: "Approval Time", value: "24 Hrs" },
  ];

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-16"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/97 via-blue-900/92 to-blue-700/75" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-24">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-blue-100 text-xs font-semibold tracking-wider uppercase">
              Trusted Fintech · Nairobi, Kenya
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
            Fast, Flexible Loans
            <br />
            <span className="text-red-400">for Kenyan Professionals</span>
          </h1>

          <p className="text-lg text-blue-100 mb-10 leading-relaxed max-w-xl">
            Salary advances, personal loans, and more — approved within{" "}
            <span className="text-white font-semibold">24 hours</span>. Empowering
            Kenyan professionals with fast, fair, and flexible financial solutions.
          </p>

          <div className="flex flex-wrap gap-4 mb-20">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-base px-8 h-14 shadow-xl shadow-red-900/30 transition-transform hover:scale-105"
              >
                Apply for a Loan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-white/60 text-white hover:bg-white/20 hover:border-white text-base px-8 h-14 backdrop-blur-sm"
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Floating stats */}
        <div className="flex flex-wrap gap-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 hover:bg-white/15 transition-colors"
            >
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-2xl leading-none">
                  {value}
                </p>
                <p className="text-blue-200 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 80L1440 80L1440 40C1200 80 960 0 720 40C480 80 240 0 0 40L0 80Z"
            fill="#f9fafb"
          />
        </svg>
      </div>
    </section>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

function ProductsSection() {
  const products = [
    {
      icon: Briefcase,
      title: "Salary Advance",
      tag: "For Employed Professionals",
      description:
        "Access up to 50% of your net salary before payday. Quick disbursement directly to M-Pesa or your bank account, with repayment deducted from your next paycheck.",
      features: [
        "Up to 50% of net salary",
        "Same-day disbursement",
        "Zero collateral required",
      ],
      featured: false,
      comingSoon: false,
    },
    {
      icon: CreditCard,
      title: "Personal Loan",
      tag: "Open to Employed Kenyans",
      description:
        "Whether you're employed or self-employed, our personal loan gives you access to larger amounts for business, education, or personal growth projects.",
      features: [
        "Up to KES 500,000",
        "1 month tenure",
        "Competitive interest rates",
      ],
      featured: true,
      comingSoon: false,
    },
    {
      icon: Shield,
      title: "Installment Loan",
      tag: "Flexible Repayment",
      description:
        "Access larger loan amounts repaid in structured monthly instalments. Designed for business investment, home improvement, or long-term financial goals.",
      features: [
        "Structured monthly repayments",
        "Extended repayment periods",
        "Fixed, predictable schedule",
      ],
      featured: false,
      comingSoon: true,
    },
  ];

  return (
    <section id="products" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-red-600 text-xs font-bold uppercase tracking-widest">
            Our Products
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">
            Loan Solutions Built for You
          </h2>
          <p className="mt-4 text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
            Straightforward products, transparent terms, and fast disbursement —
            designed around the Kenyan professional.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {products.map((product) => (
            <div
              key={product.title}
              className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${product.featured
                ? "bg-gradient-to-br from-blue-900 to-blue-700 text-white shadow-2xl shadow-blue-900/30 md:-mt-4"
                : "bg-white border border-slate-100 shadow-md hover:shadow-xl"
                }`}
            >
              {product.featured && (
                <span className="absolute top-6 right-6 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              {product.comingSoon && (
                <span className="absolute top-6 right-6 bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              )}

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${product.featured ? "bg-white/20" : "bg-blue-50"
                  }`}
              >
                <product.icon
                  className={`h-6 w-6 ${product.featured ? "text-white" : "text-brand-blue"}`}
                />
              </div>

              <span
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${product.featured ? "text-blue-200" : "text-red-600"
                  }`}
              >
                {product.tag}
              </span>
              <h3
                className={`text-xl font-black mb-3 ${product.featured ? "text-white" : "text-slate-900"
                  }`}
              >
                {product.title}
              </h3>
              <p
                className={`text-sm leading-relaxed mb-6 flex-1 ${product.featured ? "text-blue-100" : "text-slate-500"
                  }`}
              >
                {product.description}
              </p>

              <ul className="space-y-2.5 mb-8">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <CheckCircle
                      className={`h-4 w-4 flex-shrink-0 ${product.featured ? "text-red-400" : "text-brand-blue"
                        }`}
                    />
                    <span
                      className={`text-sm ${product.featured ? "text-blue-100" : "text-gray-700"
                        }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {product.comingSoon ? (
                <Button
                  disabled
                  className="w-full font-bold cursor-not-allowed opacity-60 border-gray-300 text-slate-400"
                  variant="outline"
                >
                  Coming Soon
                </Button>
              ) : (
                <Link to="/login">
                  <Button
                    className={`w-full font-bold ${product.featured
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "border-brand-blue text-brand-blue hover:bg-blue-50"
                      }`}
                    variant={product.featured ? "default" : "outline"}
                  >
                    Apply Now <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Users,
      title: "Register",
      description:
        "Create your account with your national ID and employer details. The whole process takes under 3 minutes on your phone.",
      color: "bg-blue-900",
    },
    {
      step: "02",
      icon: CreditCard,
      title: "Apply",
      description:
        "Choose your loan product, enter the amount you need, and submit your digital application — no paperwork, no branch visits.",
      color: "bg-red-600",
    },
    {
      step: "03",
      icon: TrendingUp,
      title: "Get Funded",
      description:
        "Receive funds directly to your M-Pesa or bank account within 24 hours of approval. It really is that simple.",
      color: "bg-blue-900",
    },
  ];

  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-red-600 text-xs font-bold uppercase tracking-widest">
            Simple Process
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">
            How It Works
          </h2>
          <p className="mt-4 text-slate-500 max-w-md mx-auto text-sm">
            From application to cash in hand — we&apos;ve made it as easy as
            possible.
          </p>
        </div>

        <div className="relative grid md:grid-cols-3 gap-12">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-0.5 bg-gradient-to-r from-blue-200 via-red-200 to-blue-200" />

          {steps.map((step) => (
            <div
              key={step.step}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${step.color}`}
                >
                  <step.icon className="h-9 w-9 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-7 h-7 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center text-xs font-black text-slate-400 shadow-sm">
                  {step.step}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">
                {step.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl bg-gradient-to-r from-blue-900 to-blue-700 p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-white">
              Ready to get started?
            </h3>
            <p className="text-blue-200 mt-1 text-sm">
              Join 500+ professionals who trust Leocap Invest.
            </p>
          </div>
          <Link to="/login">
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 h-12 flex-shrink-0"
            >
              Apply in Minutes <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars

function Testimonials() {
  const testimonials = [
    {
      name: "Wanjiku Muthoni",
      role: "Accountant, Ideon Limited",
      quote:
        "I needed school fees urgently and Leocap approved my salary advance in just 4 hours. The whole process was on my phone — no paperwork, no stress whatsoever.",
      initials: "WM",
    },
    {
      name: "Brian Ochieng",
      role: "Sales Executive, Nakama Group",
      quote:
        "Finally a lender that understands salaried employees. The rates are fair, the team is responsive, and the app is dead simple to use. I've recommended it to my whole department.",
      initials: "BO",
    },
    {
      name: "Aisha Abdi",
      role: "Consultant, Nairobi",
      quote:
        "Got a personal loan of KES 200,000 for my business expansion. The process took two days and the repayment plan is very manageable. Excellent service.",
      initials: "AA",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-blue-950 to-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-red-400 text-xs font-bold uppercase tracking-widest">
            Testimonials
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-white">
            Loved by Kenyan Professionals
          </h2>
          <p className="mt-4 text-blue-200 text-sm max-w-md mx-auto">
            Don&apos;t take our word for it — here&apos;s what our clients say.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col hover:bg-white/15 transition-colors"
            >
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-blue-100 text-sm leading-relaxed flex-1 mb-6 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{t.name}</p>
                  <p className="text-blue-300 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const contactDetails = [
    { icon: MapPin, label: "Address", value: "Applewood Adams, Along Ngong Road, Nairobi" },
    { icon: Mail, label: "Email", value: "info@leocapinvest.co.ke" },
    { icon: Phone, label: "Phone", value: "+254 722 221 502 | +254 721 834 959" },
  ];

  return (
    <section id="contact" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-red-600 text-xs font-bold uppercase tracking-widest">
            Get In Touch
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">
            We&apos;d Love to Hear from You
          </h2>
          <p className="mt-4 text-slate-500 max-w-md mx-auto text-sm">
            Have questions about our products or need assistance? Our team is
            happy to help.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div className="space-y-6 mb-10">
              {contactDetails.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {label}
                    </p>
                    <p className="text-slate-800 font-semibold">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-200 h-56 relative shadow-inner">
              <iframe
                title="Location Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src="https://maps.google.com/maps?q=Applewood+Adams,+Ngong+Road,+Nairobi&t=&z=15&ie=UTF8&iwloc=&output=embed"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Mwangi"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message
              </label>
              <textarea
                rows={5}
                placeholder="Tell us how we can help..."
                value={form.message}
                onChange={(e) =>
                  setForm({ ...form, message: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors resize-none placeholder:text-gray-300"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold py-3 h-12 rounded-xl"
            >
              Send Message
            </Button>

            <p className="text-center text-xs text-slate-400">
              We typically respond within 1 business day.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-gray-950 text-slate-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo size="lg" />
            <p className="mt-4 text-sm leading-relaxed text-slate-500 max-w-xs">
              Empowering Kenyan professionals with fast, fair, and flexible
              financial solutions.
            </p>
          </div>

          <div>
            <p className="text-white text-sm font-bold mb-4">Products</p>
            <ul className="space-y-2.5 text-sm">
              {[
                "Salary Advance",
                "Personal Loan",
                "Installment Loan",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#products"
                    className="hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-white text-sm font-bold mb-4">Company</p>
            <ul className="space-y-2.5 text-sm">
              {["About Us", "How It Works", "FAQs", "Privacy Policy"].map(
                (item) => (
                  <li key={item}>
                    <a href="#" className="hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <p className="text-white text-sm font-bold mb-4">Contact</p>
            <ul className="space-y-2.5 text-sm">
              <li>Applewood Adams, Along Ngong Road, Nairobi</li>
              <li>
                <a
                  href="mailto:info@leocapinvest.co.ke"
                  className="hover:text-white transition-colors"
                >
                  info@leocapinvest.co.ke
                </a>
              </li>
              <li>
                <a
                  href="tel:+254722221502"
                  className="hover:text-white transition-colors"
                >
                  +254 722 221 502
                </a>
              </li>
              <li>
                <a
                  href="tel:+254721834959"
                  className="hover:text-white transition-colors"
                >
                  +254 721 834 959
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            &copy; {new Date().getFullYear()} Leocap Invest. All rights
            reserved.
          </p>
          <p className="text-slate-600">
            Financial advisory and lending solutions for Kenyan professionals · Nairobi, Kenya
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ProductsSection />
      <HowItWorks />
      <ContactSection />
      <Footer />
    </main>
  );
}
