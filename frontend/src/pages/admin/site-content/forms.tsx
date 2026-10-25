import { useState, type MouseEvent } from "react";
import { ChevronDown, Star, TriangleAlert } from "lucide-react";
import { BannerBar } from "@/components/landing/SiteBanner";
import { BANNER_TONES, TOPICS, type BannerBlock, type ContactBlock, type ContactView, type FaqItem, type TestimonialItem } from "@/lib/siteContent/types";
import RichTextField from "./RichTextField";
import { AddButton, card, Check, dropItem, Field, inputClass, moveItem, newKey, patchItem, RowTools } from "./fields";

// One form per block. Each works on a copy of the block that the editor page holds; list rows carry a `_k` key so they
// keep their place on screen when moved (the key is removed again before anything is sent to the server).

export type Keyed<T> = T & { _k: string; _auto?: boolean };
export type ContactValue = Omit<ContactBlock, "phones"> & { phones: Keyed<{ number: string }>[] };
export type TestimonialsValue = { items: Keyed<TestimonialItem>[] };
export type FaqValue = { items: Keyed<FaqItem>[] };

interface FormProps<T> {
  value: T;
  onChange: (value: T) => void;
  contact: ContactView;
}

const PRODUCTS = ["Salary Advance", "Personal Loan", "Installment Loan"];

// ─── Contact ──────────────────────────────────────────────────────────────────

export function ContactForm({ value, onChange }: FormProps<ContactValue>) {
  const set = (patch: Partial<ContactValue>) => onChange({ ...value, ...patch });
  return (
    <div className={`${card} space-y-4`}>
      <Field label="Email address" htmlFor="contact-email" count={{ n: value.email.length, max: 120 }}>
        <input id="contact-email" type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-1 text-[13px] font-medium text-slate-700">Phone numbers</legend>
        <ul className="space-y-1.5">
          {value.phones.map((p, i) => (
            <li key={p._k} className="flex items-center gap-1">
              <input
                aria-label={`Phone number ${i + 1}`}
                value={p.number}
                onChange={(e) => set({ phones: patchItem(value.phones, i, { number: e.target.value }) })}
                placeholder="+254 722 000 000"
                className={inputClass}
              />
              <RowTools
                index={i}
                count={value.phones.length}
                what={`phone number ${i + 1}`}
                onMove={(to) => set({ phones: moveItem(value.phones, i, to) })}
                onRemove={() => value.phones.length > 1 && set({ phones: dropItem(value.phones, i) })}
              />
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[12px] leading-snug text-slate-500">The first number is the one behind the phone button in the page header and on the sign-in pages. Up to 4 numbers; at least one is needed.</p>
        <div className="mt-2">
          <AddButton disabled={value.phones.length >= 4} onClick={() => set({ phones: [...value.phones, { _k: newKey(), number: "" }] })}>
            Add a phone number
          </AddButton>
        </div>
      </fieldset>

      <Field label="Address" htmlFor="contact-address" count={{ n: value.address.length, max: 200 }} hint="The home page map follows this address.">
        <input id="contact-address" value={value.address} onChange={(e) => set({ address: e.target.value })} className={inputClass} />
      </Field>

      <Field label="Map link (optional)" htmlFor="contact-map" hint="Where the address links to. Leave it empty to link to a Google Maps search for the address. Must start with https://">
        <input id="contact-map" value={value.maps_url} onChange={(e) => set({ maps_url: e.target.value })} placeholder="https://www.google.com/maps/..." className={inputClass} />
      </Field>
    </div>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

const TONE_NAMES: Record<(typeof BANNER_TONES)[number], { name: string; swatch: string }> = {
  info: { name: "Information (blue)", swatch: "bg-brand-blue" },
  warning: { name: "Warning (amber)", swatch: "bg-amber-400" },
  success: { name: "Good news (green)", swatch: "bg-emerald-700" },
};

const keepHere = (e: MouseEvent) => {
  if ((e.target as Element).closest("a")) e.preventDefault();
};

export function BannerForm({ value, onChange }: FormProps<BannerBlock>) {
  const set = (patch: Partial<BannerBlock>) => onChange({ ...value, ...patch });
  return (
    <div className={`${card} space-y-4`}>
      <Check id="banner-on" checked={value.enabled} onChange={(enabled) => set({ enabled })}>
        <span className="font-medium">Show the banner on the public pages</span>
        <span className="block text-[12px] text-slate-500">It appears across the top of the home page and the FAQ page once published.</span>
      </Check>

      <Field label="Message" htmlFor="banner-text" count={{ n: value.text.length, max: 200 }} hint="Keep it short: one or two sentences.">
        <textarea id="banner-text" rows={2} value={value.text} onChange={(e) => set({ text: e.target.value })} className={`${inputClass} resize-y`} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Link text (optional)" htmlFor="banner-link-label" count={{ n: value.link_label.length, max: 40 }}>
          <input id="banner-link-label" value={value.link_label} onChange={(e) => set({ link_label: e.target.value })} placeholder="Read more" className={inputClass} />
        </Field>
        <Field label="Link address (optional)" htmlFor="banner-link-url" hint="A page on this site such as /faq#track, or https://...">
          <input id="banner-link-url" value={value.link_url} onChange={(e) => set({ link_url: e.target.value })} placeholder="/faq" className={inputClass} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {BANNER_TONES.map((tone) => (
            <label key={tone} className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] ring-1 transition-colors focus-within:ring-2 focus-within:ring-brand-blue/40 ${value.tone === tone ? "bg-blue-50 font-medium text-brand-blue ring-brand-blue/40" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"}`}>
              <input type="radio" name="banner-tone" checked={value.tone === tone} onChange={() => set({ tone })} className="sr-only" />
              <span className={`h-3 w-3 rounded-full ${TONE_NAMES[tone].swatch}`} aria-hidden />
              {TONE_NAMES[tone].name}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="mb-1.5 text-[12px] font-medium text-slate-600">How it looks{!value.enabled && " (switched off: visitors will not see it)"}</p>
        {value.text.trim() ? (
          <div onClickCapture={keepHere} className={`overflow-hidden rounded-lg ring-1 ring-slate-200 ${value.enabled ? "" : "opacity-50"}`}>
            <BannerBar banner={value} />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-[13px] italic text-slate-400">Type a message to see it here.</p>
        )}
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export function TestimonialsForm({ value, onChange }: FormProps<TestimonialsValue>) {
  const set = (items: TestimonialsValue["items"]) => onChange({ items });
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-[13px] leading-snug text-slate-700 ring-1 ring-blue-100">
        Only add real quotes. A quote is shown to visitors only when you tick that the client agreed to be quoted by name; quotes without the tick are kept here but never leave the server. The Testimonials section stays hidden until at least one quote is ticked and published.
      </p>

      {value.items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-[13px] text-slate-500">No testimonials yet.</p>}

      <ul className="space-y-3">
        {value.items.map((t, i) => {
          const id = `t-${t._k}`;
          const put = (patch: Partial<Keyed<TestimonialItem>>) => set(patchItem(value.items, i, patch));
          return (
            <li key={t._k} className={`${card} space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-slate-900">
                  {i + 1}. {t.name || "New testimonial"}
                </h3>
                <RowTools index={i} count={value.items.length} what={`testimonial ${i + 1}`} onMove={(to) => set(moveItem(value.items, i, to))} onRemove={() => set(dropItem(value.items, i))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor={`${id}-name`} count={{ n: t.name.length, max: 80 }}>
                  <input id={`${id}-name`} value={t.name} onChange={(e) => put({ name: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Role or company" htmlFor={`${id}-role`} count={{ n: t.role.length, max: 100 }}>
                  <input id={`${id}-role`} value={t.role} onChange={(e) => put({ role: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Quote" htmlFor={`${id}-quote`} count={{ n: t.quote.length, max: 500 }}>
                <textarea id={`${id}-quote`} rows={3} value={t.quote} onChange={(e) => put({ quote: e.target.value })} className={`${inputClass} resize-y`} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Loan (optional)" htmlFor={`${id}-product`}>
                  <select id={`${id}-product`} value={t.product ?? ""} onChange={(e) => put({ product: e.target.value })} className={inputClass}>
                    <option value="">Not shown</option>
                    {PRODUCTS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Result (optional)" htmlFor={`${id}-outcome`} count={{ n: (t.outcome ?? "").length, max: 80 }} hint="A fact the client mentions, for example: Approved in 4 hours">
                  <input id={`${id}-outcome`} value={t.outcome ?? ""} onChange={(e) => put({ outcome: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Check id={`${id}-ok`} checked={t.consent} onChange={(consent) => put({ consent })}>
                  <span className="font-medium">This client agreed to be quoted by name on the website</span>
                </Check>
                {!t.consent && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[12px] font-medium text-amber-800 ring-1 ring-amber-200">Not shown to visitors</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <AddButton disabled={value.items.length >= 12} onClick={() => set([...value.items, { _k: newKey(), name: "", role: "", quote: "", consent: false, product: "", outcome: "" }])}>
        Add a testimonial{value.items.length >= 12 ? " (12 is the most)" : ""}
      </AddButton>
    </div>
  );
}

// ─── FAQs ─────────────────────────────────────────────────────────────────────

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

const uniqueId = (wanted: string, others: string[]) => {
  const base = slug(wanted) || "question";
  let id = base;
  for (let n = 2; others.includes(id); n++) id = `${base.slice(0, 36)}-${n}`;
  return id;
};

/** Answers that link to /faq#something where no question has that link name any more. */
export function brokenFaqLinks(items: { id: string; a: string }[]): string[] {
  const ids = new Set(items.map((f) => f.id));
  const out: string[] = [];
  items.forEach((f, i) => {
    const missing = Array.from(new Set(Array.from(f.a.matchAll(/\]\(\/faq#([a-z0-9-]+)\)/g), (m) => m[1]))).filter((id) => !ids.has(id));
    if (missing.length) out.push(`Question ${i + 1} links to ${missing.map((m) => `/faq#${m}`).join(", ")}, which no question uses`);
  });
  return out;
}

export function FaqForm({ value, onChange, contact }: FormProps<FaqValue>) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const set = (items: FaqValue["items"]) => onChange({ items });
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const broken = brokenFaqLinks(value.items);
  const popular = value.items.filter((f) => f.popular).length;

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-[13px] leading-snug text-slate-700 ring-1 ring-blue-100">
        The answers do not quote loan limits, rates or fees: the application form shows the figures for each applicant. Keep it that way unless the owner has confirmed the numbers match the calculators.
      </p>
      {broken.length > 0 && (
        <div role="status" className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <ul className="space-y-0.5">
            {broken.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-2">
        {value.items.map((f, i) => {
          const isOpen = open.has(f._k);
          const put = (patch: Partial<Keyed<FaqItem>>) => set(patchItem(value.items, i, patch));
          const others = value.items.filter((_, j) => j !== i).map((x) => x.id);
          const panel = `faq-${f._k}`;
          return (
            <li key={f._k} className={card + " !p-0"}>
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panel}
                  onClick={() => toggle(f._k)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                >
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-semibold text-slate-900 sm:line-clamp-1">
                    {i + 1}. {f.q || "New question"}
                  </span>
                  <span className="hidden flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">{f.topic}</span>
                  {f.popular && (
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                      <Star className="h-3 w-3 fill-current" aria-hidden /> <span className="max-sm:sr-only">Popular</span>
                    </span>
                  )}
                </button>
                <RowTools index={i} count={value.items.length} what={`question ${i + 1}`} onMove={(to) => set(moveItem(value.items, i, to))} onRemove={() => set(dropItem(value.items, i))} />
              </div>

              {isOpen && (
                <div id={panel} className="space-y-3.5 border-t border-slate-100 px-4 py-4">
                  <Field label="Question" htmlFor={`${panel}-q`} count={{ n: f.q.length, max: 200 }}>
                    <input
                      id={`${panel}-q`}
                      value={f.q}
                      onChange={(e) => put({ q: e.target.value, ...(f._auto ? { id: uniqueId(e.target.value, others) } : {}) })}
                      className={inputClass}
                    />
                  </Field>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Field label="Topic" htmlFor={`${panel}-topic`}>
                      <select id={`${panel}-topic`} value={f.topic} onChange={(e) => put({ topic: e.target.value as FaqItem["topic"] })} className={inputClass}>
                        {TOPICS.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <div className="sm:pt-6">
                      <Check id={`${panel}-pop`} checked={f.popular} onChange={(v) => put({ popular: v })}>
                        <span className="font-medium">Show as a popular question</span>
                        <span className="block text-[12px] text-slate-500">A shortcut under the search box.{popular > 5 && f.popular ? " Five or fewer works best." : ""}</span>
                      </Check>
                    </div>
                  </div>
                  <RichTextField id={`${panel}-a`} label="Answer" value={f.a} onChange={(a) => put({ a })} contact={contact} max={4000} />
                  <Field
                    label="Link name"
                    htmlFor={`${panel}-id`}
                    hint={
                      <>
                        This answer opens from <code>/faq#{f.id || "..."}</code>. Changing it breaks any link that already uses it.
                      </>
                    }
                  >
                    <input
                      id={`${panel}-id`}
                      value={f.id}
                      onChange={(e) => put({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), _auto: false })}
                      onBlur={() => put({ id: f.id.replace(/^-+|-+$/g, "") })}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <AddButton
        disabled={value.items.length >= 60}
        onClick={() => {
          const k = newKey();
          set([...value.items, { _k: k, _auto: true, id: uniqueId("new question", value.items.map((x) => x.id)), topic: TOPICS[0], q: "", a: "", popular: false }]);
          setOpen((prev) => new Set(prev).add(k));
        }}
      >
        Add a question
      </AddButton>
    </div>
  );
}
