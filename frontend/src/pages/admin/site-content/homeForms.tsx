import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { agreementText } from "@/lib/agreementText";
import type { ContactView, HeadingsBlock, HeroBlock, HowBlock, PolicySection, ProductCard, ProductsBlock } from "@/lib/siteContent/types";
import RichTextField from "./RichTextField";
import { AddButton, card, Check, dropItem, Field, inputClass, moveItem, newKey, patchItem, RowTools } from "./fields";
import type { Keyed } from "./forms";

// The forms for the home page and the privacy policy. Same rules as forms.tsx: each works on a copy held by the editor page.

export type ProductsValue = Omit<ProductsBlock, "items"> & { items: Keyed<ProductCard>[] };
export type PolicyValue = { items: Keyed<PolicySection>[] };
export type AgreementValue = { title: string; intro: string; items: Keyed<PolicySection>[] };

interface FormProps<T> {
  value: T;
  onChange: (value: T) => void;
  contact: ContactView;
}

const note = "rounded-lg bg-blue-50 px-3 py-2 text-[13px] leading-snug text-slate-700 ring-1 ring-blue-100";

/** The small heading, heading and intro line that open a section of the home page. */
function SectionHead({ id, value, onChange }: { id: string; value: { eyebrow: string; title: string; lead: string }; onChange: (v: { eyebrow: string; title: string; lead: string }) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Small heading above the title" htmlFor={`${id}-eyebrow`} count={{ n: value.eyebrow.length, max: 40 }}>
          <input id={`${id}-eyebrow`} value={value.eyebrow} onChange={(e) => onChange({ ...value, eyebrow: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Title" htmlFor={`${id}-title`} count={{ n: value.title.length, max: 80 }}>
          <input id={`${id}-title`} value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Line under the title" htmlFor={`${id}-lead`} count={{ n: value.lead.length, max: 200 }}>
        <textarea id={`${id}-lead`} rows={2} value={value.lead} onChange={(e) => onChange({ ...value, lead: e.target.value })} className={`${inputClass} resize-y`} />
      </Field>
    </div>
  );
}

// ─── Opening section ──────────────────────────────────────────────────────────

export function HeroForm({ value, onChange }: FormProps<HeroBlock>) {
  const set = (patch: Partial<HeroBlock>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <p className={note}>
        The card beside the headline has no text of its own: it shows the first loan product and the names of the three steps, so edit those under <strong>Home page: loan products</strong> and <strong>Home page: how it works</strong>.
      </p>
      <div className={`${card} space-y-4`}>
        <Field label="Badge above the headline" htmlFor="hero-badge" count={{ n: value.badge.length, max: 60 }}>
          <input id="hero-badge" value={value.badge} onChange={(e) => set({ badge: e.target.value })} className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Headline, first line" htmlFor="hero-h1" count={{ n: value.headline_1.length, max: 60 }}>
            <input id="hero-h1" value={value.headline_1} onChange={(e) => set({ headline_1: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Headline, second line (coloured)" htmlFor="hero-h2" count={{ n: value.headline_2.length, max: 60 }}>
            <input id="hero-h2" value={value.headline_2} onChange={(e) => set({ headline_2: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Field
          label="Introduction"
          htmlFor="hero-intro"
          count={{ n: value.intro.length, max: 300 }}
          hint={
            <>
              Put <code>**double stars**</code> around words to make them bold, for example: approved within <code>**24 hours**</code>. Nothing else is allowed here.
            </>
          }
        >
          <textarea id="hero-intro" rows={3} value={value.intro} onChange={(e) => set({ intro: e.target.value })} className={`${inputClass} resize-y`} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Main button" htmlFor="hero-primary" count={{ n: value.primary_label.length, max: 30 }} hint="It opens the sign-up page.">
            <input id="hero-primary" value={value.primary_label} onChange={(e) => set({ primary_label: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Second button" htmlFor="hero-secondary" count={{ n: value.secondary_label.length, max: 30 }} hint="It scrolls down to the products.">
            <input id="hero-secondary" value={value.secondary_label} onChange={(e) => set({ secondary_label: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-[13px] font-medium text-slate-700">The three numbers</legend>
          <ul className="space-y-2">
            {value.stats.map((s, i) => (
              <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <input
                  aria-label={`Number ${i + 1}`}
                  value={s.value}
                  onChange={(e) => set({ stats: patchItem(value.stats, i, { value: e.target.value }) })}
                  placeholder="500+"
                  className={inputClass}
                />
                <input
                  aria-label={`Number ${i + 1} label`}
                  value={s.label}
                  onChange={(e) => set({ stats: patchItem(value.stats, i, { label: e.target.value }) })}
                  placeholder="Clients Served"
                  className={inputClass}
                />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[12px] leading-snug text-slate-500">
            The number counts up when it appears, for example 500+, KES 50M+ or 24 Hrs. Only publish figures you can stand behind. &quot;500+&quot; is also mentioned in the <strong>Ready to get started?</strong> band under <strong>how it works</strong>: change both together.
          </p>
        </fieldset>
      </div>
    </div>
  );
}

// ─── Loan products ────────────────────────────────────────────────────────────

export function ProductsForm({ value, onChange }: FormProps<ProductsValue>) {
  const set = (patch: Partial<ProductsValue>) => onChange({ ...value, ...patch });
  const setCard = (i: number, patch: Partial<Keyed<ProductCard>>) => {
    let items = patchItem(value.items, i, patch);
    // Only one card is the Most Popular, and a Coming Soon card cannot be it.
    if (patch.featured) items = items.map((p, j) => (j === i ? p : { ...p, featured: false }));
    if (patch.featured) items = patchItem(items, i, { coming_soon: false });
    if (patch.coming_soon) items = patchItem(items, i, { featured: false });
    set({ items });
  };
  return (
    <div className="space-y-3">
      <p className={note}>
        The first product is also shown in the card beside the home page headline (its title, small heading and points). The icon of each card depends on its position. Only publish figures that match what the application form really offers.
      </p>
      <div className={card}>
        <SectionHead id="products" value={value} onChange={(h) => set(h)} />
      </div>

      <ul className="space-y-3">
        {value.items.map((p, i) => {
          const id = `product-${p._k}`;
          return (
            <li key={p._k} className={`${card} space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-bold text-slate-900">
                  {i + 1}. {p.title || "New product"}
                </h3>
                <RowTools index={i} count={value.items.length} what={`product ${i + 1}`} onMove={(to) => set({ items: moveItem(value.items, i, to) })} onRemove={() => value.items.length > 1 && set({ items: dropItem(value.items, i) })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" htmlFor={`${id}-title`} count={{ n: p.title.length, max: 40 }}>
                  <input id={`${id}-title`} value={p.title} onChange={(e) => setCard(i, { title: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Small heading above the title" htmlFor={`${id}-tag`} count={{ n: p.tag.length, max: 50 }}>
                  <input id={`${id}-tag`} value={p.tag} onChange={(e) => setCard(i, { tag: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field label="Description" htmlFor={`${id}-desc`} count={{ n: p.description.length, max: 300 }}>
                <textarea id={`${id}-desc`} rows={3} value={p.description} onChange={(e) => setCard(i, { description: e.target.value })} className={`${inputClass} resize-y`} />
              </Field>
              <fieldset>
                <legend className="mb-1 text-[13px] font-medium text-slate-700">Points (1 to 5)</legend>
                <ul className="space-y-1.5">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-1">
                      <input
                        aria-label={`Product ${i + 1} point ${j + 1}`}
                        value={f}
                        maxLength={60}
                        onChange={(e) => setCard(i, { features: p.features.map((x, k) => (k === j ? e.target.value : x)) })}
                        className={inputClass}
                      />
                      <RowTools
                        index={j}
                        count={p.features.length}
                        what={`point ${j + 1} of product ${i + 1}`}
                        onMove={(to) => setCard(i, { features: moveItem(p.features, j, to) })}
                        onRemove={() => p.features.length > 1 && setCard(i, { features: dropItem(p.features, j) })}
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-1.5">
                  <AddButton disabled={p.features.length >= 5} onClick={() => setCard(i, { features: [...p.features, ""] })}>
                    Add a point
                  </AddButton>
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Check id={`${id}-pop`} checked={p.featured} onChange={(featured) => setCard(i, { featured })}>
                  <span className="font-medium">Most Popular</span>
                  <span className="block text-[12px] text-slate-500">The highlighted card. Only one card can have it.</span>
                </Check>
                <Check id={`${id}-soon`} checked={p.coming_soon} onChange={(coming_soon) => setCard(i, { coming_soon })}>
                  <span className="font-medium">Coming Soon</span>
                  <span className="block text-[12px] text-slate-500">The card is greyed out and its button is switched off.</span>
                </Check>
              </div>
            </li>
          );
        })}
      </ul>
      <AddButton
        disabled={value.items.length >= 3}
        onClick={() => set({ items: [...value.items, { _k: newKey(), title: "", tag: "", description: "", features: [""], featured: false, coming_soon: false }] })}
      >
        Add a product{value.items.length >= 3 ? " (3 is the most)" : ""}
      </AddButton>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

export function HowForm({ value, onChange }: FormProps<HowBlock>) {
  const set = (patch: Partial<HowBlock>) => onChange({ ...value, ...patch });
  const cta = (patch: Partial<HowBlock["cta"]>) => set({ cta: { ...value.cta, ...patch } });
  return (
    <div className="space-y-3">
      <p className={note}>
        There are always three steps. Their names are also used in the card beside the home page headline. The numbers, icons and colours depend on the position.
      </p>
      <div className={card}>
        <SectionHead id="how" value={value} onChange={(h) => set(h)} />
      </div>
      <ul className="space-y-3">
        {value.steps.map((s, i) => (
          <li key={i} className={`${card} space-y-3`}>
            <h3 className="text-[13px] font-bold text-slate-900">Step {i + 1}</h3>
            <Field label="Name" htmlFor={`step-${i}-title`} count={{ n: s.title.length, max: 30 }}>
              <input id={`step-${i}-title`} value={s.title} onChange={(e) => set({ steps: patchItem(value.steps, i, { title: e.target.value }) })} className={inputClass} />
            </Field>
            <Field label="Text" htmlFor={`step-${i}-text`} count={{ n: s.description.length, max: 240 }}>
              <textarea id={`step-${i}-text`} rows={3} value={s.description} onChange={(e) => set({ steps: patchItem(value.steps, i, { description: e.target.value }) })} className={`${inputClass} resize-y`} />
            </Field>
          </li>
        ))}
      </ul>
      <div className={`${card} space-y-3`}>
        <h3 className="text-[13px] font-bold text-slate-900">The band under the steps</h3>
        <Field label="Heading" htmlFor="cta-title" count={{ n: value.cta.title.length, max: 80 }}>
          <input id="cta-title" value={value.cta.title} onChange={(e) => cta({ title: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Text" htmlFor="cta-text" count={{ n: value.cta.text.length, max: 160 }} hint="This line repeats a number from the opening section (500+ by default): change them together.">
          <input id="cta-text" value={value.cta.text} onChange={(e) => cta({ text: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Button" htmlFor="cta-button" count={{ n: value.cta.button.length, max: 30 }} hint="It opens the sign-up page.">
          <input id="cta-button" value={value.cta.button} onChange={(e) => cta({ button: e.target.value })} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}

// ─── Other home page headings ─────────────────────────────────────────────────

export function HeadingsForm({ value, onChange }: FormProps<HeadingsBlock>) {
  const pick = (prefix: "contact" | "testimonials") => ({
    eyebrow: value[`${prefix}_eyebrow`],
    title: value[`${prefix}_title`],
    lead: value[`${prefix}_lead`],
  });
  const put = (prefix: "contact" | "testimonials") => (h: { eyebrow: string; title: string; lead: string }) =>
    onChange({ ...value, [`${prefix}_eyebrow`]: h.eyebrow, [`${prefix}_title`]: h.title, [`${prefix}_lead`]: h.lead });
  return (
    <div className="space-y-3">
      <div className={`${card} space-y-3`}>
        <h3 className="text-[13px] font-bold text-slate-900">Contact section</h3>
        <SectionHead id="contact-head" value={pick("contact")} onChange={put("contact")} />
      </div>
      <div className={`${card} space-y-3`}>
        <h3 className="text-[13px] font-bold text-slate-900">Testimonials section</h3>
        <p className="text-[12px] leading-snug text-slate-500">This section is shown only once at least one testimonial has been published.</p>
        <SectionHead id="testimonials-head" value={pick("testimonials")} onChange={put("testimonials")} />
      </div>
    </div>
  );
}

// ─── Privacy policy ───────────────────────────────────────────────────────────

export function PolicyForm({ value, onChange, contact }: FormProps<PolicyValue>) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const set = (items: PolicyValue["items"]) => onChange({ items });
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  return (
    <div className="space-y-3">
      <p className={note}>
        This is a legal text. Every published version is kept in the history, but please have a change checked by your adviser before you publish it. The section numbers follow the order below. Use the <strong>Insert</strong> buttons to fill in the current email, phone numbers or address instead of typing them.
      </p>
      <ul className="space-y-2">
        {value.items.map((sec, i) => {
          const isOpen = open.has(sec._k);
          const panel = `policy-${sec._k}`;
          const put = (patch: Partial<Keyed<PolicySection>>) => set(patchItem(value.items, i, patch));
          return (
            <li key={sec._k} className={`${card} !p-0`}>
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panel}
                  onClick={() => toggle(sec._k)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                >
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-semibold text-slate-900 sm:line-clamp-1">
                    {i + 1}. {sec.title || "New section"}
                  </span>
                </button>
                <RowTools index={i} count={value.items.length} what={`section ${i + 1}`} onMove={(to) => set(moveItem(value.items, i, to))} onRemove={() => value.items.length > 1 && set(dropItem(value.items, i))} />
              </div>
              {isOpen && (
                <div id={panel} className="space-y-3.5 border-t border-slate-100 px-4 py-4">
                  <Field label="Title (the number is added for you)" htmlFor={`${panel}-title`} count={{ n: sec.title.length, max: 120 }}>
                    <input id={`${panel}-title`} value={sec.title} onChange={(e) => put({ title: e.target.value })} className={inputClass} />
                  </Field>
                  <RichTextField id={`${panel}-body`} label="Text" value={sec.body} onChange={(body) => put({ body })} contact={contact} max={8000} rows={12} variant="policy" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AddButton disabled={value.items.length >= 30} onClick={() => {
        const k = newKey();
        set([...value.items, { _k: k, title: "", body: "" }]);
        setOpen((prev) => new Set(prev).add(k));
      }}>
        Add a section
      </AddButton>
    </div>
  );
}

// ─── Loan agreements ──────────────────────────────────────────────────────────

const textareaClass = `${inputClass} min-h-[7rem] leading-snug`;

/** The Salary Advance or Personal Loan agreement: a title, an opening paragraph and lettered sections of plain lines (kept exactly as typed). */
export function AgreementForm({ value, onChange, kind }: FormProps<AgreementValue> & { kind: "salary" | "personal" }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const set = (patch: Partial<AgreementValue>) => onChange({ ...value, ...patch });
  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  return (
    <div className="space-y-3">
      <p className={note}>
        This is the contract a borrower accepts when they apply. <strong>Every acceptance is recorded with the exact text, the time and the device it came from</strong>, so a change here only applies to applications made after you publish it: what earlier borrowers accepted never changes.
        It is a legal text: please have a change checked by your adviser before you publish it. Type the section letters yourself (for example "A. LOAN AMOUNT"). Lines are shown exactly as you break them.
        {kind === "salary" ? (
          <>
            {" "}Where the borrower's employer should appear, type <code className="rounded bg-white/70 px-1">{"{{employer}}"}</code>; it is filled in for each borrower. HR and finance staff accept this same text for their own loans.
          </>
        ) : (
          " This agreement has no placeholders."
        )}
      </p>
      <div className={`${card} space-y-3.5`}>
        <Field label="Title" htmlFor="agreement-title" count={{ n: value.title.length, max: 80 }}>
          <input id="agreement-title" value={value.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Opening paragraph (optional)" htmlFor="agreement-intro" count={{ n: value.intro.length, max: 3000 }}>
          <textarea id="agreement-intro" rows={4} value={value.intro} onChange={(e) => set({ intro: e.target.value })} className={textareaClass} />
        </Field>
      </div>
      <ul className="space-y-2">
        {value.items.map((sec, i) => {
          const isOpen = open.has(sec._k);
          const panel = `agreement-${sec._k}`;
          const put = (patch: Partial<Keyed<PolicySection>>) => set({ items: patchItem(value.items, i, patch) });
          return (
            <li key={sec._k} className={`${card} !p-0`}>
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panel}
                  onClick={() => toggle(sec._k)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                >
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  <span className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-semibold text-slate-900 sm:line-clamp-1">{sec.title || "New section"}</span>
                </button>
                <RowTools index={i} count={value.items.length} what={`section ${i + 1}`} onMove={(to) => set({ items: moveItem(value.items, i, to) })} onRemove={() => value.items.length > 1 && set({ items: dropItem(value.items, i) })} />
              </div>
              {isOpen && (
                <div id={panel} className="space-y-3.5 border-t border-slate-100 px-4 py-4">
                  <Field label="Title (with its letter)" htmlFor={`${panel}-title`} count={{ n: sec.title.length, max: 120 }}>
                    <input id={`${panel}-title`} value={sec.title} onChange={(e) => put({ title: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Text" htmlFor={`${panel}-body`} count={{ n: sec.body.length, max: 8000 }}>
                    <textarea id={`${panel}-body`} rows={10} value={sec.body} onChange={(e) => put({ body: e.target.value })} className={textareaClass} />
                  </Field>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <AddButton
        disabled={value.items.length >= 40}
        onClick={() => {
          const k = newKey();
          set({ items: [...value.items, { _k: k, title: "", body: "" }] });
          setOpen((prev) => new Set(prev).add(k));
        }}
      >
        Add a section
      </AddButton>
      <details className={`${card} group`}>
        <summary className="cursor-pointer text-[13px] font-semibold text-slate-900">What the borrower will see</summary>
        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">{agreementText(value, "Sample Employer Ltd")}</pre>
        </div>
        <p className="mt-2 text-[12px] text-slate-500">This is the text as it will appear in the application form (the employer shown here is only an example).</p>
      </details>
    </div>
  );
}

