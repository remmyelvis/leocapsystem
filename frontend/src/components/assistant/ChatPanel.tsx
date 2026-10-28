import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUp, Phone, RotateCcw, X } from "lucide-react";
import { useFaqs, type Faq } from "@/components/faq/faqData";
import { DocChecklist, StatusGuide } from "@/components/faq/parts";
import { useSession } from "@/contexts/AuthContext";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { hasSignedInBefore } from "@/lib/returningVisitor";
import { useContact } from "@/lib/siteContent/useSiteContent";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { estimate, kes, type Loan } from "./estimate";
import { go, understand, type Block, type Chip, type Ctx, type Reply } from "./flows";
import { LeoAvatar, LeoOrb, preloadLeo, type LeoMood } from "./leo";

// The chat itself: a bottom sheet on phones, a small window on larger screens. Loaded only when someone opens it.

interface Msg {
  id: number;
  from: "leo" | "you";
  mood?: LeoMood;
  blocks?: Block[];
  text?: string;
  chips?: Chip[];
  expect?: Loan;
}

const STORE = "leocap_assistant";
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Kept for the visit only (sessionStorage), so a refresh does not lose the conversation. Nothing is sent anywhere.
function load(signedIn: boolean): Msg[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "null");
    return saved && saved.signedIn === signedIn && Array.isArray(saved.msgs) ? saved.msgs : [];
  } catch {
    return [];
  }
}

const bold = (s: string): ReactNode[] => s.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i} className="font-bold text-slate-900">{part}</strong> : part));

function EstimateCard({ loan, pay }: { loan: Loan; pay: number }) {
  const e = estimate(loan, pay);
  if (!e) return null;
  const rows: [string, string][] = [["Up to about", kes(e.amount)], ["Fees", `− ${kes(e.fees)}`]];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-[#0F2C59] px-4 py-2.5">
        <span className="text-[12px] font-bold uppercase tracking-wide text-white">{loan === "advance" ? "Salary Advance" : "Personal Loan"}</span>
        <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold text-white">Estimate</span>
      </div>
      <dl className="px-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-slate-100 py-2.5">
            <dt className="text-[14px] text-slate-600">{k}</dt>
            <dd className="ml-auto whitespace-nowrap text-[15px] font-semibold text-slate-900 break-normal">{v}</dd>
          </div>
        ))}
        <div className="-mx-4 flex flex-wrap items-baseline justify-between gap-x-3 bg-emerald-50 px-4 py-3">
          <dt className="text-[14px] font-semibold text-emerald-900">{loan === "advance" ? "You'd receive" : "You'd receive, before interest"}</dt>
          <dd className="ml-auto whitespace-nowrap text-[18px] font-extrabold text-emerald-900 break-normal sm:text-[20px]">{kes(e.receive)}</dd>
        </div>
        {e.repay !== undefined && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5">
            <dt className="text-[14px] text-slate-600">You'd repay</dt>
            <dd className="ml-auto whitespace-nowrap text-[15px] font-semibold text-slate-900 break-normal">{kes(e.repay)}</dd>
          </div>
        )}
      </dl>
      <p className="bg-slate-50 px-4 py-2.5 text-[12px] leading-snug text-slate-600">
        {loan === "advance" ? "Includes processing, access and legal fees. Repaid from your next paycheck." : "We set the interest rate after reviewing your application, and the loan only goes ahead if you accept it."}
      </p>
    </div>
  );
}

const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const primary = `${btn} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600`;
const dark = `${btn} bg-[#0F2C59] text-white hover:bg-[#0b2246] focus-visible:ring-[#0F2C59]`;
const secondary = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-[#0F2C59]`;

function Blocks({ blocks, faqs }: { blocks: Block[]; faqs: Faq[] }) {
  const contact = useContact();
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "text":
            return b.s.split("\n\n").map((p, j) => <p key={`${i}-${j}`}>{bold(p)}</p>);
          case "faq":
            return <div key={i} className="space-y-2.5">{faqs.find((f) => f.id === b.id)?.answer}</div>;
          case "docs":
            return <DocChecklist key={i} />;
          case "status":
            return <StatusGuide key={i} />;
          case "estimate":
            return <EstimateCard key={i} loan={b.loan} pay={b.pay} />;
          case "actions":
            return (
              <div key={i} className="flex flex-wrap gap-2">
                {b.items.map((a) => (
                  <Link key={a.to + a.label} to={a.to} className={a.primary ? primary : secondary}>
                    {a.label}
                  </Link>
                ))}
              </div>
            );
          case "contact":
            return (
              <div key={i} className="flex flex-col gap-2">
                {contact.phones.map((p) => (
                  <a key={p.href} href={p.href} className={dark}>
                    <Phone className="h-4 w-4" aria-hidden="true" /> Call {p.label}
                  </a>
                ))}
              </div>
            );
        }
      })}
    </div>
  );
}

// On a phone the on-screen keyboard covers the lower part of the page without resizing it: follow the visible area, so the box and the sheet stay above it.
function useVisibleArea() {
  const [fit, setFit] = useState<{ height: number; bottom: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setFit(window.innerWidth >= 640 ? null : { height: Math.min(window.innerHeight * 0.9, vv.height - 8), bottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop) });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return fit;
}

export default function ChatPanel({ onClose }: { onClose: () => void }) {
  const { pathname } = useLocation();
  const { data } = useSession();
  const user = data?.user as { id?: string | number; name?: string } | undefined;
  const completion = useProfileCompletion();
  const faqs = useFaqs();
  const fit = useVisibleArea();

  // Progress is only quoted on the dashboard, where it has just been loaded: elsewhere it could be out of date.
  const known = useApplicantProfileStore((s) => (user?.id !== undefined ? s.profiles[String(user.id)] : undefined));
  const ctx: Ctx = useMemo(() => {
    const onDashboard = pathname.startsWith("/dashboard");
    const missing = [
      !completion.checks.hasPhone && "your phone number",
      !completion.checks.hasIdNumber && "your ID number",
      !completion.checks.hasKraPin && "your KRA PIN",
      ...completion.requiredDocuments.filter((d) => !completion.uploadedDocumentTypes.includes(d.key)).map((d) => d.label),
    ].filter(Boolean) as string[];
    return {
      faqs,
      who: {
        name: user?.name,
        signedIn: !!user,
        returning: hasSignedInBefore(),
        profile: user && onDashboard && known ? { percent: Math.round(completion.overallPercent), complete: completion.isComplete, missing } : null,
      },
    };
  }, [faqs, user, known, completion, pathname]);

  const [msgs, setMsgs] = useState<Msg[]>(() => load(!!user));
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const idRef = useRef(Math.max(0, ...msgs.map((m) => m.id)));
  const timer = useRef<number>();
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const lastLeo = useRef<HTMLDivElement>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const asMsg = (r: Reply): Msg => ({ id: ++idRef.current, from: "leo", mood: r.mood, blocks: r.blocks, chips: r.chips, expect: r.expect });

  // First visit: Leo opens the conversation.
  useEffect(() => {
    preloadLeo();
    if (msgs.length === 0) setMsgs([asMsg(go("start", ctxRef.current))]);
    panel.current?.focus();
    if (window.matchMedia("(pointer: fine)").matches) panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ signedIn: !!user, msgs: msgs.slice(-40) }));
    } catch {
      // storage blocked: the conversation simply is not kept
    }
  }, [msgs, user]);

  // A new answer is read from its first line; while Leo "types", the end of the conversation shows.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const behavior = reducedMotion() ? "auto" : "smooth";
    if (busy) el.scrollTo({ top: el.scrollHeight, behavior });
    else if (lastLeo.current) el.scrollTo({ top: Math.max(0, lastLeo.current.offsetTop - 12), behavior });
  }, [msgs.length, busy]);

  // The sheet covers the page on a phone, so the page behind must not scroll with it.
  useEffect(() => {
    if (window.innerWidth >= 640) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, []);

  const last = msgs[msgs.length - 1];
  // When an estimate arrives he cheers: a ring bursts from his badge and his face lights up for a moment (not again for a chat restored after a refresh).
  const [burst, setBurst] = useState(0);
  const [cheering, setCheering] = useState(false);
  const cheered = useRef(last?.from === "leo" && last.mood === "celebrating" ? last.id : 0);
  useEffect(() => {
    const id = last?.from === "leo" && last.mood === "celebrating" ? last.id : 0;
    if (!id || id === cheered.current) return;
    cheered.current = id;
    setBurst(id);
    setCheering(true);
    const t = window.setTimeout(() => setCheering(false), 1800);
    return () => window.clearTimeout(t);
  }, [last]);
  const expect = last?.from === "leo" ? last.expect : undefined;
  const lastLeoId = [...msgs].reverse().find((m) => m.from === "leo")?.id;

  function say(label: string, reply: () => Reply) {
    if (busy || !label.trim()) return;
    setMsgs((m) => [...m, { id: ++idRef.current, from: "you", text: label }]);
    setBusy(true);
    timer.current = window.setTimeout(
      () => {
        setMsgs((m) => [...m, asMsg(reply())]);
        setBusy(false);
      },
      reducedMotion() ? 0 : 700
    );
  }

  const choose = (c: Chip) => say(c.label, () => go(c.go, ctxRef.current));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    say(t, () => understand(t, expect, ctxRef.current));
  };
  const restart = () => {
    window.clearTimeout(timer.current);
    setBusy(false);
    setMsgs([asMsg(go("start", ctxRef.current))]);
  };

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab") return;
    // keep Tab inside the window, like any dialog
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])") ?? []).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const [first, end] = [items[0], items[items.length - 1]];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      e.preventDefault();
      end.focus();
    } else if (!e.shiftKey && document.activeElement === end) {
      e.preventDefault();
      first.focus();
    }
  }

  // After a link inside an answer is followed, the window gets out of the way.
  const onListClick = (e: MouseEvent) => {
    const href = (e.target as HTMLElement).closest("a")?.getAttribute("href");
    if (href?.startsWith("/")) onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[57] bg-[#081430]/55 sm:hidden" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal={fit ? true : undefined}
        aria-label="Chat with Leo, Leocap's assistant"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={fit ? { height: fit.height, bottom: fit.bottom } : undefined}
        className="leo-panel fixed inset-x-0 bottom-0 z-[58] flex h-[88dvh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(8,20,48,0.35)] outline-none sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-48px))] sm:w-[392px] sm:rounded-3xl sm:shadow-[0_20px_60px_rgba(8,20,48,0.35)]"
      >
        <header className="relative flex items-center gap-3 bg-[#0F2C59] px-4 pb-3 pt-3.5">
          <LeoOrb mood={busy ? "thinking" : cheering ? "celebrating" : "hello"} size={48} state={busy ? "thinking" : "rest"} burst={burst} ring="soft" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold leading-tight text-white">Leo</p>
            <p className="truncate text-[13px] leading-tight text-blue-100">Leocap's assistant</p>
          </div>
          <button type="button" onClick={restart} aria-label="Start the conversation again" className="grid h-[44px] w-[44px] place-items-center rounded-full text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} aria-label="Close the chat" className="grid h-[44px] w-[44px] place-items-center rounded-full text-blue-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-red-600 to-amber-500" aria-hidden="true" />
        </header>

        <div ref={list} onClick={onListClick} role="log" aria-live="polite" aria-relevant="additions" className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-3.5 py-4 text-[15px] leading-relaxed text-slate-700">
          {msgs.map((m, i) =>
            m.from === "you" ? (
              <div key={m.id} className="leo-in flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0F2C59] px-4 py-2.5 text-white break-words">{m.text}</p>
              </div>
            ) : (
              <div key={m.id} ref={m.id === lastLeoId ? lastLeo : undefined} className="leo-in space-y-2">
                <div className="flex items-start gap-2">
                  <LeoAvatar mood={m.mood} size={32} className="mt-0.5" />
                  <div className="min-w-0 max-w-[calc(100%-40px)] flex-1 rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                    <Blocks blocks={m.blocks ?? []} faqs={faqs} />
                  </div>
                </div>
                {i === msgs.length - 1 && !busy && m.chips && m.chips.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-10">
                    {m.chips.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => choose(c)}
                        className="min-h-[44px] rounded-full border border-[#0F2C59]/30 bg-white px-4 text-[14px] font-semibold text-[#0F2C59] transition-[background-color,transform] hover:bg-[#0F2C59]/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          {busy && (
            <div className="leo-in flex items-start gap-2" role="status" aria-label="Leo is typing">
              <LeoAvatar mood="thinking" size={32} className="mt-0.5" />
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200" aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="leo-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="border-t border-slate-200 bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
              inputMode={expect ? "numeric" : "text"}
              enterKeyHint="send"
              autoComplete="off"
              aria-label={expect ? "Your basic monthly pay in KES" : "Type your question"}
              placeholder={expect ? "Basic monthly pay, e.g. 50000" : "Ask Leo anything…"}
              className="h-[48px] min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-[16px] text-slate-900 placeholder:text-slate-500 focus:border-[#0F2C59] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/25"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:bg-slate-300">
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="px-2 pt-2 text-center text-[12px] leading-snug text-slate-600">Leo is an automated guide. Figures are estimates: your application shows the exact amounts.</p>
        </form>
      </div>
    </>
  );
}
