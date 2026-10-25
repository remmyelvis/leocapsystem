import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Clock } from "lucide-react";
import { MarkMotif, navy } from "@/components/global/brandArt";
import { statusDisplay } from "@/lib/loanStatus";
import { Reveal } from "./motion";
import SectionHeader from "./SectionHeader";
import { useSiteContent } from "@/lib/siteContent/useSiteContent";
import { fromContent, loadSamples, type Testimonial } from "./testimonials";

// Each testimonial is a slip, like the one you get when a loan is paid out: a loan-record strip on top, the quote,
// then a stub under a perforated tear line. The notches at the tear line are cut out of the paper with a mask, so
// whatever is behind the slip shows through them.

const STUB = 88; // height in px of the stub under the tear line; the notches are placed from the bottom by this amount
const NOTCH = `radial-gradient(circle 11px at 0 calc(100% - ${STUB}px), #0000 10.5px, #000 11px), radial-gradient(circle 11px at 100% calc(100% - ${STUB}px), #0000 10.5px, #000 11px)`;
const slipMask: CSSProperties = {
  WebkitMaskImage: NOTCH,
  maskImage: NOTCH,
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
};

// A quotation mark drawn from the slanted wedges of the Leocap mark, in the logo's two reds.
function QuoteMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 46 30" className={className} aria-hidden>
      <polygon points="8,0 23,0 14,30 0,30" fill="#ff6a3d" />
      <polygon points="31,0 46,0 37,30 23,30" fill="#b3180a" />
    </svg>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Avatar({ t, size }: { t: Testimonial; size: "md" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16 text-[20px]" : "h-11 w-11 text-[15px]";
  return t.photo ? (
    <img src={t.photo} alt="" className={`${dim} flex-shrink-0 rounded-full object-cover ring-2 ring-red-500/70 ring-offset-2 ring-offset-[#fbf7ef]`} />
  ) : (
    <span
      aria-hidden
      className={`${dim} flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F2C59] to-[#081430] font-bold tracking-wide text-white ring-2 ring-red-500/70 ring-offset-2 ring-offset-[#fbf7ef]`}
    >
      {initials(t.name)}
    </span>
  );
}

function Slip({ t, index, total, sample = false }: { t: Testimonial; index: number; total: number; sample?: boolean }) {
  const status = t.status ? statusDisplay(t.status) : null;
  const num = (n: number) => String(n).padStart(2, "0");

  return (
    <figure
      className={`h-full transition-transform duration-500 [filter:drop-shadow(0_26px_28px_rgba(2,8,23,0.42))] motion-reduce:transform-none motion-reduce:transition-none lg:hover:-translate-y-1.5`}
    >
      <div style={slipMask} className="relative flex h-full flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#fffefb_0%,#fbf7ef_100%)]">
        {/* The slip's loan record */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-600">
          <span className="flex min-w-0 items-center gap-2.5">
            {t.product && <span className="truncate font-semibold text-slate-800">{t.product}</span>}
            {status && <span className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 font-sans text-[11px] font-bold normal-case tracking-normal ${status.className}`}>{status.label}</span>}
          </span>
          <span className="flex flex-shrink-0 items-center gap-2 tabular-nums">
            {import.meta.env.DEV && sample && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wider text-amber-900">SAMPLE</span>}
            {num(index + 1)} / {num(total)}
          </span>
        </div>

        <blockquote className="relative flex-1 px-6 pb-6 pt-7">
          {/* The mark, large and faint, behind the words */}
          <MarkMotif className="pointer-events-none absolute -bottom-8 -right-6 w-44" strength={0.55} />
          <QuoteMark className="relative mb-5 h-6 w-9" />
          <p className="relative text-[16px] font-medium leading-[1.6] tracking-[-0.006em] text-slate-800">{t.quote}</p>
          {t.outcome && (
            <p className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <Clock className="h-3.5 w-3.5" />
              {t.outcome}
            </p>
          )}
        </blockquote>

        {/* The stub */}
        <figcaption className="flex flex-shrink-0 items-center gap-3.5 border-t-2 border-dashed border-slate-300 px-6" style={{ height: STUB }}>
          <Avatar t={t} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-slate-900">{t.name}</span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-slate-600">{t.role}</span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

// A barcode that is only decoration. Its bars come from the person's name, so each ticket has its own.
function Barcode({ seed }: { seed: string }) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < 34 && x < 118; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const w = 1 + (h % 3);
    bars.push({ x, w });
    x += w + 1 + ((h >> 4) % 2);
  }
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-[120px] text-slate-400/80" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="28" fill="currentColor" />
      ))}
    </svg>
  );
}

// The first testimonial is a wide ticket: the quote on the left, and the person on the stub to the right of a vertical tear line.
const STUB_W = 300;
const TEAR = `radial-gradient(circle 12px at calc(100% - ${STUB_W}px) 0, #0000 11.5px, #000 12px), radial-gradient(circle 12px at calc(100% - ${STUB_W}px) 100%, #0000 11.5px, #000 12px)`;
const ticketMask: CSSProperties = { WebkitMaskImage: TEAR, maskImage: TEAR, WebkitMaskComposite: "source-in", maskComposite: "intersect" };

function Ticket({ t, total, sample }: { t: Testimonial; total: number; sample: boolean }) {
  const status = t.status ? statusDisplay(t.status) : null;
  const num = (n: number) => String(n).padStart(2, "0");
  return (
    <figure className="[filter:drop-shadow(0_30px_32px_rgba(2,8,23,0.45))] transition-transform duration-500 motion-reduce:transform-none motion-reduce:transition-none hover:-translate-y-1.5">
      <div style={{ ...ticketMask, gridTemplateColumns: `minmax(0,1fr) ${STUB_W}px` }} className="relative grid overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,#fffefb_0%,#fbf7ef_100%)]">
        <div className="relative flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-10 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-600">
            <span className="flex min-w-0 items-center gap-2.5">
              {t.product && <span className="truncate font-semibold text-slate-800">{t.product}</span>}
              {status && <span className={`inline-flex flex-shrink-0 rounded-full px-2 py-0.5 font-sans text-[11px] font-bold normal-case tracking-normal ${status.className}`}>{status.label}</span>}
            </span>
            <span className="flex flex-shrink-0 items-center gap-2 tabular-nums">
              {import.meta.env.DEV && sample && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wider text-amber-900">SAMPLE</span>}
              {num(1)} / {num(total)}
            </span>
          </div>
          <blockquote className="relative flex flex-1 flex-col justify-center px-10 pb-10 pt-9">
            <MarkMotif className="pointer-events-none absolute -bottom-10 right-4 w-56" strength={0.5} />
            <QuoteMark className="relative mb-6 h-9 w-14" />
            <p className="relative max-w-2xl text-[26px] font-medium leading-[1.42] tracking-[-0.012em] text-slate-800">{t.quote}</p>
            {t.outcome && (
              <p className="relative mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <Clock className="h-3.5 w-3.5" />
                {t.outcome}
              </p>
            )}
          </blockquote>
        </div>
        <figcaption className="flex flex-col items-center justify-center gap-3.5 border-l-2 border-dashed border-slate-300 px-8 py-8 text-center">
          <Avatar t={t} size="lg" />
          <span>
            <span className="block text-[17px] font-bold text-slate-900">{t.name}</span>
            <span className="mt-1 block text-[13.5px] leading-snug text-slate-600">{t.role}</span>
          </span>
          <Barcode seed={t.name} />
        </figcaption>
      </div>
    </figure>
  );
}

export default function TestimonialsSection() {
  const { testimonials } = useSiteContent();
  const real = useMemo(() => fromContent(testimonials.items), [testimonials]);
  const [samples, setSamples] = useState<Testimonial[]>([]);
  useEffect(() => {
    if (real.length === 0) loadSamples().then(setSamples);
  }, [real.length]);
  const items = real.length > 0 ? real : samples;
  const sample = real.length === 0;
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  // Until there is at least one real, approved testimonial the whole section is left out of the page.
  if (items.length === 0) return null;

  const [first, ...rest] = items;

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const k = c as HTMLElement;
      const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setCurrent(best);
  };
  const goTo = (i: number) => {
    const k = track.current?.children[i] as HTMLElement | undefined;
    k?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  // The band is slanted at the angle of the Leocap mark: the clipped corners show the neighbouring sections, which this section overlaps.
  const band: CSSProperties & Record<string, string> = {
    ...navy(
      "radial-gradient(45% 55% at 18% 30%, rgba(59,130,246,0.22), transparent 70%), radial-gradient(40% 45% at 88% 80%, rgba(217,119,6,0.14), transparent 70%), linear-gradient(160deg, #0F2C59 0%, #0b2246 50%, #081430 100%)",
      3
    ),
    "--cut": "clamp(28px, 4.5vw, 72px)",
    clipPath: "polygon(0 var(--cut), 100% 0, 100% calc(100% - var(--cut)), 0 100%)",
    marginTop: "calc(var(--cut) * -1)",
    marginBottom: "calc(var(--cut) * -1)",
    paddingTop: "calc(var(--cut) + 5rem)",
    paddingBottom: "calc(var(--cut) + 5rem)",
  };

  return (
    <section id="testimonials" aria-label="Testimonials" className="relative isolate z-10 overflow-hidden text-white" style={band}>
      <MarkMotif className="pointer-events-none absolute -bottom-16 -left-28 -z-10 w-[560px]" strength={1.1} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Testimonials" title="Loved by Kenyan Professionals" dark>
          Don&apos;t take our word for it — here&apos;s what our clients say.
        </SectionHeader>

        {import.meta.env.DEV && sample && (
          <p className="mx-auto -mt-8 mb-10 max-w-xl rounded-xl bg-amber-300/10 px-4 py-2.5 text-center text-[13px] leading-relaxed text-amber-100 ring-1 ring-amber-200/30">
            Preview with sample quotes. This section stays hidden on the live site until real, approved quotes are published under Admin, Site content.
          </p>
        )}

        {/* Wide screens: the wide ticket first, then the other slips beneath it */}
        <div className="hidden lg:block">
          <Reveal>
            <Ticket t={first} total={items.length} sample={sample} />
          </Reveal>
          {rest.length > 0 && (
            <div className={`mt-9 grid gap-8 ${rest.length === 1 ? "mx-auto max-w-lg" : rest.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
              {rest.map((t, i) => (
                <Reveal key={t.name} delay={120 * (i + 1)} className="h-full">
                  <Slip t={t} index={i + 1} total={items.length} sample={sample} />
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* Phones and tablets: slips slide sideways, one at a time with the next peeking in */}
        <div className="lg:hidden">
          <div
            ref={track}
            onScroll={onScroll}
            tabIndex={0}
            aria-label="Testimonials, scroll sideways"
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-8 pt-2 [scrollbar-width:none] focus-visible:outline-none sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {items.map((t, i) => (
              <div key={t.name} className="w-[86%] max-w-[440px] flex-shrink-0 snap-center sm:w-[62%]">
                <Slip t={t} index={i} total={items.length} sample={sample} />
              </div>
            ))}
          </div>
          {items.length > 1 && (
            <div className="flex items-center justify-center gap-1" role="group" aria-label="Choose a testimonial">
              {items.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Testimonial ${i + 1} of ${items.length}`}
                  aria-current={current === i ? "true" : undefined}
                  className="flex h-8 w-8 items-center justify-center focus-visible:outline-none"
                >
                  <span className={`h-2 rounded-full transition-all duration-300 ${current === i ? "w-6 bg-white" : "w-2 bg-white/45"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
