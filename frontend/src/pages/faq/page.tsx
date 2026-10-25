import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Link2, Mail, MapPin, Phone, Search, X } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";
import SiteFooter from "@/components/landing/SiteFooter";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { Reveal } from "@/components/landing/motion";
import { TOPICS, useFaqs, type Faq, type Topic } from "@/components/faq/faqData";
import { useContact } from "@/lib/siteContent/useSiteContent";

type Filter = "All" | Topic;

function CopyLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}/faq#${id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
    >
      <Link2 className="h-3.5 w-3.5" />
      <span aria-live="polite">{copied ? "Link copied" : "Copy link to this answer"}</span>
    </button>
  );
}

function Item({ faq, open, onToggle }: { faq: Faq; open: boolean; onToggle: () => void }) {
  return (
    <li id={faq.id} className="scroll-mt-24">
      <div
        className={`rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 ${
          open ? "border-brand-blue/30 shadow-lg shadow-slate-900/5" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <h3>
          <button
            type="button"
            id={`${faq.id}-q`}
            aria-expanded={open}
            aria-controls={`${faq.id}-a`}
            onClick={onToggle}
            className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/15"
          >
            <span className="flex-1 text-[16px] font-semibold leading-snug text-slate-900">{faq.q}</span>
            <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180 text-brand-blue" : ""}`} />
          </button>
        </h3>
        <div
          id={`${faq.id}-a`}
          role="region"
          aria-labelledby={`${faq.id}-q`}
          className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        >
          <div className={`overflow-hidden transition-[visibility] duration-300 ${open ? "visible" : "invisible"}`}>
            <div className="space-y-3.5 px-5 pb-4 text-[15px] leading-relaxed text-slate-700">
              {faq.answer}
              <div className="border-t border-slate-100 pt-2">
                <CopyLink id={faq.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function FaqPage() {
  const { hash } = useLocation();
  const faqs = useFaqs();
  const contact = useContact();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Filter>("All");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => faqs.filter((f) => (topic === "All" || f.topic === topic) && (!q || `${f.q} ${f.text}`.toLowerCase().includes(q))),
    [faqs, q, topic]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: faqs.length };
    TOPICS.forEach((t) => (c[t] = faqs.filter((f) => f.topic === t).length));
    return c;
  }, [faqs]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // A few matches while searching: show them open so the answer is already in front of the reader.
  const autoOpen = q.length > 0 && results.length <= 3;
  const isOpen = (id: string) => open.has(id) || autoOpen;

  // /faq#documents opens that answer and scrolls to it (also when the hash changes while the page is open).
  const jumpTo = useCallback((id: string) => {
    setTopic("All");
    setQuery("");
    setOpen((prev) => new Set(prev).add(id));
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, []);
  useEffect(() => {
    const id = hash.slice(1);
    if (id && faqs.some((f) => f.id === id)) jumpTo(id);
  }, [hash, jumpTo, faqs]);

  // Search engines read the questions and answers as structured data.
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
    });
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [faqs]);

  const popular = faqs.filter((f) => f.popular);
  const allOpen = results.length > 0 && results.every((f) => isOpen(f.id));
  const grouped = TOPICS.map((t) => ({ topic: t, items: results.filter((f) => f.topic === t) })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader home={false} current="faq" />

      {/* Title band with the search */}
      <section className="relative isolate overflow-hidden px-4 pb-16 pt-28 text-white sm:px-6 lg:px-8" style={navy("linear-gradient(160deg, #0F2C59 0%, #0b2246 55%, #081430 100%)")}>
        <MarkMotif className="pointer-events-none absolute -bottom-20 -right-10 -z-10 w-[420px]" strength={1.4} />
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-red-300">
            <span className="h-px w-6 bg-current opacity-60" aria-hidden />
            Help
            <span className="h-px w-6 bg-current opacity-60" aria-hidden />
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl max-sm:!text-[clamp(26px,7.4vw,32px)]">Frequently Asked Questions</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85">Quick answers about applying, documents, repayment and your account.</p>

          <div className="relative mt-8">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search questions"
              placeholder="Search, for example: password, documents, repay"
              className="min-h-[56px] w-full rounded-2xl border-0 bg-white pl-14 pr-14 text-[16px] text-slate-900 shadow-xl shadow-black/20 placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-white/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!q && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <span className="text-[13px] text-white/85">Popular:</span>
              {popular.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => jumpTo(f.id)}
                  className="min-h-[36px] rounded-full bg-white/10 px-3.5 text-[13px] font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {f.q.replace(/, and what do the statuses mean\?/, "?")}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <main id="main-content" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-12 lg:px-8">
        {/* Topics */}
        <nav aria-label="Topics" className="mb-8 lg:mb-0">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {(["All", ...TOPICS] as Filter[]).map((t) => {
              const on = topic === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  aria-pressed={on}
                  className={`flex min-h-[44px] flex-shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-xl px-4 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
                    on ? "bg-brand-blue text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 lg:bg-transparent lg:ring-0"
                  }`}
                >
                  {t}
                  <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{counts[t]}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p role="status" className="text-[14px] text-slate-700">
              {results.length === 0 ? "No questions match" : `${results.length} question${results.length === 1 ? "" : "s"}`}
              {q && <> for &ldquo;{query.trim()}&rdquo;</>}
            </p>
            {results.length > 1 && (
              <button
                type="button"
                onClick={() => setOpen(allOpen && !autoOpen ? new Set() : new Set(results.map((f) => f.id)))}
                disabled={autoOpen}
                className="min-h-[40px] rounded-lg px-3 text-[13px] font-semibold text-brand-blue hover:bg-blue-50 disabled:cursor-default disabled:text-slate-500 disabled:hover:bg-transparent"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-[16px] font-semibold text-slate-900">Nothing matches that yet</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[15px] text-slate-700">Try a shorter word, or ask us directly. We typically respond within 1 business day.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setTopic("All");
                  }}
                  className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-[14px] font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Clear search
                </button>
                <a href={`mailto:${contact.email}`} className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-blue px-4 text-[14px] font-semibold text-white hover:bg-[#0b2246]">
                  Email us
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-9">
              {grouped.map((g) => (
                <section key={g.topic} aria-labelledby={`topic-${g.topic}`}>
                  {(topic === "All" || grouped.length > 1) && (
                    <h2 id={`topic-${g.topic}`} className="mb-3 text-[13px] font-bold uppercase tracking-widest text-red-700">
                      {g.topic}
                    </h2>
                  )}
                  <ul className="space-y-3">
                    {g.items.map((f) => (
                      <Item key={f.id} faq={f} open={isOpen(f.id)} onToggle={() => toggle(f.id)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {/* Still stuck */}
          <Reveal className="mt-14">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Still have a question?</h2>
              <p className="mt-1.5 text-[15px] text-slate-700">Our team is happy to help. We typically respond within 1 business day.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <a href={`mailto:${contact.email}`} className="group flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition-colors hover:bg-white hover:ring-brand-blue/30">
                  <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-blue" />
                  <span>
                    <span className="block text-[12px] font-bold uppercase tracking-wider text-slate-600">Email</span>
                    <span className="mt-0.5 block break-all text-[14px] font-semibold text-slate-900 group-hover:text-brand-blue">{contact.email}</span>
                  </span>
                </a>
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <Phone className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-blue" />
                  <span>
                    <span className="block text-[12px] font-bold uppercase tracking-wider text-slate-600">Phone</span>
                    {contact.phones.map((p) => (
                      <a key={p.href} href={p.href} className="block py-0.5 text-[14px] font-semibold text-slate-900 hover:text-brand-blue">
                        {p.label}
                      </a>
                    ))}
                  </span>
                </div>
                <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 transition-colors hover:bg-white hover:ring-brand-blue/30">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-blue" />
                  <span>
                    <span className="block text-[12px] font-bold uppercase tracking-wider text-slate-600">Visit</span>
                    <span className="mt-0.5 block text-[14px] font-semibold text-slate-900 group-hover:text-brand-blue">{contact.address}</span>
                  </span>
                </a>
              </div>
              <p className="mt-5 text-[14px] text-slate-700">
                Prefer to write?{" "}
                <Link to="/#contact" className="font-semibold text-brand-blue hover:underline">
                  Use the contact form
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter home={false} />
    </div>
  );
}
